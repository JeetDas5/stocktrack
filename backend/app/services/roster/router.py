from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel, or_

from app.database import get_session
from app.models import User, Business, Location, UserAssignment, RosterShift, StaffAvailability, Timesheet
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Roster Builder"])


class LocationOut(SQLModel):
    id: str
    name: str


class UserOut(SQLModel):
    id: str
    name: Optional[str] = None
    email: str
    role: str
    priority: int = 5
    position: Optional[str] = None
    max_working_hours: Optional[float] = None


class RosterShiftOut(SQLModel):
    id: str
    business_id: str
    location_id: str
    user_id: Optional[str] = None
    date: str
    shift_name: str
    time_from: str
    time_to: str
    required_count: int
    status: str
    created_at: datetime
    updated_at: datetime
    user: Optional[UserOut] = None
    location: Optional[LocationOut] = None


class RosterShiftCreate(SQLModel):
    id: Optional[str] = None
    location_id: str
    user_id: Optional[str] = None
    date: str
    shift_name: str
    time_from: str
    time_to: str
    required_count: int = 2
    status: str = "draft"


class RosterBulkSaveInput(SQLModel):
    start_date: str
    end_date: str
    shifts: List[RosterShiftCreate]


class RosterCopyInput(SQLModel):
    src_start_date: str
    target_start_date: str


class RosterPublishInput(SQLModel):
    start_date: str
    end_date: str


class AutoBuildInput(SQLModel):
    start_date: str
    end_date: str


@router.get("/api/businesses/{business_id}/rosters", response_model=List[RosterShiftOut])
def get_roster_shifts(
    business_id: str,
    start_date: str,
    end_date: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "rosters.read", session=session)

    stmt = select(RosterShift).where(
        RosterShift.business_id == business_id,
        RosterShift.date >= start_date,
        RosterShift.date <= end_date
    )
    shifts = session.exec(stmt).all()

    # Get staff priorities and assignments to populate UserOut properties
    assignments_stmt = select(UserAssignment).where(
        UserAssignment.business_id == business_id
    )
    assignments = session.exec(assignments_stmt).all()
    user_assignments = {a.user_id: a for a in assignments if a.user_id}

    out = []
    for s in shifts:
        user_out = None
        if s.user_id and s.user:
            ass = user_assignments.get(s.user_id)
            user_out = UserOut(
                id=s.user.id,
                name=s.user.name,
                email=s.user.email,
                role=s.user.role,
                priority=ass.priority if ass else 5,
                position=ass.position if ass else None,
                max_working_hours=ass.max_working_hours if ass else None
            )

        loc_out = None
        if s.location:
            loc_out = LocationOut(id=s.location.id, name=s.location.name)

        out.append(RosterShiftOut(
            id=s.id,
            business_id=s.business_id,
            location_id=s.location_id,
            user_id=s.user_id,
            date=s.date,
            shift_name=s.shift_name,
            time_from=s.time_from,
            time_to=s.time_to,
            required_count=s.required_count,
            status=s.status,
            created_at=s.created_at,
            updated_at=s.updated_at,
            user=user_out,
            location=loc_out
        ))
    return out


@router.post("/api/businesses/{business_id}/rosters/bulk", response_model=List[RosterShiftOut])
def bulk_save_roster_shifts(
    business_id: str,
    data: RosterBulkSaveInput,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "rosters.write", session=session)

    # Delete existing shifts in range
    existing_stmt = select(RosterShift).where(
        RosterShift.business_id == business_id,
        RosterShift.date >= data.start_date,
        RosterShift.date <= data.end_date
    )
    existing_shifts = session.exec(existing_stmt).all()
    for s in existing_shifts:
        session.delete(s)
    session.commit()

    # Save new shifts
    new_shifts = []
    for sc in data.shifts:
        shift = RosterShift(
            business_id=business_id,
            location_id=sc.location_id,
            user_id=sc.user_id,
            date=sc.date,
            shift_name=sc.shift_name,
            time_from=sc.time_from,
            time_to=sc.time_to,
            required_count=sc.required_count,
            status=sc.status
        )
        session.add(shift)
        new_shifts.append(shift)

    session.commit()

    # Reload with joins
    return get_roster_shifts(
        business_id=business_id,
        start_date=data.start_date,
        end_date=data.end_date,
        current_user=current_user,
        session=session
    )


@router.post("/api/businesses/{business_id}/rosters/copy")
def copy_previous_week_roster(
    business_id: str,
    data: RosterCopyInput,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "rosters.write", session=session)

    src_dt = datetime.strptime(data.src_start_date, "%Y-%m-%d")
    target_dt = datetime.strptime(data.target_start_date, "%Y-%m-%d")
    date_offset = (target_dt - src_dt).days

    src_end_date = (src_dt + timedelta(days=6)).strftime("%Y-%m-%d")
    target_end_date = (target_dt + timedelta(days=6)).strftime("%Y-%m-%d")

    # Fetch source shifts
    src_stmt = select(RosterShift).where(
        RosterShift.business_id == business_id,
        RosterShift.date >= data.src_start_date,
        RosterShift.date <= src_end_date
    )
    src_shifts = session.exec(src_stmt).all()

    # Delete existing target shifts
    target_stmt = select(RosterShift).where(
        RosterShift.business_id == business_id,
        RosterShift.date >= data.target_start_date,
        RosterShift.date <= target_end_date
    )
    target_shifts = session.exec(target_stmt).all()
    for s in target_shifts:
        session.delete(s)
    session.commit()

    # Copy shifts
    for s in src_shifts:
        s_dt = datetime.strptime(s.date, "%Y-%m-%d")
        new_date_str = (s_dt + timedelta(days=date_offset)).strftime("%Y-%m-%d")
        new_shift = RosterShift(
            business_id=business_id,
            location_id=s.location_id,
            user_id=s.user_id,
            date=new_date_str,
            shift_name=s.shift_name,
            time_from=s.time_from,
            time_to=s.time_to,
            required_count=s.required_count,
            status="draft"
        )
        session.add(new_shift)

    session.commit()
    return {"message": f"Successfully copied {len(src_shifts)} shifts to week starting {data.target_start_date}."}


@router.post("/api/businesses/{business_id}/rosters/publish")
def publish_roster(
    business_id: str,
    data: RosterPublishInput,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "rosters.write", session=session)

    stmt = select(RosterShift).where(
        RosterShift.business_id == business_id,
        RosterShift.date >= data.start_date,
        RosterShift.date <= data.end_date
    )
    shifts = session.exec(stmt).all()
    for s in shifts:
        s.status = "published"
        s.updated_at = datetime.utcnow()
        session.add(s)

    session.commit()
    return {"message": f"Successfully published {len(shifts)} shifts."}


@router.post("/api/businesses/{business_id}/rosters/auto-build", response_model=List[RosterShiftOut])
def auto_build_roster(
    business_id: str,
    data: AutoBuildInput,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "rosters.write", session=session)

    # 1. Fetch Roster Shifts
    shifts = session.exec(
        select(RosterShift).where(
            RosterShift.business_id == business_id,
            RosterShift.date >= data.start_date,
            RosterShift.date <= data.end_date
        )
    ).all()

    if not shifts:
        raise HTTPException(status_code=400, detail="No shifts configured for this week to build.")

    # 2. Fetch User Assignments (Active staff with priorities & positions)
    assignments = session.exec(
        select(UserAssignment).where(
            UserAssignment.business_id == business_id,
            UserAssignment.is_active == True,
            or_(UserAssignment.status != "pending_approval", UserAssignment.status.is_(None))
        )
    ).all()

    staff_map = {}
    for a in assignments:
        if a.user:
            staff_map[a.user_id] = {
                "user": a.user,
                "priority": a.priority or 5,
                "position": a.position,
                "max_working_hours": a.max_working_hours or 40.0
            }

    # 3. Fetch Staff Availability Submissions
    submissions = session.exec(
        select(StaffAvailability).where(
            StaffAvailability.business_id == business_id,
            StaffAvailability.start_date <= data.end_date,
            StaffAvailability.end_date >= data.start_date
        )
    ).all()

    # Map user availability: user_id -> date -> list of (time_from, time_to)
    availability_map = {}
    for sub in submissions:
        uid = sub.user_id
        if uid not in availability_map:
            availability_map[uid] = {}
        for day in sub.days:
            if not day.is_available:
                continue
            date_str = day.date
            availability_map[uid][date_str] = []
            for slot in day.slots:
                availability_map[uid][date_str].append((slot.time_from, slot.time_to))

    # Helper to check if a user is available at a specific date and time slot
    def is_user_available(uid: str, date_str: str, time_from: str, time_to: str) -> bool:
        if uid not in availability_map or date_str not in availability_map[uid]:
            return False
        
        # Parse shift times
        s_from = datetime.strptime(time_from, "%H:%M")
        s_to = datetime.strptime(time_to, "%H:%M")

        for avail_from, avail_to in availability_map[uid][date_str]:
            a_from = datetime.strptime(avail_from, "%H:%M")
            a_to = datetime.strptime(avail_to, "%H:%M")
            # Shift must fall entirely within the availability slot
            if a_from <= s_from and a_to >= s_to:
                return True
        return False

    # Track weekly working hours assigned in the auto-built roster so far
    user_hours = {}
    
    # Pre-populate already assigned hours from shifts that already have user_id
    for s in shifts:
        if s.user_id:
            # Calculate shift hours
            try:
                t_from = datetime.strptime(s.time_from, "%H:%M")
                t_to = datetime.strptime(s.time_to, "%H:%M")
                hours = (t_to - t_from).seconds / 3600.0
            except Exception:
                hours = 6.0
            user_hours[s.user_id] = user_hours.get(s.user_id, 0.0) + hours

    # 4. Perform Auto-Assignment
    # Sort shifts by date, time_from, required count to build sequentially
    shifts_sorted = sorted(shifts, key=lambda s: (s.date, s.time_from))

    for s in shifts_sorted:
        if s.user_id:
            continue  # Keep existing manual assignments

        # Calculate shift hours
        try:
            t_from = datetime.strptime(s.time_from, "%H:%M")
            t_to = datetime.strptime(s.time_to, "%H:%M")
            shift_hours = (t_to - t_from).seconds / 3600.0
        except Exception:
            shift_hours = 6.0

        # Find available staff members with no conflicts
        candidates = []
        for uid, info in staff_map.items():
            # Check availability
            if not is_user_available(uid, s.date, s.time_from, s.time_to):
                continue

            # Check if this assignment would exceed max hours
            current_h = user_hours.get(uid, 0.0)
            if current_h + shift_hours > info["max_working_hours"]:
                continue

            # Check if they are already working an overlapping shift on the same day
            overlapping = False
            for os_shift in shifts:
                if os_shift.user_id == uid and os_shift.date == s.date:
                    # Check overlap of s.time_from/to and os_shift.time_from/to
                    try:
                        s_start = datetime.strptime(s.time_from, "%H:%M")
                        s_end = datetime.strptime(s.time_to, "%H:%M")
                        o_start = datetime.strptime(os_shift.time_from, "%H:%M")
                        o_end = datetime.strptime(os_shift.time_to, "%H:%M")
                        if s_start < o_end and o_start < s_end:
                            overlapping = True
                            break
                    except Exception:
                        pass
            
            if overlapping:
                continue

            candidates.append({
                "uid": uid,
                "priority": info["priority"],
                "assigned_hours": current_h
            })

        if not candidates:
            continue

        # Sort candidates:
        # 1. By priority ascending (1 is highest priority)
        # 2. By hours already assigned ascending (to distribute load)
        candidates.sort(key=lambda c: (c["priority"], c["assigned_hours"]))

        # Assign the best candidate
        selected = candidates[0]
        s.user_id = selected["uid"]
        s.updated_at = datetime.utcnow()
        session.add(s)
        
        # Update their working hours
        user_hours[selected["uid"]] = selected["assigned_hours"] + shift_hours

    session.commit()

    # Return the updated shifts list
    return get_roster_shifts(
        business_id=business_id,
        start_date=data.start_date,
        end_date=data.end_date,
        current_user=current_user,
        session=session
    )
