from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel
from typing import List, Optional

from app.database import get_session
from app.models import User, TimesheetSettings, Business, UserAssignment
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Timesheet Settings"])


class TimesheetSettingsUpdate(SQLModel):
    require_approval: bool
    approval_roles: List[str]
    auto_approve_after_days: Optional[int]

    allow_past_entry: bool
    max_past_days: int
    lock_submitted: bool
    allow_staff_edit_pending: bool
    allow_managers_edit_approved: bool

    require_break_entry: bool
    default_break_minutes: int
    require_reason_no_break: bool

    show_overtime_warnings: bool
    weekly_hours_warning: int
    daily_hours_warning: int

    notify_manager_on_submission: bool
    notify_staff_on_approval: bool
    notify_staff_on_rejection: bool

    week_starts_on: str
    payroll_export_format: str
    lock_payroll_period_date: Optional[str]
    lock_timesheets_before_date: bool


def verify_timesheet_admin(user: User, business_id: str, session: Session):
    """
    Checks if current user has administrative rights for timesheet settings.
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
        detail="Only business owners, admins, or super admins can access timesheet settings.",
    )


@router.get(
    "/api/businesses/{business_id}/timesheet-settings", response_model=TimesheetSettings
)
def get_timesheet_settings(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_user_permission(
        current_user, business_id, "timesheets.read", session=session
    )

    stmt = select(TimesheetSettings).where(TimesheetSettings.business_id == business_id)
    settings = session.exec(stmt).first()
    if not settings:
        # Check if the owner has any other business with existing settings to clone from
        other_settings = None
        if current_user.role != "super_admin":
            stmt_other = (
                select(TimesheetSettings)
                .join(Business, Business.id == TimesheetSettings.business_id)
                .where(
                    (Business.created_by_id == current_user.id)
                    | (
                        Business.id.in_(
                            select(UserAssignment.business_id).where(
                                UserAssignment.user_id == current_user.id,
                                UserAssignment.role == "admin",
                                UserAssignment.is_active == True,
                            )
                        )
                    )
                )
                .where(TimesheetSettings.business_id != business_id)
            )
            other_settings = session.exec(stmt_other).first()

        if other_settings:
            settings = TimesheetSettings(
                business_id=business_id,
                require_approval=other_settings.require_approval,
                approval_roles=other_settings.approval_roles,
                auto_approve_after_days=other_settings.auto_approve_after_days,
                allow_past_entry=other_settings.allow_past_entry,
                max_past_days=other_settings.max_past_days,
                lock_submitted=other_settings.lock_submitted,
                allow_staff_edit_pending=other_settings.allow_staff_edit_pending,
                allow_managers_edit_approved=other_settings.allow_managers_edit_approved,
                require_break_entry=other_settings.require_break_entry,
                default_break_minutes=other_settings.default_break_minutes,
                require_reason_no_break=other_settings.require_reason_no_break,
                show_overtime_warnings=other_settings.show_overtime_warnings,
                weekly_hours_warning=other_settings.weekly_hours_warning,
                daily_hours_warning=other_settings.daily_hours_warning,
                notify_manager_on_submission=other_settings.notify_manager_on_submission,
                notify_staff_on_approval=other_settings.notify_staff_on_approval,
                notify_staff_on_rejection=other_settings.notify_staff_on_rejection,
                week_starts_on=other_settings.week_starts_on,
                payroll_export_format=other_settings.payroll_export_format,
                lock_payroll_period_date=other_settings.lock_payroll_period_date,
                lock_timesheets_before_date=other_settings.lock_timesheets_before_date,
            )
        else:
            settings = TimesheetSettings(
                business_id=business_id,
                require_approval=True,
                approval_roles=["Admin", "Manager"],
                auto_approve_after_days=None,
                allow_past_entry=True,
                max_past_days=1,
                lock_submitted=True,
                allow_staff_edit_pending=False,
                allow_managers_edit_approved=True,
                require_break_entry=True,
                default_break_minutes=30,
                require_reason_no_break=True,
                show_overtime_warnings=True,
                weekly_hours_warning=38,
                daily_hours_warning=10,
                notify_manager_on_submission=True,
                notify_staff_on_approval=True,
                notify_staff_on_rejection=True,
                week_starts_on="Monday",
                payroll_export_format="CSV",
                lock_payroll_period_date=None,
                lock_timesheets_before_date=True,
            )
        session.add(settings)
        session.commit()
        session.refresh(settings)

    return settings


@router.post(
    "/api/businesses/{business_id}/timesheet-settings", response_model=TimesheetSettings
)
def save_timesheet_settings(
    business_id: str,
    data: TimesheetSettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_timesheet_admin(current_user, business_id, session)

    # Find all businesses the current user owns or manages to keep settings synchronized
    if current_user.role == "super_admin":
        stmt_businesses = select(Business)
    else:
        stmt_businesses = select(Business).where(
            (Business.created_by_id == current_user.id)
            | (
                Business.id.in_(
                    select(UserAssignment.business_id).where(
                        UserAssignment.user_id == current_user.id,
                        UserAssignment.role == "admin",
                        UserAssignment.is_active == True,
                    )
                )
            )
        )
    businesses = session.exec(stmt_businesses).all()
    business_ids = [b.id for b in businesses]

    if business_id not in business_ids:
        business_ids.append(business_id)

    saved_settings = None
    for bid in business_ids:
        stmt = select(TimesheetSettings).where(TimesheetSettings.business_id == bid)
        settings = session.exec(stmt).first()
        if not settings:
            settings = TimesheetSettings(business_id=bid)

        # 1. Approval Workflow
        settings.require_approval = data.require_approval
        settings.approval_roles = data.approval_roles
        settings.auto_approve_after_days = data.auto_approve_after_days

        # 2. Timesheet Entry Rules
        settings.allow_past_entry = data.allow_past_entry
        settings.max_past_days = data.max_past_days
        settings.lock_submitted = data.lock_submitted
        settings.allow_staff_edit_pending = data.allow_staff_edit_pending
        settings.allow_managers_edit_approved = data.allow_managers_edit_approved

        # 3. Break Rules
        settings.require_break_entry = data.require_break_entry
        settings.default_break_minutes = data.default_break_minutes
        settings.require_reason_no_break = data.require_reason_no_break

        # 4. Overtime Rules
        settings.show_overtime_warnings = data.show_overtime_warnings
        settings.weekly_hours_warning = data.weekly_hours_warning
        settings.daily_hours_warning = data.daily_hours_warning

        # 5. Notifications
        settings.notify_manager_on_submission = data.notify_manager_on_submission
        settings.notify_staff_on_approval = data.notify_staff_on_approval
        settings.notify_staff_on_rejection = data.notify_staff_on_rejection

        # 6. Payroll Settings
        settings.week_starts_on = data.week_starts_on
        settings.payroll_export_format = data.payroll_export_format
        settings.lock_payroll_period_date = data.lock_payroll_period_date
        settings.lock_timesheets_before_date = data.lock_timesheets_before_date

        session.add(settings)
        if bid == business_id:
            saved_settings = settings

    session.commit()
    session.refresh(saved_settings)
    return saved_settings
