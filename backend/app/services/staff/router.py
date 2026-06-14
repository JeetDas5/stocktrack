from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
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


class StaffInvitationRegister(SQLModel):
    name: str
    phone: str


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
        status="pending"
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
        invited_by=invited_by_name
    )


@router.post("/api/staff/invitations/{invitation_id}/register")
def register_staff_invitation(
    invitation_id: str,
    data: StaffInvitationRegister,
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


class StaffApprovalDetails(SQLModel):
    role: str
    assignments: List[dict]


@router.post("/api/businesses/{business_id}/pending-staff/{assignment_id}/approve")
def approve_pending_staff(
    business_id: str,
    assignment_id: str,
    data: StaffApprovalDetails,
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

    role = data.role.strip().lower()
    if role not in ["staff", "manager"]:
        raise HTTPException(status_code=400, detail="Role must be either 'staff' or 'manager'")

    if not data.assignments:
        raise HTTPException(status_code=400, detail="At least one business assignment is required")

    user.role = role
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
                    status="active"
                )
                session.add(new_ass)
        else:
            new_ass = UserAssignment(
                user_id=user.id,
                business_id=biz_id,
                location_id=None,
                role=role,
                is_active=True,
                status="active"
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
    return {"message": "Staff assignment approved and activated."}


@router.post("/api/businesses/{business_id}/pending-staff/{assignment_id}/reject")
def reject_pending_staff(
    business_id: str,
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "staff.write", session=session)

    assignment = session.get(UserAssignment, assignment_id)
    if not assignment or assignment.business_id != business_id:
        raise HTTPException(status_code=404, detail="Pending assignment not found")

    session.delete(assignment)

    invite = session.exec(
        select(StaffInvitation).where(
            StaffInvitation.registered_user_id == assignment.user_id,
            StaffInvitation.status == "waiting_approval"
        )
    ).first()
    if invite:
        invite.status = "completed"
        session.add(invite)

    session.commit()
    return {"message": "Staff assignment rejected and removed."}

