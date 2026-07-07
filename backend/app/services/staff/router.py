import os
import resend
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select, SQLModel, or_

from app.database import get_session
from app.models import User, Business, Location, UserAssignment, StaffInvitation
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Staff"])


class StaffCreate(SQLModel):
    name: str
    phone: str
    email: str
    role: str
    status: str = "Active"
    location_ids: List[str] = []
    priority: int = 5
    position: Optional[str] = None
    max_working_hours: Optional[float] = None
    assignments: Optional[List[dict]] = None
    hourly_rate: Optional[float] = None
    reporting_to: Optional[str] = None
    start_date: Optional[str] = None
    employment_type: Optional[str] = None


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
    priority: int = 5
    position: Optional[str] = None
    max_working_hours: Optional[float] = None
    hourly_rate: Optional[float] = None
    reporting_to: Optional[str] = None
    start_date: Optional[str] = None
    employment_type: Optional[str] = None


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
            role=data.role.strip().lower()
        )
    else:
        user.name = data.name.strip()
        user.phone = data.phone.strip()
        role = data.role.strip().lower()
        if role in ["staff", "manager", "admin"]:
            user.role = role

    user.position = data.position
    user.reports_to = data.reporting_to
    if not user.employee_id:
        import random
        user.employee_id = f"EMP-{random.randint(10000, 99999)}"
    if data.employment_type:
        user.employment_type = data.employment_type
    elif not user.employment_type:
        user.employment_type = "Casual"
    if data.start_date:
        try:
            if "-" in data.start_date:
                user.start_date = datetime.strptime(data.start_date, "%Y-%m-%d")
            elif "/" in data.start_date:
                user.start_date = datetime.strptime(data.start_date, "%d/%m/%Y")
        except Exception:
            pass

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
                is_active=is_active,
                priority=data.priority,
                position=data.position,
                max_working_hours=data.max_working_hours,
                hourly_rate=data.hourly_rate,
                reporting_to=data.reporting_to,
                start_date=data.start_date
            )
            session.add(ass)
    else:
        ass = UserAssignment(
            user_id=user.id,
            business_id=business_id,
            location_id=None,
            role=data.role,
            is_active=is_active,
            priority=data.priority,
            position=data.position,
            max_working_hours=data.max_working_hours,
            hourly_rate=data.hourly_rate,
            reporting_to=data.reporting_to,
            start_date=data.start_date
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

    priority = 5
    position = None
    max_working_hours = None
    hourly_rate = None
    reporting_to = None
    start_date = None
    if assignments:
        priority = assignments[0].priority
        position = assignments[0].position
        max_working_hours = assignments[0].max_working_hours
        hourly_rate = assignments[0].hourly_rate
        reporting_to = assignments[0].reporting_to
        start_date = assignments[0].start_date

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
        locations=locs,
        priority=priority,
        position=position,
        max_working_hours=max_working_hours,
        hourly_rate=hourly_rate,
        reporting_to=reporting_to,
        start_date=start_date,
        employment_type=user.employment_type
    )


@router.get("/api/businesses/{business_id}/staff/me", response_model=StaffOut)
def get_my_staff_profile(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Returns the current user's own staff record for a given business."""
    assignments = session.exec(
        select(UserAssignment).where(
            UserAssignment.user_id == current_user.id,
            UserAssignment.business_id == business_id,
            or_(
                UserAssignment.status != "pending_approval",
                UserAssignment.status.is_(None)
            )
        )
    ).all()

    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No staff record found for this user in the given business"
        )

    locs = []
    is_all_locations = False
    role = "staff"
    is_active = False
    priority = 5
    position = None
    max_working_hours = None
    hourly_rate = None
    reporting_to = None
    start_date = None

    for ass in assignments:
        if ass.role:
            role = ass.role
        if ass.is_active:
            is_active = True
        if ass.location_id is None:
            is_all_locations = True
        elif ass.location:
            locs.append(LocationOut(id=ass.location.id, name=ass.location.name))

        if ass.priority:
            priority = ass.priority
        if ass.position:
            position = ass.position
        if ass.max_working_hours is not None:
            max_working_hours = ass.max_working_hours
        if ass.hourly_rate is not None:
            hourly_rate = ass.hourly_rate
        if ass.reporting_to:
            reporting_to = ass.reporting_to
        if ass.start_date:
            start_date = ass.start_date

    if is_all_locations:
        all_biz_locs = session.exec(select(Location).where(Location.business_id == business_id)).all()
        locs = [LocationOut(id=l.id, name=l.name) for l in all_biz_locs]

    created_at = assignments[0].created_at if assignments else datetime.utcnow()

    return StaffOut(
        id=current_user.id,
        name=current_user.name or "",
        phone=current_user.phone or "",
        email=current_user.email,
        role=role,
        status="Active" if is_active else "Inactive",
        business_id=business_id,
        created_at=created_at,
        updated_at=current_user.updated_at or datetime.utcnow(),
        locations=locs,
        priority=priority,
        position=position,
        max_working_hours=max_working_hours,
        hourly_rate=hourly_rate,
        reporting_to=reporting_to,
        start_date=start_date,
        employment_type=current_user.employment_type
    )


@router.get("/api/businesses/{business_id}/staff", response_model=List[StaffOut])
def get_staff_members(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "staff.read", session=session)

    assignments = session.exec(
        select(UserAssignment).where(
            UserAssignment.business_id == business_id,
            or_(
                UserAssignment.status != "pending_approval",
                UserAssignment.status.is_(None)
            )
        )
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

        priority = 5
        position = None
        max_working_hours = None
        hourly_rate = None
        reporting_to = None
        start_date = None

        for ass in user_assignments:
            if ass.role:
                role = ass.role
            if ass.is_active:
                is_active = True
            if ass.location_id is None:
                is_all_locations = True
            elif ass.location:
                locs.append(LocationOut(id=ass.location.id, name=ass.location.name))
            
            if ass.priority:
                priority = ass.priority
            if ass.position:
                position = ass.position
            if ass.max_working_hours is not None:
                max_working_hours = ass.max_working_hours
            if ass.hourly_rate is not None:
                hourly_rate = ass.hourly_rate
            if ass.reporting_to:
                reporting_to = ass.reporting_to
            if ass.start_date:
                start_date = ass.start_date

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
            locations=locs,
            priority=priority,
            position=position,
            max_working_hours=max_working_hours,
            hourly_rate=hourly_rate,
            reporting_to=reporting_to,
            start_date=start_date,
            employment_type=user.employment_type
        ))

    return out


@router.get("/api/businesses/{business_id}/staff/{staff_id}/assignments", response_model=List[dict])
def get_staff_assignments(
    business_id: str,
    staff_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "staff.read", session=session)
    assignments = session.exec(
        select(UserAssignment).where(UserAssignment.user_id == staff_id)
    ).all()
    
    by_biz = {}
    for ass in assignments:
        biz_id = ass.business_id
        if biz_id not in by_biz:
            by_biz[biz_id] = []
        if ass.location_id:
            by_biz[biz_id].append(ass.location_id)
            
    return [{"business_id": b, "location_ids": locs} for b, locs in by_biz.items()]


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

    # Admin cannot edit name, phone, email of other users
    if current_user.role != "super_admin" and current_user.id != staff_id:
        business = session.get(Business, business_id)
        is_owner = business and business.created_by_id == current_user.id
        if not is_owner:
            stmt = select(UserAssignment).where(
                UserAssignment.user_id == current_user.id,
                UserAssignment.business_id == business_id,
                UserAssignment.is_active == True
            )
            assignment = session.exec(stmt).first()
            user_role = assignment.role if assignment else current_user.role
            
            if user_role == "admin" or current_user.role == "admin":
                data.name = user.name if user.name is not None else ""
                data.phone = user.phone if user.phone is not None else ""
                data.email = user.email if user.email is not None else ""

    user.name = data.name.strip()
    user.phone = data.phone.strip()
    user.email = data.email.strip()
    
    role = data.role.strip().lower()
    if role in ["staff", "manager", "admin"]:
        user.role = role

    user.position = data.position
    user.reports_to = data.reporting_to
    if not user.employee_id:
        import random
        user.employee_id = f"EMP-{random.randint(10000, 99999)}"
    if data.employment_type:
        user.employment_type = data.employment_type
    elif not user.employment_type:
        user.employment_type = "Casual"
    if data.start_date:
        try:
            if "-" in data.start_date:
                user.start_date = datetime.strptime(data.start_date, "%Y-%m-%d")
            elif "/" in data.start_date:
                user.start_date = datetime.strptime(data.start_date, "%d/%m/%Y")
        except Exception:
            pass

    session.add(user)
    session.commit()
    session.refresh(user)

    if data.assignments is not None:
        existing_assignments = session.exec(
            select(UserAssignment).where(UserAssignment.user_id == staff_id)
        ).all()
        for ass in existing_assignments:
            session.delete(ass)
        session.commit()

        is_active = (data.status == "Active")
        role = data.role.strip().lower()

        for ass in data.assignments:
            biz_id = ass.get("business_id")
            if not biz_id:
                raise HTTPException(status_code=400, detail="Missing business_id in assignment")
            verify_user_permission(current_user, biz_id, "staff.write", session=session)

            loc_ids = ass.get("location_ids", [])
            if loc_ids:
                for loc_id in loc_ids:
                    new_ass = UserAssignment(
                        user_id=staff_id,
                        business_id=biz_id,
                        location_id=loc_id,
                        role=role,
                        is_active=is_active,
                        status="active",
                        priority=data.priority,
                        position=data.position,
                        max_working_hours=data.max_working_hours,
                        hourly_rate=data.hourly_rate,
                        reporting_to=data.reporting_to,
                        start_date=data.start_date
                    )
                    session.add(new_ass)
            else:
                new_ass = UserAssignment(
                    user_id=staff_id,
                    business_id=biz_id,
                    location_id=None,
                    role=role,
                    is_active=is_active,
                    status="active",
                    priority=data.priority,
                    position=data.position,
                    max_working_hours=data.max_working_hours,
                    hourly_rate=data.hourly_rate,
                    reporting_to=data.reporting_to,
                    start_date=data.start_date
                )
                session.add(new_ass)
    else:
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
                    is_active=is_active,
                    priority=data.priority,
                    position=data.position,
                    max_working_hours=data.max_working_hours,
                    hourly_rate=data.hourly_rate,
                    reporting_to=data.reporting_to,
                    start_date=data.start_date
                )
                session.add(ass)
        else:
            ass = UserAssignment(
                user_id=staff_id,
                business_id=business_id,
                location_id=None,
                role=data.role,
                is_active=is_active,
                priority=data.priority,
                position=data.position,
                max_working_hours=data.max_working_hours,
                hourly_rate=data.hourly_rate,
                reporting_to=data.reporting_to,
                start_date=data.start_date
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

    priority = 5
    position = None
    max_working_hours = None
    hourly_rate = None
    reporting_to = None
    start_date = None
    if assignments:
        priority = assignments[0].priority
        position = assignments[0].position
        max_working_hours = assignments[0].max_working_hours
        hourly_rate = assignments[0].hourly_rate
        reporting_to = assignments[0].reporting_to
        start_date = assignments[0].start_date

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
        locations=locs,
        priority=priority,
        position=position,
        max_working_hours=max_working_hours,
        hourly_rate=hourly_rate,
        reporting_to=reporting_to,
        start_date=start_date,
        employment_type=user.employment_type
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


# Staff Invitation Flow

class StaffInvitationCreate(SQLModel):
    role: Optional[str] = "staff"
    expires_in_hours: int = 48  # default 48, max 720 (30 days)
    assignments: Optional[List[dict]] = None
    business_id: Optional[str] = None


class StaffInvitationOut(SQLModel):
    id: str
    role: str
    assignments_json: List[dict]
    expires_at: datetime
    created_at: datetime
    status: str
    business_id: Optional[str] = None


class StaffInvitationPublicOut(SQLModel):
    id: str
    role: str
    expires_at: datetime
    status: str
    businesses: List[dict]  # list of {"id": "...", "name": "...", "locations": [{"id": "...", "name": "..."}]}
    invited_by: str
    email: Optional[str] = None
    modules: List[str] = []


class StaffInvitationRegister(SQLModel):
    name: str
    phone: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class PendingStaffAssignmentOut(SQLModel):
    id: str
    user_id: str
    user_name: Optional[str]
    user_email: str
    user_phone: Optional[str]
    business_id: str
    business_name: str
    location_id: Optional[str]
    location_name: Optional[str]
    role: str
    status: str
    created_at: datetime


@router.post("/api/staff/invitations", response_model=StaffInvitationOut, status_code=status.HTTP_201_CREATED)
def create_staff_invitation(
    data: StaffInvitationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if data.business_id:
        verify_user_permission(current_user, data.business_id, "staff.write", session=session)

    assignments = data.assignments or []
    for ass in assignments:
        biz_id = ass.get("business_id")
        if not biz_id:
            raise HTTPException(status_code=400, detail="Missing business_id in assignment")
        verify_user_permission(current_user, biz_id, "staff.write", session=session)

    if not assignments and data.business_id:
        assignments = [{"business_id": data.business_id, "location_ids": []}]

    hours = max(1, min(data.expires_in_hours, 720))
    expires_at = datetime.utcnow() + timedelta(hours=hours)

    invite = StaffInvitation(
        created_by_id=current_user.id,
        business_id=data.business_id,
        role=data.role or "staff",
        assignments_json=assignments,
        expires_at=expires_at,
        status="pending",
        modules=current_user.modules or []
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)
    return invite


@router.get("/api/staff/invitations/{invitation_id}", response_model=StaffInvitationPublicOut)
def get_staff_invitation(
    invitation_id: str,
    session: Session = Depends(get_session)
):
    invite = session.get(StaffInvitation, invitation_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invite.status == "pending" and invite.expires_at < datetime.utcnow():
        invite.status = "expired"
        session.add(invite)
        session.commit()
        session.refresh(invite)

    businesses_out = []
    assignments = invite.assignments_json
    if not assignments and invite.business_id:
        assignments = [{"business_id": invite.business_id, "location_ids": []}]

    for ass in assignments:
        biz_id = ass.get("business_id")
        loc_ids = ass.get("location_ids", [])
        business = session.get(Business, biz_id)
        if not business:
            continue
        
        locs = []
        if loc_ids:
            for l_id in loc_ids:
                loc = session.get(Location, l_id)
                if loc and loc.business_id == biz_id:
                    locs.append({"id": loc.id, "name": loc.name})
        else:
            all_locs = session.exec(select(Location).where(Location.business_id == biz_id)).all()
            locs = [{"id": l.id, "name": l.name} for l in all_locs]

        businesses_out.append({
            "id": business.id,
            "name": business.name,
            "locations": locs
        })

    creator = session.get(User, invite.created_by_id)
    invited_by_name = (creator.name or creator.email) if creator else "Admin"

    return StaffInvitationPublicOut(
        id=invite.id,
        role=invite.role,
        expires_at=invite.expires_at,
        status=invite.status,
        businesses=businesses_out,
        invited_by=invited_by_name,
        email=invite.email,
        modules=invite.modules or []
    )


@router.post("/api/staff/invitations/{invitation_id}/register")
def register_staff_invitation(
    invitation_id: str,
    data: StaffInvitationRegister,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    invite = session.get(StaffInvitation, invitation_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invite.status == "expired" or invite.expires_at < datetime.utcnow():
        invite.status = "expired"
        session.add(invite)
        session.commit()
        raise HTTPException(status_code=400, detail="Invitation link has expired")

    if invite.status == "completed":
        raise HTTPException(status_code=400, detail="Invitation has already been used")

    current_user.name = data.name.strip()
    current_user.phone = data.phone.strip()
    current_user.role = invite.role
    current_user.is_internal = True
    current_user.modules = invite.modules or []
    
    # Set first_name and last_name on backend from input data
    if data.first_name and data.first_name.strip():
        current_user.first_name = data.first_name.strip()
    elif data.name.strip():
        name_parts = data.name.strip().split(None, 1)
        current_user.first_name = name_parts[0]
        
    if data.last_name and data.last_name.strip():
        current_user.last_name = data.last_name.strip()
    elif data.name.strip():
        name_parts = data.name.strip().split(None, 1)
        if len(name_parts) > 1:
            current_user.last_name = name_parts[1]
            
    if invite.role == "admin":
        invite.status = "completed"
        invite.registered_user_id = current_user.id
        session.add(invite)
        
    session.add(current_user)

    assignments = invite.assignments_json
    if not assignments and invite.business_id:
        assignments = [{"business_id": invite.business_id, "location_ids": []}]

    for ass in assignments:
        biz_id = ass.get("business_id")
        loc_ids = ass.get("location_ids", [])

        existing_assignments = session.exec(
            select(UserAssignment).where(
                UserAssignment.user_id == current_user.id,
                UserAssignment.business_id == biz_id
            )
        ).all()
        for old_ass in existing_assignments:
            session.delete(old_ass)

        if loc_ids:
            for loc_id in loc_ids:
                new_ass = UserAssignment(
                    user_id=current_user.id,
                    business_id=biz_id,
                    location_id=loc_id,
                    role=invite.role,
                    is_active=False,
                    status="pending_approval"
                )
                session.add(new_ass)
        else:
            new_ass = UserAssignment(
                user_id=current_user.id,
                business_id=biz_id,
                location_id=None,
                role=invite.role,
                is_active=False,
                status="pending_approval"
            )
            session.add(new_ass)

    # Commented out to allow reusable invitation link
    # invite.status = "waiting_approval"
    # invite.registered_user_id = current_user.id
    # session.add(invite)
    session.commit()
    
    # Send email notification to the owner who created the invitation
    owner = session.get(User, invite.created_by_id)
    if owner and owner.email:
        api_key = os.environ.get("RESEND_API_KEY")
        if api_key:
            resend.api_key = api_key
            
            # Determine the client app URL dynamically
            origin = request.headers.get("origin")
            if not origin:
                referer = request.headers.get("referer")
                if referer:
                    from urllib.parse import urlparse
                    parsed = urlparse(referer)
                    origin = f"{parsed.scheme}://{parsed.netloc}"
            app_url = origin or os.environ.get("BETTER_AUTH_URL", "http://localhost:3000")
            approval_link = f"{app_url}/dashboard/team-members"
            
            email_html = f"""
            <div style="font-family: 'Outfit', 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111827; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0;">New Staff Registration</h1>
                <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">A new team member has registered</p>
              </div>
              
              <div style="background-color: #ffffff; padding: 30px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
                <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {owner.first_name or owner.name},</p>
                <p style="font-size: 16px; line-height: 1.6;"><strong>{current_user.name}</strong> has just completed their registration using the staff invitation link you provided.</p>
                <p style="font-size: 16px; line-height: 1.6;">They are now waiting for your approval to be officially added to your team. Please review and approve their profile to complete the onboarding process.</p>
                
                <div style="text-align: center; margin: 35px 0 25px 0;">
                  <a href="{approval_link}" style="display: inline-block; padding: 12px 30px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(17, 24, 39, 0.15);">Review Pending Approvals</a>
                </div>
                
                <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
                  If the button above does not work, copy and paste this URL into your browser:<br>
                  <a href="{approval_link}" style="color: #4f46e5; text-decoration: none;">{approval_link}</a>
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
                &copy; {datetime.utcnow().year} NexBrix. All rights reserved.
              </div>
            </div>
            """
            
            try:
                resend.Emails.send({
                    "from": "NexBrix <info@nexbrix.com.au>",
                    "to": [owner.email],
                    "subject": "Staff Registration Pending Approval | NexBrix",
                    "html": email_html
                })
            except Exception as e:
                print(f"Failed to send staff registration notification via Resend: {e}")

    return {"message": "Profile submitted and assignments are pending approval."}


@router.get("/api/businesses/{business_id}/pending-staff", response_model=List[PendingStaffAssignmentOut])
def get_pending_staff(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "staff.write", session=session)

    assignments = session.exec(
        select(UserAssignment).where(
            UserAssignment.business_id == business_id,
            UserAssignment.status == "pending_approval"
        )
    ).all()

    out = []
    for ass in assignments:
        if not ass.user:
            continue
        location_name = ass.location.name if ass.location else "All Locations"
        business_name = ass.business.name if ass.business else "Business"
        out.append(PendingStaffAssignmentOut(
            id=ass.id,
            user_id=ass.user_id,
            user_name=ass.user.name,
            user_email=ass.user.email,
            user_phone=ass.user.phone,
            business_id=ass.business_id,
            business_name=business_name,
            location_id=ass.location_id,
            location_name=location_name,
            role=ass.role,
            status=ass.status,
            created_at=ass.created_at
        ))

    return out


class StaffRejectionDetails(SQLModel):
    reason: str


class StaffApprovalDetails(SQLModel):
    role: str
    assignments: List[dict]
    priority: int = 5
    position: Optional[str] = None
    max_working_hours: Optional[float] = None
    hourly_rate: Optional[float] = None
    reporting_to: Optional[str] = None
    start_date: Optional[str] = None
    employment_type: Optional[str] = None


@router.post("/api/businesses/{business_id}/pending-staff/{assignment_id}/approve")
def approve_pending_staff(
    business_id: str,
    assignment_id: str,
    data: StaffApprovalDetails,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "staff.write", session=session)

    assignment = session.get(UserAssignment, assignment_id)
    if not assignment or assignment.business_id != business_id:
        raise HTTPException(status_code=404, detail="Pending assignment not found")

    if assignment.status != "pending_approval":
        raise HTTPException(status_code=400, detail="Assignment is not pending approval")

    user = assignment.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_email = user.email
    user_name = user.name or user.email
    
    # Determine the business name
    business_name = "the business"
    if assignment.business:
        business_name = assignment.business.name
    else:
        biz = session.get(Business, business_id)
        if biz:
            business_name = biz.name

    role = data.role.strip().lower()
    if role not in ["staff", "manager"]:
        raise HTTPException(status_code=400, detail="Role must be either 'staff' or 'manager'")

    if not data.assignments:
        raise HTTPException(status_code=400, detail="At least one business assignment is required")

    user.role = role
    user.position = data.position
    user.reports_to = data.reporting_to
    if not user.employee_id:
        import random
        user.employee_id = f"EMP-{random.randint(10000, 99999)}"
    if data.employment_type:
        user.employment_type = data.employment_type
    elif not user.employment_type:
        user.employment_type = "Casual"
    if data.start_date:
        try:
            if "-" in data.start_date:
                user.start_date = datetime.strptime(data.start_date, "%Y-%m-%d")
            elif "/" in data.start_date:
                user.start_date = datetime.strptime(data.start_date, "%d/%m/%Y")
        except Exception:
            pass

    session.add(user)

    existing_assignments = session.exec(
        select(UserAssignment).where(UserAssignment.user_id == user.id)
    ).all()
    for old_ass in existing_assignments:
        session.delete(old_ass)
    session.commit()

    for ass in data.assignments:
        biz_id = ass.get("business_id")
        if not biz_id:
            raise HTTPException(status_code=400, detail="Missing business_id in assignment")
        verify_user_permission(current_user, biz_id, "staff.write", session=session)

        loc_ids = ass.get("location_ids", [])
        if loc_ids:
            for loc_id in loc_ids:
                new_ass = UserAssignment(
                    user_id=user.id,
                    business_id=biz_id,
                    location_id=loc_id,
                    role=role,
                    is_active=True,
                    status="active",
                    priority=data.priority,
                    position=data.position,
                    max_working_hours=data.max_working_hours,
                    hourly_rate=data.hourly_rate,
                    reporting_to=data.reporting_to,
                    start_date=data.start_date
                )
                session.add(new_ass)
        else:
            new_ass = UserAssignment(
                user_id=user.id,
                business_id=biz_id,
                location_id=None,
                role=role,
                is_active=True,
                status="active",
                priority=data.priority,
                position=data.position,
                max_working_hours=data.max_working_hours,
                hourly_rate=data.hourly_rate,
                reporting_to=data.reporting_to,
                start_date=data.start_date
            )
            session.add(new_ass)

    invite = session.exec(
        select(StaffInvitation).where(
            StaffInvitation.registered_user_id == user.id,
            StaffInvitation.status == "waiting_approval"
        )
    ).first()
    if invite:
        invite.status = "completed"
        session.add(invite)

    session.commit()

    # Send email via Resend
    api_key = os.environ.get("RESEND_API_KEY")
    if api_key:
        resend.api_key = api_key
        
        # Determine the client app URL dynamically from the request headers
        origin = request.headers.get("origin")
        if not origin:
            referer = request.headers.get("referer")
            if referer:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
        app_url = origin or os.environ.get("BETTER_AUTH_URL", "http://localhost:3000")
        login_link = f"{app_url}/login"
        
        email_html = f"""
        <div style="font-family: 'Outfit', 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111827; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0;">Onboarding Approved</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">Welcome to the team!</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
            <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {user_name},</p>
            <p style="font-size: 16px; line-height: 1.6;">We are pleased to inform you that your onboarding request for <strong>{business_name}</strong> has been approved by the administrator.</p>
            <p style="font-size: 16px; line-height: 1.6;">Your role has been set to <strong>{role.capitalize()}</strong>. You can now access your dashboard and manage your profile, and timesheets.</p>
            
            <div style="text-align: center; margin: 35px 0 25px 0;">
              <a href="{login_link}" style="display: inline-block; padding: 12px 30px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(17, 24, 39, 0.15);">Log In to Your Account</a>
            </div>
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
              If the button above does not work, copy and paste this URL into your browser:<br>
              <a href="{login_link}" style="color: #4f46e5; text-decoration: none;">{login_link}</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
            &copy; {datetime.utcnow().year} NexBrix. All rights reserved.
          </div>
        </div>
        """
        
        try:
            resend.Emails.send({
                "from": "NexBrix <info@nexbrix.com.au>",
                "to": [user_email],
                "subject": "Onboarding Request Approved | NexBrix",
                "html": email_html
            })
        except Exception as e:
            print(f"Failed to send approval email via Resend: {e}")

    return {"message": "Staff assignment approved and activated."}


@router.post("/api/businesses/{business_id}/pending-staff/{assignment_id}/reject")
def reject_pending_staff(
    business_id: str,
    assignment_id: str,
    data: StaffRejectionDetails,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "staff.write", session=session)

    assignment = session.get(UserAssignment, assignment_id)
    if not assignment or assignment.business_id != business_id:
        raise HTTPException(status_code=404, detail="Pending assignment not found")

    user = assignment.user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_email = user.email
    user_name = user.name or user.email
    user_id = user.id

    # Determine the business name
    business_name = "the business"
    if assignment.business:
        business_name = assignment.business.name
    else:
        biz = session.get(Business, business_id)
        if biz:
            business_name = biz.name

    session.delete(assignment)

    invite = session.exec(
        select(StaffInvitation).where(
            StaffInvitation.registered_user_id == user_id,
            StaffInvitation.status == "waiting_approval"
        )
    ).first()
    if invite:
        invite.status = "completed"
        session.add(invite)

    session.commit()

    # Send email via Resend
    api_key = os.environ.get("RESEND_API_KEY")
    if api_key:
        resend.api_key = api_key
        
        # Determine the client app URL dynamically from the request headers
        origin = request.headers.get("origin")
        if not origin:
            referer = request.headers.get("referer")
            if referer:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
        app_url = origin or os.environ.get("BETTER_AUTH_URL", "http://localhost:3000")
        login_link = f"{app_url}/login"
        
        email_html = f"""
        <div style="font-family: 'Outfit', 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111827; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0;">Onboarding Request Status</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
            <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {user_name},</p>
            <p style="font-size: 16px; line-height: 1.6;">Thank you for your interest in joining <strong>{business_name}</strong>.</p>
            <p style="font-size: 16px; line-height: 1.6;">We regret to inform you that your onboarding request has been declined at this time.</p>
            
            <div style="margin: 20px 0; padding: 15px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
              <p style="font-size: 14px; font-weight: 600; color: #991b1b; margin: 0 0 5px 0;">Reason for rejection:</p>
              <p style="font-size: 14px; color: #7f1d1d; margin: 0; line-height: 1.5; white-space: pre-wrap;">{data.reason}</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">If you believe this is an error or have questions about the decision, please contact the business administrator.</p>
            
            <div style="text-align: center; margin: 35px 0 25px 0;">
              <a href="{login_link}" style="display: inline-block; padding: 12px 30px; background-color: #4b5563; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(75, 85, 99, 0.15);">Go to Login</a>
            </div>
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
              If the button above does not work, copy and paste this URL into your browser:<br>
              <a href="{login_link}" style="color: #4f46e5; text-decoration: none;">{login_link}</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
            &copy; {datetime.utcnow().year} NexBrix. All rights reserved.
          </div>
        </div>
        """
        
        try:
            resend.Emails.send({
                "from": "NexBrix <info@nexbrix.com.au>",
                "to": [user_email],
                "subject": "Onboarding Request Rejected | NexBrix",
                "html": email_html
            })
        except Exception as e:
            print(f"Failed to send rejection email via Resend: {e}")

    return {"message": "Staff assignment rejected and removed."}

