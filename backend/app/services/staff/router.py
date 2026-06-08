from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import User, Business, Location, UserAssignment
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Staff"])


class StaffCreate(SQLModel):
    name: str
    phone: str
    email: str
    role: str
    status: str = "Active"
    location_ids: List[str] = []


class LocationOut(SQLModel):
    id: str
    name: str


class StaffOut(SQLModel):
    id: str
    name: str
    phone: str
    email: str
    role: str
    status: str
    business_id: str
    created_at: datetime
    updated_at: datetime
    locations: List[LocationOut] = []


@router.post("/api/businesses/{business_id}/staff", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def create_staff(
    business_id: str,
    data: StaffCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "staff.write", session=session)

    user = session.exec(select(User).where(User.email == data.email.strip())).first()
    if not user:
        user = User(
            email=data.email.strip(),
            name=data.name.strip(),
            phone=data.phone.strip(),
            role="staff"
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    else:
        user.name = data.name.strip()
        user.phone = data.phone.strip()
        session.add(user)
        session.commit()
        session.refresh(user)

    existing_assignments = session.exec(
        select(UserAssignment).where(
            UserAssignment.user_id == user.id,
            UserAssignment.business_id == business_id
        )
    ).all()
    for ass in existing_assignments:
        session.delete(ass)
    session.commit()

    is_active = (data.status == "Active")

    if data.location_ids:
        for loc_id in data.location_ids:
            ass = UserAssignment(
                user_id=user.id,
                business_id=business_id,
                location_id=loc_id,
                role=data.role,
                is_active=is_active
            )
            session.add(ass)
    else:
        ass = UserAssignment(
            user_id=user.id,
            business_id=business_id,
            location_id=None,
            role=data.role,
            is_active=is_active
        )
        session.add(ass)

    session.commit()

    assignments = session.exec(
        select(UserAssignment).where(
            UserAssignment.user_id == user.id,
            UserAssignment.business_id == business_id
        )
    ).all()

    locs = []
    is_all_locations = False
    for ass in assignments:
        if ass.location_id is None:
            is_all_locations = True
        elif ass.location:
            locs.append(LocationOut(id=ass.location.id, name=ass.location.name))

    if is_all_locations:
        all_biz_locs = session.exec(select(Location).where(Location.business_id == business_id)).all()
        locs = [LocationOut(id=l.id, name=l.name) for l in all_biz_locs]

    created_at = assignments[0].created_at if assignments else datetime.utcnow()

    return StaffOut(
        id=user.id,
        name=user.name or "",
        phone=user.phone or "",
        email=user.email,
        role=data.role,
        status=data.status,
        business_id=business_id,
        created_at=created_at,
        updated_at=datetime.utcnow(),
        locations=locs
    )


@router.get("/api/businesses/{business_id}/staff", response_model=List[StaffOut])
def get_staff_members(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "staff.read", session=session)

    assignments = session.exec(
        select(UserAssignment).where(UserAssignment.business_id == business_id)
    ).all()

    by_user = {}
    for ass in assignments:
        if not ass.user:
            continue
        uid = ass.user.id
        if uid not in by_user:
            by_user[uid] = {
                "user": ass.user,
                "assignments": []
            }
        by_user[uid]["assignments"].append(ass)

    out = []
    all_biz_locs = None

    for uid, info in by_user.items():
        user = info["user"]
        user_assignments = info["assignments"]

        locs = []
        is_all_locations = False
        role = "Staff"
        is_active = False

        for ass in user_assignments:
            if ass.role:
                role = ass.role
            if ass.is_active:
                is_active = True
            if ass.location_id is None:
                is_all_locations = True
            elif ass.location:
                locs.append(LocationOut(id=ass.location.id, name=ass.location.name))

        if is_all_locations:
            if all_biz_locs is None:
                all_biz_locs = session.exec(select(Location).where(Location.business_id == business_id)).all()
            locs = [LocationOut(id=l.id, name=l.name) for l in all_biz_locs]

        created_at = user_assignments[0].created_at if user_assignments else datetime.utcnow()

        out.append(StaffOut(
            id=user.id,
            name=user.name or "",
            phone=user.phone or "",
            email=user.email,
            role=role,
            status="Active" if is_active else "Inactive",
            business_id=business_id,
            created_at=created_at,
            updated_at=user.updated_at or datetime.utcnow(),
            locations=locs
        ))

    return out


@router.put("/api/businesses/{business_id}/staff/{staff_id}", response_model=StaffOut)
def update_staff(
    business_id: str,
    staff_id: str,
    data: StaffCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "staff.write", session=session)

    user = session.get(User, staff_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.name = data.name.strip()
    user.phone = data.phone.strip()
    user.email = data.email.strip()
    session.add(user)
    session.commit()
    session.refresh(user)

    existing_assignments = session.exec(
        select(UserAssignment).where(
            UserAssignment.user_id == staff_id,
            UserAssignment.business_id == business_id
        )
    ).all()
    for ass in existing_assignments:
        session.delete(ass)
    session.commit()

    is_active = (data.status == "Active")

    if data.location_ids:
        for loc_id in data.location_ids:
            ass = UserAssignment(
                user_id=staff_id,
                business_id=business_id,
                location_id=loc_id,
                role=data.role,
                is_active=is_active
            )
            session.add(ass)
    else:
        ass = UserAssignment(
            user_id=staff_id,
            business_id=business_id,
            location_id=None,
            role=data.role,
            is_active=is_active
        )
        session.add(ass)

    session.commit()

    assignments = session.exec(
        select(UserAssignment).where(
            UserAssignment.user_id == staff_id,
            UserAssignment.business_id == business_id
        )
    ).all()

    locs = []
    is_all_locations = False
    for ass in assignments:
        if ass.location_id is None:
            is_all_locations = True
        elif ass.location:
            locs.append(LocationOut(id=ass.location.id, name=ass.location.name))

    if is_all_locations:
        all_biz_locs = session.exec(select(Location).where(Location.business_id == business_id)).all()
        locs = [LocationOut(id=l.id, name=l.name) for l in all_biz_locs]

    created_at = assignments[0].created_at if assignments else datetime.utcnow()

    return StaffOut(
        id=user.id,
        name=user.name or "",
        phone=user.phone or "",
        email=user.email,
        role=data.role,
        status=data.status,
        business_id=business_id,
        created_at=created_at,
        updated_at=datetime.utcnow(),
        locations=locs
    )


@router.delete("/api/businesses/{business_id}/staff/{staff_id}")
def delete_staff(
    business_id: str,
    staff_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "staff.write", session=session)

    existing_assignments = session.exec(
        select(UserAssignment).where(
            UserAssignment.user_id == staff_id,
            UserAssignment.business_id == business_id
        )
    ).all()
    if not existing_assignments:
        raise HTTPException(status_code=404, detail="Staff assignments not found")

    for ass in existing_assignments:
        session.delete(ass)
    session.commit()

    return {"message": "Staff assignments deleted successfully"}
