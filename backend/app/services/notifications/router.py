import os
import json
from typing import Optional
from datetime import datetime
from sqlmodel import Session, select, SQLModel
from fastapi import APIRouter, Depends, HTTPException, Request

from app.database import get_session

from app.models import UserAssignment
from app.models import (
    User,
    Timesheet,
    PushSubscription,
    NotificationPreference,
    NotificationLog,
)
from app.services.auth.dependencies import get_current_user
from app.services.notifications.vapid import get_or_create_vapid_keys

try:
    from pywebpush import webpush

    PYWEBPUSH_AVAILABLE = True
except ImportError:
    PYWEBPUSH_AVAILABLE = False

router = APIRouter(tags=["Notifications"])

VAPID_CLAIMS = {"sub": os.getenv("VAPID_SUBJECT", "mailto:support@nexbrix.com")}


class SubscriptionPayload(SQLModel):
    endpoint: str
    keys: dict
    user_agent: Optional[str] = None


class PreferencePayload(SQLModel):
    timesheet_reminder_enabled: Optional[bool] = True
    reminder_time: Optional[str] = "17:00"
    timezone: Optional[str] = "UTC"


@router.get("/api/notifications/vapid-public-key")
def get_vapid_public_key():
    pub_key, _ = get_or_create_vapid_keys()
    return {
        "publicKey": pub_key,
        "pywebpush_installed": PYWEBPUSH_AVAILABLE,
    }


@router.get("/api/notifications/preferences")
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    pref = session.exec(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id
        )
    ).first()

    if not pref:
        pref = NotificationPreference(
            user_id=current_user.id,
            timesheet_reminder_enabled=True,
            reminder_time="17:00",
            timezone="UTC",
        )
        session.add(pref)
        session.commit()
        session.refresh(pref)

    return pref


@router.put("/api/notifications/preferences")
def update_notification_preferences(
    payload: PreferencePayload,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    pref = session.exec(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id
        )
    ).first()

    if not pref:
        pref = NotificationPreference(user_id=current_user.id)

    if payload.timesheet_reminder_enabled is not None:
        pref.timesheet_reminder_enabled = payload.timesheet_reminder_enabled
    if payload.reminder_time:
        pref.reminder_time = payload.reminder_time
    if payload.timezone:
        pref.timezone = payload.timezone

    pref.updated_at = datetime.utcnow()
    session.add(pref)
    session.commit()
    session.refresh(pref)
    return pref


@router.post("/api/notifications/subscribe")
def subscribe_push(
    payload: SubscriptionPayload,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    p256dh = payload.keys.get("p256dh")
    auth = payload.keys.get("auth")

    if not p256dh or not auth or not payload.endpoint:
        raise HTTPException(status_code=400, detail="Invalid push subscription keys")

    user_agent = payload.user_agent or request.headers.get("user-agent", "")

    existing = session.exec(
        select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
    ).first()

    if existing:
        existing.user_id = current_user.id
        existing.p256dh = p256dh
        existing.auth = auth
        existing.user_agent = user_agent
        existing.is_active = True
        existing.updated_at = datetime.utcnow()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        sub = existing
    else:
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=payload.endpoint,
            p256dh=p256dh,
            auth=auth,
            user_agent=user_agent,
            is_active=True,
        )
        session.add(sub)
        session.commit()
        session.refresh(sub)

    return {"status": "subscribed", "id": sub.id}


@router.post("/api/notifications/unsubscribe")
def unsubscribe_push(
    payload: SubscriptionPayload,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    existing = session.exec(
        select(PushSubscription).where(
            PushSubscription.endpoint == payload.endpoint,
            PushSubscription.user_id == current_user.id,
        )
    ).first()

    if existing:
        existing.is_active = False
        existing.updated_at = datetime.utcnow()
        session.add(existing)
        session.commit()

    return {"status": "unsubscribed"}


def _send_web_push(subscription: PushSubscription, data: dict) -> bool:
    """Helper function to execute web push delivery via pywebpush."""
    if not PYWEBPUSH_AVAILABLE:
        print(f"[Push Sim] Sent push to endpoint {subscription.endpoint}: {data}")
        return True

    _, priv_key = get_or_create_vapid_keys()

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=json.dumps(data),
            vapid_private_key=priv_key,
            vapid_claims=VAPID_CLAIMS,
        )
        return True
    except Exception as e:
        print(f"[Push Failure] Endpoint {subscription.endpoint}: {e}")
        # If subscription is expired/revoked (e.g. 410 Gone, 404 Not Found)
        if "410" in str(e) or "404" in str(e):
            return False
        return False


@router.post("/api/notifications/test-push")
def send_test_push(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    subscriptions = session.exec(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id, PushSubscription.is_active
        )
    ).all()

    if not subscriptions:
        raise HTTPException(
            status_code=404, detail="No active push subscriptions found for user"
        )

    payload = {
        "title": "Timesheet Reminder Test",
        "body": "This is a test notification from NexBrix!",
        "icon": "/icons/icon-192x192.png",
        "url": "/timesheets",
    }

    sent_count = 0
    for sub in subscriptions:
        success = _send_web_push(sub, payload)
        if not success:
            sub.is_active = False
            session.add(sub)
        else:
            sent_count += 1

    session.commit()

    return {
        "status": "success",
        "sent_count": sent_count,
        "total_subscriptions": len(subscriptions),
    }


@router.post("/api/notifications/trigger-timesheet-reminders")
def trigger_timesheet_reminders(session: Session = Depends(get_session)):
    """
    Cron / Scheduler Endpoint to check staff who need to submit timesheets today.
    """
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    # 1. Fetch active preferences with timesheet_reminder_enabled == True
    preferences = session.exec(
        select(NotificationPreference).where(
            NotificationPreference.timesheet_reminder_enabled
        )
    ).all()

    triggered_users = []

    for pref in preferences:
        user_id = pref.user_id

        # 2. Check if timesheet already submitted today
        existing_ts = session.exec(
            select(Timesheet).where(
                Timesheet.staff_id == user_id, Timesheet.work_date == today_str
            )
        ).first()

        if existing_ts:
            continue  # Already submitted

        # 3. Check if already notified today to prevent spam
        already_notified = session.exec(
            select(NotificationLog).where(
                NotificationLog.user_id == user_id,
                NotificationLog.notification_type == "TIMESHEET_REMINDER",
                NotificationLog.sent_at
                >= datetime.utcnow().replace(hour=0, minute=0, second=0),
            )
        ).first()

        if already_notified:
            continue

        # 4. Fetch active subscriptions for user
        subs = session.exec(
            select(PushSubscription).where(
                PushSubscription.user_id == user_id, PushSubscription.is_active
            )
        ).all()

        if not subs:
            continue

        notification_data = {
            "title": "Timesheet Reminder",
            "body": "Don't forget to submit your timesheet for today!",
            "icon": "/icons/icon-192x192.png",
            "url": "/timesheets",
        }

        sent = 0
        for sub in subs:
            if _send_web_push(sub, notification_data):
                sent += 1
            else:
                sub.is_active = False
                session.add(sub)

        # Log notification attempt
        log = NotificationLog(
            user_id=user_id,
            notification_type="TIMESHEET_REMINDER",
            status="sent" if sent > 0 else "failed",
            details=f"Sent to {sent} active devices",
        )
        session.add(log)
        triggered_users.append(user_id)

    session.commit()


class BroadcastPayload(SQLModel):
    title: str
    body: str
    url: Optional[str] = "/timesheets"
    business_id: Optional[str] = None


@router.post("/api/notifications/broadcast")
def broadcast_notification(
    payload: BroadcastPayload,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Owner/Manager endpoint to send custom push notifications to staff.
    """
    if not payload.title or not payload.body:
        raise HTTPException(status_code=400, detail="Title and body are required")

    # Fetch user ids to target
    target_user_ids = []

    if payload.business_id:
        # Get users assigned to this business
        assignments = session.exec(
            select(UserAssignment).where(
                UserAssignment.business_id == payload.business_id
            )
        ).all()
        target_user_ids = [a.user_id for a in assignments]
    else:
        # Target all active users with subscriptions
        all_users = session.exec(select(User.id)).all()
        target_user_ids = list(all_users)

    if not target_user_ids:
        return {
            "status": "success",
            "sent_count": 0,
            "message": "No target users found",
        }

    # Fetch active subscriptions for target users
    subscriptions = session.exec(
        select(PushSubscription).where(
            PushSubscription.user_id.in_(target_user_ids), PushSubscription.is_active
        )
    ).all()

    if not subscriptions:
        return {
            "status": "success",
            "sent_count": 0,
            "message": "No active subscriptions found for staff",
        }

    push_data = {
        "title": payload.title,
        "body": payload.body,
        "icon": "/homescreen/android-chrome-192x192.png",
        "url": payload.url or "/timesheets",
    }

    sent_count = 0
    for sub in subscriptions:
        success = _send_web_push(sub, push_data)
        if success:
            sent_count += 1
        else:
            sub.is_active = False
            session.add(sub)

        # Log entry
        log = NotificationLog(
            user_id=sub.user_id,
            notification_type="OWNER_BROADCAST",
            status="sent" if success else "failed",
            details=f"Title: {payload.title}",
        )
        session.add(log)

    session.commit()

    return {
        "status": "success",
        "sent_count": sent_count,
        "total_subscriptions": len(subscriptions),
        "target_users_count": len(set(sub.user_id for sub in subscriptions)),
    }
