import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import User, Business, Location, UserAssignment, Timesheet
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
    total_hours: float
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid start time format"
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid end time format"
        )

    diff = t_end - t_start
    total_seconds = diff.total_seconds()
    if total_seconds < 0:
        total_seconds += 24 * 3600
    hours = total_seconds / 3600.0
    net_hours = hours - (break_mins / 60.0)
    return max(0.0, net_hours)


def check_is_staff(user: User, business_id: str, session: Session) -> bool:
    if user.role == "staff":
        return True
    stmt = select(UserAssignment).where(
        UserAssignment.user_id == user.id,
        UserAssignment.business_id == business_id
    )
    assignments = session.exec(stmt).all()
    if assignments and all(a.role == "staff" for a in assignments):
        return True
    return False


@router.post("/api/businesses/{business_id}/timesheets", response_model=TimesheetOut, status_code=status.HTTP_201_CREATED)
def create_timesheet(
    business_id: str,
    data: TimesheetCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "timesheets.write", location_id=data.location_id, session=session)

    if check_is_staff(current_user, business_id, session):
        if data.staff_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff members can only submit timesheets for themselves"
            )

    loc = session.get(Location, data.location_id)
    if not loc or loc.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    total_h = calculate_timesheet_hours(data.start_time, data.end_time, data.unpaid_break)

    ts = Timesheet(
        business_id=business_id,
        location_id=data.location_id,
        staff_id=data.staff_id,
        work_date=data.work_date,
        start_time=data.start_time,
        end_time=data.end_time,
        unpaid_break=data.unpaid_break,
        notes=data.notes,
        total_hours=total_h
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
        total_hours=ts.total_hours,
        created_at=ts.created_at
    )


@router.get("/api/businesses/{business_id}/timesheets", response_model=List[TimesheetOut])
def get_timesheets(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "timesheets.read", session=session)

    stmt = select(Timesheet).where(Timesheet.business_id == business_id)
    if check_is_staff(current_user, business_id, session):
        stmt = stmt.where(Timesheet.staff_id == current_user.id)

    timesheets = session.exec(stmt).all()

    out = []
    for ts in timesheets:
        out.append(TimesheetOut(
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
            created_at=ts.created_at
        ))
    return out


@router.put("/api/businesses/{business_id}/timesheets/{timesheet_id}", response_model=TimesheetOut)
def update_timesheet(
    business_id: str,
    timesheet_id: str,
    data: TimesheetCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "timesheets.write", location_id=data.location_id, session=session)

    ts = session.get(Timesheet, timesheet_id)
    if not ts or ts.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    if check_is_staff(current_user, business_id, session):
        if ts.staff_id != current_user.id or data.staff_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff members can only edit their own timesheets"
            )

    loc = session.get(Location, data.location_id)
    if not loc or loc.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    total_h = calculate_timesheet_hours(data.start_time, data.end_time, data.unpaid_break)

    ts.location_id = data.location_id
    ts.staff_id = data.staff_id
    ts.work_date = data.work_date
    ts.start_time = data.start_time
    ts.end_time = data.end_time
    ts.unpaid_break = data.unpaid_break
    ts.notes = data.notes
    ts.total_hours = total_h
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
        total_hours=ts.total_hours,
        created_at=ts.created_at
    )


@router.delete("/api/businesses/{business_id}/timesheets/{timesheet_id}")
def delete_timesheet(
    business_id: str,
    timesheet_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "timesheets.write", session=session)

    ts = session.get(Timesheet, timesheet_id)
    if not ts or ts.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )

    if check_is_staff(current_user, business_id, session):
        if ts.staff_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff members can only delete their own timesheets"
            )

    session.delete(ts)
    session.commit()

    return {"message": "Timesheet deleted successfully"}
