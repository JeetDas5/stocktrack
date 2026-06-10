from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import (
    User,
    Location,
    UserAssignment,
    Timesheet,
    StaffAvailability,
    StaffAvailabilityDay,
    StaffAvailabilitySlot,
)
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Availability"])


class StaffAvailabilitySlotCreate(SQLModel):
    time_from: str
    time_to: str
    location_id: Optional[str] = None
    note: Optional[str] = None


class StaffAvailabilityDayCreate(SQLModel):
    date: str
    is_available: bool
    slots: List[StaffAvailabilitySlotCreate] = []


class StaffAvailabilitySubmit(SQLModel):
    start_date: str
    end_date: str
    period_type: str = "weekly"
    general_note: Optional[str] = None
    days: List[StaffAvailabilityDayCreate]


class LocationOut(SQLModel):
    id: str
    name: str


class StaffAvailabilitySlotOut(SQLModel):
    id: str
    time_from: str
    time_to: str
    location_id: Optional[str] = None
    location: Optional[LocationOut] = None
    note: Optional[str] = None


class StaffAvailabilityDayOut(SQLModel):
    id: str
    date: str
    is_available: bool
    slots: List[StaffAvailabilitySlotOut] = []


class StaffAvailabilityOut(SQLModel):
    id: str
    business_id: str
    user_id: str
    start_date: str
    end_date: str
    period_type: str
    general_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    days: List[StaffAvailabilityDayOut] = []


@router.get(
    "/api/businesses/{business_id}/availability/my-availability",
    response_model=Optional[StaffAvailabilityOut],
    summary="Get my availability",
    description="Get availability details for the currently authenticated user.",
    responses={
        200: {"description": "Availability details successfully retrieved."},
        401: {"description": "Missing or invalid authorization credentials."},
        404: {"description": "Availability details not found in database."},
    },
)
def get_my_availability(
    business_id: str,
    start_date: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_user_permission(
        current_user, business_id, "rosters.read_own", session=session
    )

    stmt = select(StaffAvailability).where(
        StaffAvailability.business_id == business_id,
        StaffAvailability.user_id == current_user.id,
        StaffAvailability.start_date == start_date,
    )
    availability = session.exec(stmt).first()
    if not availability:
        return None

    days_out = []
    for day in availability.days:
        slots_out = []
        for slot in day.slots:
            loc_out = None
            if slot.location_id and slot.location:
                loc_out = LocationOut(id=slot.location.id, name=slot.location.name)
            slots_out.append(
                StaffAvailabilitySlotOut(
                    id=slot.id,
                    time_from=slot.time_from,
                    time_to=slot.time_to,
                    location_id=slot.location_id,
                    location=loc_out,
                    note=slot.note,
                )
            )
        days_out.append(
            StaffAvailabilityDayOut(
                id=day.id,
                date=day.date,
                is_available=day.is_available,
                slots=slots_out,
            )
        )

    return StaffAvailabilityOut(
        id=availability.id,
        business_id=availability.business_id,
        user_id=availability.user_id,
        start_date=availability.start_date,
        end_date=availability.end_date,
        period_type=availability.period_type,
        general_note=availability.general_note,
        created_at=availability.created_at,
        updated_at=availability.updated_at,
        days=days_out,
    )


@router.post(
    "/api/businesses/{business_id}/availability",
    response_model=StaffAvailabilityOut,
    status_code=status.HTTP_201_CREATED,
    summary="Submit user availability",
    description="Submit or update the current user's availability for a specific week/fortnight.",
    responses={
        201: {"description": "Availability details successfully submitted."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "User does not have permission to submit availability."},
    },
)
def submit_availability(
    business_id: str,
    data: StaffAvailabilitySubmit,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_user_permission(
        current_user, business_id, "rosters.read_own", session=session
    )

    stmt = select(StaffAvailability).where(
        StaffAvailability.business_id == business_id,
        StaffAvailability.user_id == current_user.id,
        StaffAvailability.start_date == data.start_date,
    )
    existing = session.exec(stmt).first()
    if existing:
        session.delete(existing)

    availability = StaffAvailability(
        business_id=business_id,
        user_id=current_user.id,
        start_date=data.start_date,
        end_date=data.end_date,
        period_type=data.period_type,
        general_note=data.general_note,
    )
    session.add(availability)
    session.flush()

    for day_data in data.days:
        day = StaffAvailabilityDay(
            availability_id=availability.id,
            date=day_data.date,
            is_available=day_data.is_available,
        )
        session.add(day)
        session.flush()

        for slot_data in day_data.slots:
            slot = StaffAvailabilitySlot(
                availability_day_id=day.id,
                time_from=slot_data.time_from,
                time_to=slot_data.time_to,
                location_id=slot_data.location_id,
                note=slot_data.note,
            )
            session.add(slot)

    session.commit()
    session.refresh(availability)

    days_out = []
    for day in availability.days:
        slots_out = []
        for slot in day.slots:
            loc_out = None
            if slot.location_id and slot.location:
                loc_out = LocationOut(id=slot.location.id, name=slot.location.name)
            slots_out.append(
                StaffAvailabilitySlotOut(
                    id=slot.id,
                    time_from=slot.time_from,
                    time_to=slot.time_to,
                    location_id=slot.location_id,
                    location=loc_out,
                    note=slot.note,
                )
            )
        days_out.append(
            StaffAvailabilityDayOut(
                id=day.id,
                date=day.date,
                is_available=day.is_available,
                slots=slots_out,
            )
        )

    return StaffAvailabilityOut(
        id=availability.id,
        business_id=availability.business_id,
        user_id=availability.user_id,
        start_date=availability.start_date,
        end_date=availability.end_date,
        period_type=availability.period_type,
        general_note=availability.general_note,
        created_at=availability.created_at,
        updated_at=availability.updated_at,
        days=days_out,
    )


class OverviewStaffMemberOut(SQLModel):
    id: str
    name: str
    priority: int
    already_assigned: float
    worked_previous_day: str


class AvailabilityOverviewItemOut(SQLModel):
    date: str
    day: str
    location_id: Optional[str] = None
    location_name: str
    time_from: str
    time_to: str
    shift_label: str
    available_staff_count: int
    staff_members: List[OverviewStaffMemberOut] = []


@router.get(
    "/api/businesses/{business_id}/availability/overview",
    response_model=List[AvailabilityOverviewItemOut],
    summary="Get availability overview",
    description="Get aggregated staff availability overview for the period to build the roster.",
)
def get_availability_overview(
    business_id: str,
    start_date: str,
    end_date: str,
    location_id: Optional[str] = None,
    shift: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    verify_user_permission(current_user, business_id, "rosters.read", session=session)

    stmt = select(StaffAvailability).where(
        StaffAvailability.business_id == business_id,
        StaffAvailability.start_date <= end_date,
        StaffAvailability.end_date >= start_date,
    )
    submissions = session.exec(stmt).all()

    loc_stmt = select(Location).where(
        Location.business_id == business_id,
        Location.is_active,
    )
    locations = session.exec(loc_stmt).all()

    dates = []
    curr = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    while curr <= end_dt:
        dates.append(curr.strftime("%Y-%m-%d"))
        curr += timedelta(days=1)

    assignment_stmt = select(UserAssignment).where(
        UserAssignment.business_id == business_id,
        UserAssignment.is_active,
    )
    assignments = session.exec(assignment_stmt).all()
    user_priorities = {a.user_id: a.priority for a in assignments}

    prev_start_dt = (
        datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=1)
    ).strftime("%Y-%m-%d")
    ts_stmt = select(Timesheet).where(
        Timesheet.business_id == business_id,
        Timesheet.work_date >= prev_start_dt,
        Timesheet.work_date <= end_date,
    )
    timesheets = session.exec(ts_stmt).all()

    user_weekly_hours = {}
    for ts in timesheets:
        if ts.work_date >= start_date:
            user_weekly_hours[ts.staff_id] = (
                user_weekly_hours.get(ts.staff_id, 0.0) + ts.total_hours
            )

    user_worked_dates = set((ts.staff_id, ts.work_date) for ts in timesheets)

    groups = {}
    for sub in submissions:
        user = sub.user
        if not user:
            continue
        priority = user_priorities.get(user.id, 1)

        for day in sub.days:
            if not day.is_available:
                continue
            date_str = day.date
            if date_str < start_date or date_str > end_date:
                continue

            for slot in day.slots:
                target_loc_ids = []
                if slot.location_id:
                    target_loc_ids.append(slot.location_id)
                else:
                    target_loc_ids.extend([loc.id for loc in locations])

                if not target_loc_ids:
                    target_loc_ids.append(None)

                for loc_id in target_loc_ids:
                    key = (date_str, loc_id, slot.time_from, slot.time_to)
                    if key not in groups:
                        groups[key] = []
                    groups[key].append((user, priority))

    location_names = {loc.id: loc.name for loc in locations}
    location_names[None] = "Any Location"

    out = []
    for (date_str, loc_id, t_from, t_to), users in groups.items():
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        day_name = dt.strftime("%a")

        staff_members_out = []
        for user, priority in users:
            prev_date_str = (dt - timedelta(days=1)).strftime("%Y-%m-%d")
            worked_prev = (
                "Yes" if (user.id, prev_date_str) in user_worked_dates else "No"
            )
            already_assigned = user_weekly_hours.get(user.id, 0.0)

            staff_members_out.append(
                OverviewStaffMemberOut(
                    id=user.id,
                    name=user.name or "Unknown",
                    priority=priority,
                    already_assigned=already_assigned,
                    worked_previous_day=worked_prev,
                )
            )

        staff_members_out.sort(key=lambda s: (s.priority, s.name))
        loc_name = location_names.get(loc_id, "Any Location")

        out.append(
            AvailabilityOverviewItemOut(
                date=date_str,
                day=day_name,
                location_id=loc_id,
                location_name=loc_name,
                time_from=t_from,
                time_to=t_to,
                shift_label=f"{t_from} - {t_to}",
                available_staff_count=len(staff_members_out),
                staff_members=staff_members_out,
            )
        )

    if location_id and location_id != "all":
        out = [item for item in out if item.location_id == location_id]

    if shift and shift != "all":
        out = [item for item in out if item.shift_label == shift]

    out.sort(key=lambda item: (item.date, item.location_name, item.time_from))
    return out
