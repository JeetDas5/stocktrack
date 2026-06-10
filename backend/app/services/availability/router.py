from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import (
    User,
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
