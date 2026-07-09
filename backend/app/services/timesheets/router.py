from datetime import datetime, date
from typing import List, Optional
from sqlmodel import Session, select, SQLModel, or_
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_session
from app.models import (
    User,
    Location,
    UserAssignment,
    Timesheet,
    Business,
    TimesheetSettings,
)
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Timesheets"])


class TimesheetCreate(SQLModel):
    location_id: str
    staff_id: str
    work_date: str
    start_time: str
    end_time: str
    unpaid_break: int = 0
    notes: Optional[str] = None
    project: Optional[str] = None
    status: Optional[str] = None


class TimesheetOut(SQLModel):
    id: str
    business_id: str
    location_id: str
    location_name: str
    staff_id: str
    staff_name: str
    work_date: str
    start_time: str
    end_time: str
    unpaid_break: int
    notes: Optional[str]
    project: Optional[str] = None
    total_hours: float
    status: str
    created_at: datetime


class TimesheetReportOut(SQLModel):
    id: str
    business_id: str
    business_name: str
    location_id: str
    location_name: str
    staff_id: str
    staff_name: str
    work_date: str
    start_time: str
    end_time: str
    unpaid_break: int
    notes: Optional[str] = None
    project: Optional[str] = None
    total_hours: float
    status: str
    created_at: datetime


def calculate_timesheet_hours(start: str, end: str, break_mins: int) -> float:
    t_start = None
    for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M", "%H:%M:%S"):
        try:
            t_start = datetime.strptime(start.strip(), fmt)
            break
        except ValueError:
            pass
    if not t_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid start time format"
        )

    t_end = None
    for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M", "%H:%M:%S"):
        try:
            t_end = datetime.strptime(end.strip(), fmt)
            break
        except ValueError:
            pass
    if not t_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid end time format"
        )

    diff = t_end - t_start
    total_seconds = diff.total_seconds()
    if total_seconds < 0:
        total_seconds += 24 * 3600
    hours = total_seconds / 3600.0

    is_day_off = (start.strip() in ("00:00", "00:00:00")) and (
        end.strip() in ("00:00", "00:00:00")
    )
    if not is_day_off:
        shift_mins = total_seconds / 60.0
        if break_mins >= shift_mins:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unpaid break must be less than the total shift duration.",
            )
        if break_mins >= 360:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unpaid break must be less than 6 hours.",
            )

    net_hours = hours - (break_mins / 60.0)
    return max(0.0, net_hours)


def check_is_staff(user: User, business_id: str, session: Session) -> bool:
    if user.role == "staff":
        return True
    stmt = select(UserAssignment).where(
        UserAssignment.user_id == user.id, UserAssignment.business_id == business_id
    )
    assignments = session.exec(stmt).all()
    if assignments and all(a.role == "staff" for a in assignments):
        return True
    return False


def enforce_auto_approve(
    business_id: str, session: Session, settings: Optional[TimesheetSettings]
):
    if not settings or settings.auto_approve_after_days is None:
        return
    stmt_pending = select(Timesheet).where(
        Timesheet.business_id == business_id,
        Timesheet.status.in_(["submitted", "edited"]),
    )
    pending_ts = session.exec(stmt_pending).all()
    now = datetime.utcnow()
    modified = False
    for pts in pending_ts:
        delta = now - pts.created_at
        if delta.days >= settings.auto_approve_after_days:
            pts.status = "approved"
            pts.updated_at = now
            session.add(pts)
            modified = True
    if modified:
        session.commit()


@router.post(
    "/api/businesses/{business_id}/timesheets",
    response_model=TimesheetOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new timesheet",
    description="Creates a new timesheet entry.",
    responses={
        201: {"description": "Timesheet created successfully."},
        400: {"description": "Invalid request data."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Not authorized to create timesheet."},
    },
)
def create_timesheet(
    business_id: str,
    data: TimesheetCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_user_permission(
        current_user,
        business_id,
        "timesheets.write",
        location_id=data.location_id,
        session=session,
    )

    # Retrieve settings
    stmt_settings = select(TimesheetSettings).where(
        TimesheetSettings.business_id == business_id
    )
    settings = session.exec(stmt_settings).first()

    require_approval = True
    allow_past_entry = True
    max_past_days = 1
    lock_timesheets_before_date = False
    lock_payroll_period_date = None

    if settings:
        require_approval = settings.require_approval
        allow_past_entry = settings.allow_past_entry
        max_past_days = settings.max_past_days
        lock_timesheets_before_date = settings.lock_timesheets_before_date
        lock_payroll_period_date = settings.lock_payroll_period_date

    # 1. Payroll period lock check (all users)
    if lock_timesheets_before_date and lock_payroll_period_date:
        try:
            lock_dt = datetime.strptime(lock_payroll_period_date, "%Y-%m-%d").date()
            work_dt = datetime.strptime(data.work_date, "%Y-%m-%d").date()
            if work_dt <= lock_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This date falls within a locked payroll period.",
                )
        except ValueError:
            pass

    is_staff_user = check_is_staff(current_user, business_id, session)
    if is_staff_user:
        if data.staff_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff members can only submit timesheets for themselves",
            )
        # 2. Past entry restrictions for staff
        try:
            work_dt = datetime.strptime(data.work_date, "%Y-%m-%d").date()
            today_dt = datetime.utcnow().date()
            if work_dt < today_dt:
                if not allow_past_entry:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Past timesheet entries are disabled for staff.",
                    )
                else:
                    delta_days = (today_dt - work_dt).days
                    if delta_days > max_past_days:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Cannot submit timesheets older than {max_past_days} days.",
                        )
        except ValueError:
            pass

    loc = session.get(Location, data.location_id)
    if not loc or loc.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )

    total_h = calculate_timesheet_hours(
        data.start_time, data.end_time, data.unpaid_break
    )

    status_val = data.status or "submitted"
    if not require_approval:
        status_val = "approved"

    ts = Timesheet(
        business_id=business_id,
        location_id=data.location_id,
        staff_id=data.staff_id,
        work_date=data.work_date,
        start_time=data.start_time,
        end_time=data.end_time,
        unpaid_break=data.unpaid_break,
        notes=data.notes,
        project=data.project,
        total_hours=total_h,
        status=status_val,
    )

    session.add(ts)
    session.commit()
    session.refresh(ts)

    return TimesheetOut(
        id=ts.id,
        business_id=ts.business_id,
        location_id=ts.location_id,
        location_name=loc.name,
        staff_id=ts.staff_id,
        staff_name=ts.staff.name if ts.staff else "Unknown Staff",
        work_date=ts.work_date,
        start_time=ts.start_time,
        end_time=ts.end_time,
        unpaid_break=ts.unpaid_break,
        notes=ts.notes,
        project=ts.project,
        total_hours=ts.total_hours,
        status=ts.status,
        created_at=ts.created_at,
    )


@router.get(
    "/api/businesses/{business_id}/timesheets",
    response_model=List[TimesheetOut],
    summary="Get all timesheets",
    description="Retrieves a list of all timesheet entries for a specific business.",
    responses={
        200: {"description": "List of timesheets successfully retrieved."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Not authorized to access timesheets."},
        404: {"description": "Business not found."},
    },
)
def get_timesheets(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if business_id == "all":
        if current_user.role == "super_admin":
            stmt = select(Business)
            businesses = session.exec(stmt).all()
            allowed_business_ids = [b.id for b in businesses]
        else:
            stmt = select(Business).where(
                (Business.created_by_id == current_user.id)
                | (
                    Business.id.in_(
                        select(UserAssignment.business_id).where(
                            UserAssignment.user_id == current_user.id,
                            UserAssignment.is_active,
                        )
                    )
                )
            )
            businesses = session.exec(stmt).all()
            allowed_business_ids = [b.id for b in businesses]

        for bid in allowed_business_ids:
            stmt_settings = select(TimesheetSettings).where(
                TimesheetSettings.business_id == bid
            )
            settings = session.exec(stmt_settings).first()
            enforce_auto_approve(bid, session, settings)
    else:
        verify_user_permission(
            current_user, business_id, "timesheets.read", session=session
        )
        allowed_business_ids = [business_id]

        stmt_settings = select(TimesheetSettings).where(
            TimesheetSettings.business_id == business_id
        )
        settings = session.exec(stmt_settings).first()
        enforce_auto_approve(business_id, session, settings)

    staff_business_ids = []
    manager_business_ids = []
    for bid in allowed_business_ids:
        if check_is_staff(current_user, bid, session):
            staff_business_ids.append(bid)
        else:
            manager_business_ids.append(bid)

    conditions = []
    if manager_business_ids:
        conditions.append(Timesheet.business_id.in_(manager_business_ids))
    if staff_business_ids:
        conditions.append(
            (Timesheet.business_id.in_(staff_business_ids))
            & (Timesheet.staff_id == current_user.id)
        )

    if not conditions:
        return []

    stmt = select(Timesheet).where(or_(*conditions))
    timesheets = session.exec(stmt).all()

    out = []
    for ts in timesheets:
        out.append(
            TimesheetOut(
                id=ts.id,
                business_id=ts.business_id,
                location_id=ts.location_id,
                location_name=ts.location.name if ts.location else "Unknown Location",
                staff_id=ts.staff_id,
                staff_name=ts.staff.name if ts.staff else "Unknown Staff",
                work_date=ts.work_date,
                start_time=ts.start_time,
                end_time=ts.end_time,
                unpaid_break=ts.unpaid_break,
                notes=ts.notes,
                project=ts.project,
                total_hours=ts.total_hours,
                status=ts.status,
                created_at=ts.created_at,
            )
        )
    return out


@router.put(
    "/api/businesses/{business_id}/timesheets/{timesheet_id}",
    response_model=TimesheetOut,
    summary="Update a timesheet",
    description="Updates an existing timesheet entry.",
    responses={
        200: {"description": "Timesheet updated successfully."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Not authorized to update timesheet."},
        404: {"description": "Timesheet not found."},
    },
)
def update_timesheet(
    business_id: str,
    timesheet_id: str,
    data: TimesheetCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_user_permission(
        current_user,
        business_id,
        "timesheets.write",
        location_id=data.location_id,
        session=session,
    )

    ts = session.get(Timesheet, timesheet_id)
    if not ts or ts.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found"
        )

    # Retrieve settings
    stmt_settings = select(TimesheetSettings).where(
        TimesheetSettings.business_id == business_id
    )
    settings = session.exec(stmt_settings).first()

    require_approval = True
    allow_past_entry = True
    max_past_days = 1
    lock_submitted = True
    allow_staff_edit_pending = False
    allow_managers_edit_approved = True
    lock_timesheets_before_date = False
    lock_payroll_period_date = None

    if settings:
        require_approval = settings.require_approval
        allow_past_entry = settings.allow_past_entry
        max_past_days = settings.max_past_days
        lock_submitted = settings.lock_submitted
        allow_staff_edit_pending = settings.allow_staff_edit_pending
        allow_managers_edit_approved = settings.allow_managers_edit_approved
        lock_timesheets_before_date = settings.lock_timesheets_before_date
        lock_payroll_period_date = settings.lock_payroll_period_date

    # 1. Payroll period lock check (all users - updates existing date as well as target new date)
    if lock_timesheets_before_date and lock_payroll_period_date:
        try:
            lock_dt = datetime.strptime(lock_payroll_period_date, "%Y-%m-%d").date()
            existing_dt = datetime.strptime(ts.work_date, "%Y-%m-%d").date()
            new_dt = datetime.strptime(data.work_date, "%Y-%m-%d").date()
            if existing_dt <= lock_dt or new_dt <= lock_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot edit timesheets in a locked payroll period.",
                )
        except ValueError:
            pass

    is_staff_user = check_is_staff(current_user, business_id, session)
    if is_staff_user:
        if ts.staff_id != current_user.id or data.staff_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff members can only edit their own timesheets",
            )
        # 2. Check pending/approval edit lock for staff
        if ts.status in ("submitted", "edited"):
            if lock_submitted or not allow_staff_edit_pending:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Pending timesheets are locked and cannot be edited by staff.",
                )
        elif ts.status == "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Approved timesheets cannot be edited by staff.",
            )
        # 3. Check past entry restrictions for staff
        try:
            work_dt = datetime.strptime(data.work_date, "%Y-%m-%d").date()
            today_dt = datetime.utcnow().date()
            if work_dt < today_dt:
                if not allow_past_entry:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Past timesheet entries are disabled for staff.",
                    )
                else:
                    delta_days = (today_dt - work_dt).days
                    if delta_days > max_past_days:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Cannot edit timesheets older than {max_past_days} days.",
                        )
        except ValueError:
            pass
    else:
        # Manager/Admin check: editing approved timesheets
        if ts.status == "approved" and not allow_managers_edit_approved:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers are not allowed to edit approved timesheets.",
            )

    loc = session.get(Location, data.location_id)
    if not loc or loc.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )

    total_h = calculate_timesheet_hours(
        data.start_time, data.end_time, data.unpaid_break
    )

    ts.location_id = data.location_id
    ts.staff_id = data.staff_id
    ts.work_date = data.work_date
    ts.start_time = data.start_time
    ts.end_time = data.end_time
    ts.unpaid_break = data.unpaid_break
    ts.notes = data.notes
    ts.project = data.project
    ts.total_hours = total_h

    status_val = data.status or "edited"
    if not require_approval:
        status_val = "approved"
    ts.status = status_val
    ts.updated_at = datetime.utcnow()

    session.add(ts)
    session.commit()
    session.refresh(ts)

    return TimesheetOut(
        id=ts.id,
        business_id=ts.business_id,
        location_id=ts.location_id,
        location_name=loc.name,
        staff_id=ts.staff_id,
        staff_name=ts.staff.name if ts.staff else "Unknown Staff",
        work_date=ts.work_date,
        start_time=ts.start_time,
        end_time=ts.end_time,
        unpaid_break=ts.unpaid_break,
        notes=ts.notes,
        project=ts.project,
        total_hours=ts.total_hours,
        status=ts.status,
        created_at=ts.created_at,
    )


@router.delete(
    "/api/businesses/{business_id}/timesheets/{timesheet_id}",
    summary="Delete a timesheet",
    description="Deletes a specific timesheet entry.",
    responses={
        200: {"description": "Timesheet deleted successfully."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Not authorized to delete timesheet."},
        404: {"description": "Timesheet not found."},
    },
)
def delete_timesheet(
    business_id: str,
    timesheet_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_user_permission(
        current_user, business_id, "timesheets.write", session=session
    )

    ts = session.get(Timesheet, timesheet_id)
    if not ts or ts.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found"
        )

    # Retrieve settings
    stmt_settings = select(TimesheetSettings).where(
        TimesheetSettings.business_id == business_id
    )
    settings = session.exec(stmt_settings).first()

    lock_submitted = True
    allow_staff_edit_pending = False
    lock_timesheets_before_date = False
    lock_payroll_period_date = None

    if settings:
        lock_submitted = settings.lock_submitted
        allow_staff_edit_pending = settings.allow_staff_edit_pending
        lock_timesheets_before_date = settings.lock_timesheets_before_date
        lock_payroll_period_date = settings.lock_payroll_period_date

    # 1. Payroll period lock check (all users)
    if lock_timesheets_before_date and lock_payroll_period_date:
        try:
            lock_dt = datetime.strptime(lock_payroll_period_date, "%Y-%m-%d").date()
            work_dt = datetime.strptime(ts.work_date, "%Y-%m-%d").date()
            if work_dt <= lock_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete timesheets in a locked payroll period.",
                )
        except ValueError:
            pass

    if check_is_staff(current_user, business_id, session):
        if ts.staff_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff members can only delete their own timesheets",
            )
        # 2. Check pending/approval delete lock for staff
        if ts.status in ("submitted", "edited"):
            if lock_submitted or not allow_staff_edit_pending:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Pending timesheets are locked and cannot be deleted by staff.",
                )
        elif ts.status == "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Approved timesheets cannot be deleted by staff.",
            )

    session.delete(ts)
    session.commit()

    return {"message": "Timesheet deleted successfully"}


class TimesheetStatusUpdate(SQLModel):
    status: str


@router.patch(
    "/api/businesses/{business_id}/timesheets/{timesheet_id}/status",
    response_model=TimesheetOut,
    summary="Update timesheet status",
    description="Updates the status of a timesheet (submitted, approved, rejected, edited).",
    responses={
        200: {"description": "Timesheet status updated successfully."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Not authorized to update timesheet status."},
        404: {"description": "Timesheet not found."},
    },
)
def update_timesheet_status(
    business_id: str,
    timesheet_id: str,
    data: TimesheetStatusUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_user_permission(
        current_user, business_id, "timesheets.write", session=session
    )

    if check_is_staff(current_user, business_id, session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff members cannot change timesheet status",
        )

    ts = session.get(Timesheet, timesheet_id)
    if not ts or ts.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found"
        )

    # Validate payroll lock
    stmt_settings = select(TimesheetSettings).where(
        TimesheetSettings.business_id == business_id
    )
    settings = session.exec(stmt_settings).first()
    if (
        settings
        and settings.lock_timesheets_before_date
        and settings.lock_payroll_period_date
    ):
        try:
            lock_dt = datetime.strptime(
                settings.lock_payroll_period_date, "%Y-%m-%d"
            ).date()
            work_dt = datetime.strptime(ts.work_date, "%Y-%m-%d").date()
            if work_dt <= lock_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change status of a timesheet in a locked payroll period.",
                )
        except ValueError:
            pass

    if data.status not in ("submitted", "approved", "rejected", "edited"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status"
        )

    ts.status = data.status
    ts.updated_at = datetime.utcnow()

    session.add(ts)
    session.commit()
    session.refresh(ts)

    return TimesheetOut(
        id=ts.id,
        business_id=ts.business_id,
        location_id=ts.location_id,
        location_name=ts.location.name if ts.location else "Unknown Location",
        staff_id=ts.staff_id,
        staff_name=ts.staff.name if ts.staff else "Unknown Staff",
        work_date=ts.work_date,
        start_time=ts.start_time,
        end_time=ts.end_time,
        unpaid_break=ts.unpaid_break,
        notes=ts.notes,
        total_hours=ts.total_hours,
        status=ts.status,
        created_at=ts.created_at,
    )


@router.get(
    "/api/businesses/{business_id}/timesheets/reports",
    response_model=List[TimesheetReportOut],
    summary="Get timesheet reports",
    description="Retrieves a list of filtered timesheet reports for payroll and analysis.",
    responses={
        200: {"description": "List of timesheet reports successfully retrieved."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Not authorized to access this business or timesheets."},
        404: {"description": "Business not found."},
    },
)
def get_timesheet_reports(
    business_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if business_id == "all":
        if current_user.role == "super_admin":
            stmt = select(Business)
            businesses = session.exec(stmt).all()
            allowed_business_ids = [b.id for b in businesses]
        else:
            stmt = select(Business).where(
                (Business.created_by_id == current_user.id)
                | (
                    Business.id.in_(
                        select(UserAssignment.business_id).where(
                            UserAssignment.user_id == current_user.id,
                            UserAssignment.is_active == True,
                        )
                    )
                )
            )
            businesses = session.exec(stmt).all()
            allowed_business_ids = [b.id for b in businesses]
    else:
        verify_user_permission(
            current_user, business_id, "timesheets.read", session=session
        )
        allowed_business_ids = [business_id]

    staff_business_ids = []
    manager_business_ids = []
    for bid in allowed_business_ids:
        if check_is_staff(current_user, bid, session):
            staff_business_ids.append(bid)
        else:
            manager_business_ids.append(bid)

    conditions = []
    if manager_business_ids:
        conditions.append(Timesheet.business_id.in_(manager_business_ids))
    if staff_business_ids:
        conditions.append(
            (Timesheet.business_id.in_(staff_business_ids))
            & (Timesheet.staff_id == current_user.id)
        )

    if not conditions:
        return []

    stmt = select(Timesheet).where(or_(*conditions))

    if start_date:
        stmt = stmt.where(Timesheet.work_date >= start_date)
    if end_date:
        stmt = stmt.where(Timesheet.work_date <= end_date)
    if location_id and location_id != "all":
        stmt = stmt.where(Timesheet.location_id == location_id)
    if staff_id and staff_id != "all":
        stmt = stmt.where(Timesheet.staff_id == staff_id)
    if status and status != "all":
        stmt = stmt.where(Timesheet.status == status)

    timesheets = session.exec(stmt).all()

    out = []
    for ts in timesheets:
        out.append(
            TimesheetReportOut(
                id=ts.id,
                business_id=ts.business_id,
                business_name=ts.business.name if ts.business else "Unknown Business",
                location_id=ts.location_id,
                location_name=ts.location.name if ts.location else "Unknown Location",
                staff_id=ts.staff_id,
                staff_name=ts.staff.name if ts.staff else "Unknown Staff",
                work_date=ts.work_date,
                start_time=ts.start_time,
                end_time=ts.end_time,
                unpaid_break=ts.unpaid_break,
                notes=ts.notes,
                project=ts.project,
                total_hours=ts.total_hours,
                status=ts.status,
                created_at=ts.created_at,
            )
        )
    return out
