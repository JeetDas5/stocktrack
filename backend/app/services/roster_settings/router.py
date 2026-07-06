from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel
from typing import List

from app.database import get_session
from app.models import User, RosterSettings, Business, UserAssignment
from app.services.auth.dependencies import get_current_user

router = APIRouter(tags=["Roster Settings"])


class RosterSettingsUpdate(SQLModel):
    roster_period: str
    availability_deadline_day: str
    availability_deadline_time: str
    default_shift_types: List[dict]
    required_roles: List[dict]
    default_priority: int
    allow_admin_override: bool
    notify_staff_approved: bool
    positions: List[str]


def verify_roster_admin(user: User, business_id: str, session: Session):
    """
    Checks if current user has administrative rights for roster settings.
    Must be super_admin, the business owner, or have an admin assignment.
    """
    if user.role == "super_admin":
        return True

    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Business not found"
        )

    if business.created_by_id == user.id:
        return True

    assignment = session.exec(
        select(UserAssignment).where(
            UserAssignment.user_id == user.id,
            UserAssignment.business_id == business_id,
            UserAssignment.role == "admin",
            UserAssignment.is_active,
        )
    ).first()

    if assignment:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only business owners, admins, or super admins can access roster settings.",
    )


@router.get(
    "/api/businesses/{business_id}/roster-settings", response_model=RosterSettings
)
def get_roster_settings(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_roster_admin(current_user, business_id, session)

    stmt = select(RosterSettings).where(RosterSettings.business_id == business_id)
    settings = session.exec(stmt).first()
    if not settings:
        default_shift_types = [
            {"name": "Morning Shift", "hours": 6.0, "color": "#FFB020"},
            {"name": "Afternoon Shift", "hours": 6.0, "color": "#1976D2"},
            {"name": "Evening Shift", "hours": 6.0, "color": "#7B61FF"},
            {"name": "Opening Shift", "hours": 5.0, "color": "#2E7D32"},
            {"name": "Closing Shift", "hours": 5.0, "color": "#E53935"},
        ]
        default_required_roles = [
            {
                "shift_type": "Morning Shift",
                "roles": [
                    {"role": "Barista", "min_count": 1},
                    {"role": "Kitchen Hand", "min_count": 1},
                ],
            },
            {
                "shift_type": "Afternoon Shift",
                "roles": [
                    {"role": "Barista", "min_count": 1},
                    {"role": "Kitchen Hand", "min_count": 1},
                ],
            },
            {
                "shift_type": "Evening Shift",
                "roles": [
                    {"role": "Chef", "min_count": 1},
                    {"role": "Kitchen Hand", "min_count": 1},
                ],
            },
            {
                "shift_type": "Opening Shift",
                "roles": [{"role": "Barista", "min_count": 1}],
            },
            {
                "shift_type": "Closing Shift",
                "roles": [
                    {"role": "Barista", "min_count": 1},
                    {"role": "Kitchen Hand", "min_count": 1},
                ],
            },
        ]
        default_positions = ["Barista", "Kitchen Hand", "Chef"]

        settings = RosterSettings(
            business_id=business_id,
            roster_period="Weekly",
            availability_deadline_day="Sunday",
            availability_deadline_time="06:00 PM",
            default_shift_types=default_shift_types,
            required_roles=default_required_roles,
            default_priority=5,
            allow_admin_override=True,
            notify_staff_approved=True,
            positions=default_positions,
        )
        session.add(settings)
        session.commit()
        session.refresh(settings)

    return settings


@router.post(
    "/api/businesses/{business_id}/roster-settings", response_model=RosterSettings
)
def save_roster_settings(
    business_id: str,
    data: RosterSettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_roster_admin(current_user, business_id, session)

    if data.positions:
        seen_positions = set()
        for pos in data.positions:
            if not pos:
                continue
            clean_pos = pos.strip().lower()
            if clean_pos in seen_positions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This position already exists."
                )
            seen_positions.add(clean_pos)

    stmt = select(RosterSettings).where(RosterSettings.business_id == business_id)
    settings = session.exec(stmt).first()
    if not settings:
        settings = RosterSettings(business_id=business_id)

    settings.roster_period = data.roster_period
    settings.availability_deadline_day = data.availability_deadline_day
    settings.availability_deadline_time = data.availability_deadline_time
    settings.default_shift_types = data.default_shift_types
    settings.required_roles = data.required_roles
    settings.default_priority = data.default_priority
    settings.allow_admin_override = data.allow_admin_override
    settings.notify_staff_approved = data.notify_staff_approved
    settings.positions = data.positions

    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings
