from datetime import datetime
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import User, UserAssignment, Business, Location, StaffInvitation
from app.services.auth.dependencies import get_current_user

router = APIRouter(tags=["Users"])


@router.post("/api/users", response_model=User)
def create_user_profile(user_data: User, session: Session = Depends(get_session)):
    existing = session.get(User, user_data.id)
    if existing:
        if user_data.name and existing.name != user_data.name:
            existing.name = user_data.name
        if user_data.email and existing.email != user_data.email:
            existing.email = user_data.email
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    session.add(user_data)
    session.commit()
    session.refresh(user_data)
    return user_data


class UserMeOut(SQLModel):
    id: str
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    role: str
    is_approved: bool
    is_internal: bool
    created_at: datetime
    updated_at: datetime
    start_date: datetime
    image: Optional[str] = None
    
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address_line1: Optional[str] = None
    country: Optional[str] = None
    suburb: Optional[str] = None
    state: Optional[str] = None
    post_code: Optional[str] = None
    driving_license_number: Optional[str] = None
    license_expiry_date: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_email: Optional[str] = None
    tax_file_number: Optional[str] = None
    super_fund_name: Optional[str] = None
    super_fund_member_no: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_bsb: Optional[str] = None
    bank_account_number: Optional[str] = None
    weekly_work_hours: Optional[float] = None
    residency_status: Optional[str] = None
    visa_expiry_date: Optional[str] = None
    employee_id: Optional[str] = None
    position: Optional[str] = None
    reports_to: Optional[str] = None
    employment_type: Optional[str] = None
    modules: List[str] = []


class UserUpdate(SQLModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address_line1: Optional[str] = None
    country: Optional[str] = None
    suburb: Optional[str] = None
    state: Optional[str] = None
    post_code: Optional[str] = None
    driving_license_number: Optional[str] = None
    license_expiry_date: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_email: Optional[str] = None
    tax_file_number: Optional[str] = None
    super_fund_name: Optional[str] = None
    super_fund_member_no: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_bsb: Optional[str] = None
    bank_account_number: Optional[str] = None
    weekly_work_hours: Optional[float] = None
    residency_status: Optional[str] = None
    visa_expiry_date: Optional[str] = None
    # Read-only fields that are updateable only by admins
    employee_id: Optional[str] = None
    position: Optional[str] = None
    reports_to: Optional[str] = None
    employment_type: Optional[str] = None


@router.get("/api/users/me", response_model=UserMeOut)
def get_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role in ("super_admin", "admin"):
        is_approved = True
    else:
        active_assignment = session.exec(
            select(UserAssignment).where(
                UserAssignment.user_id == current_user.id,
                UserAssignment.is_active == True
            )
        ).first()
        is_approved = active_assignment is not None

    return UserMeOut(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        phone=current_user.phone,
        role=current_user.role,
        is_approved=is_approved,
        is_internal=current_user.is_internal,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        start_date=current_user.start_date or current_user.created_at,
        image=current_user.image,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        gender=current_user.gender,
        date_of_birth=current_user.date_of_birth,
        address_line1=current_user.address_line1,
        country=current_user.country,
        suburb=current_user.suburb,
        state=current_user.state,
        post_code=current_user.post_code,
        driving_license_number=current_user.driving_license_number,
        license_expiry_date=current_user.license_expiry_date,
        emergency_contact_name=current_user.emergency_contact_name,
        emergency_contact_relationship=current_user.emergency_contact_relationship,
        emergency_contact_phone=current_user.emergency_contact_phone,
        emergency_contact_email=current_user.emergency_contact_email,
        tax_file_number=current_user.tax_file_number,
        super_fund_name=current_user.super_fund_name,
        super_fund_member_no=current_user.super_fund_member_no,
        bank_account_name=current_user.bank_account_name,
        bank_bsb=current_user.bank_bsb,
        bank_account_number=current_user.bank_account_number,
        weekly_work_hours=current_user.weekly_work_hours,
        residency_status=current_user.residency_status,
        visa_expiry_date=current_user.visa_expiry_date,
        employee_id=current_user.employee_id,
        position=current_user.position,
        reports_to=current_user.reports_to,
        employment_type=current_user.employment_type,
        modules=current_user.modules or []
    )


@router.put("/api/users/me", response_model=UserMeOut)
def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    update_data = data.dict(exclude_unset=True)
    
    # Restrict administrative fields updates for non-admin users
    admin_fields = {"employee_id", "position", "reports_to", "employment_type"}
    is_admin = current_user.role in ("super_admin", "admin")
    
    for field, value in update_data.items():
        if not is_admin and field in admin_fields:
            continue
        setattr(current_user, field, value)
        
    # Keep the user.name and user.phone fields in sync with profile edits
    if "first_name" in update_data or "last_name" in update_data:
        fname = current_user.first_name or ""
        lname = current_user.last_name or ""
        current_user.name = f"{fname} {lname}".strip() or current_user.name
    if "phone" in update_data:
        current_user.phone = update_data["phone"]
        
    current_user.updated_at = datetime.utcnow()
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    if current_user.role in ("super_admin", "admin"):
        is_approved = True
    else:
        active_assignment = session.exec(
            select(UserAssignment).where(
                UserAssignment.user_id == current_user.id,
                UserAssignment.is_active == True
            )
        ).first()
        is_approved = active_assignment is not None
        
    return UserMeOut(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        phone=current_user.phone,
        role=current_user.role,
        is_approved=is_approved,
        is_internal=current_user.is_internal,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        start_date=current_user.start_date or current_user.created_at,
        image=current_user.image,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        gender=current_user.gender,
        date_of_birth=current_user.date_of_birth,
        address_line1=current_user.address_line1,
        country=current_user.country,
        suburb=current_user.suburb,
        state=current_user.state,
        post_code=current_user.post_code,
        driving_license_number=current_user.driving_license_number,
        license_expiry_date=current_user.license_expiry_date,
        emergency_contact_name=current_user.emergency_contact_name,
        emergency_contact_relationship=current_user.emergency_contact_relationship,
        emergency_contact_phone=current_user.emergency_contact_phone,
        emergency_contact_email=current_user.emergency_contact_email,
        tax_file_number=current_user.tax_file_number,
        super_fund_name=current_user.super_fund_name,
        super_fund_member_no=current_user.super_fund_member_no,
        bank_account_name=current_user.bank_account_name,
        bank_bsb=current_user.bank_bsb,
        bank_account_number=current_user.bank_account_number,
        weekly_work_hours=current_user.weekly_work_hours,
        residency_status=current_user.residency_status,
        visa_expiry_date=current_user.visa_expiry_date,
        employee_id=current_user.employee_id,
        position=current_user.position,
        reports_to=current_user.reports_to,
        employment_type=current_user.employment_type,
        modules=current_user.modules or []
    )


@router.get("/api/users/{uid}", response_model=User)
def get_user_profile(
    uid: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


class UserAssignmentCreate(SQLModel):
    email: str
    role: str  # manager, staff, or admin
    location_id: Optional[str] = None
    permissions: List[str] = []

class UserAssignmentUpdate(SQLModel):
    role: Optional[str] = None
    location_id: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None

class UserAssignmentOut(SQLModel):
    id: str
    user_id: str
    user_email: str
    user_name: Optional[str] = None
    business_id: str
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    role: str
    permissions: List[str]
    is_active: bool
    created_at: datetime


@router.post("/api/businesses/{business_id}/users", response_model=UserAssignmentOut)
def create_user_assignment(
    business_id: str,
    data: UserAssignmentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if current_user.role != "super_admin" and business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the business owner or super admin can manage user permissions"
        )

    user_to_assign = session.exec(
        select(User).where(User.email == data.email.strip())
    ).first()
    if not user_to_assign:
        raise HTTPException(
            status_code=404,
            detail=f"User with email '{data.email}' not found"
        )

    if data.location_id:
        loc = session.get(Location, data.location_id)
        if not loc or loc.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid location ID for this business")

    existing = session.exec(
        select(UserAssignment).where(
            UserAssignment.user_id == user_to_assign.id,
            UserAssignment.business_id == business_id,
            UserAssignment.location_id == data.location_id
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Assignment already exists for this user and location"
        )

    assignment = UserAssignment(
        user_id=user_to_assign.id,
        business_id=business_id,
        location_id=data.location_id,
        role=data.role,
        permissions=data.permissions,
        is_active=True
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    location_name = assignment.location.name if assignment.location else None
    return UserAssignmentOut(
        id=assignment.id,
        user_id=assignment.user_id,
        user_email=user_to_assign.email,
        user_name=user_to_assign.name,
        business_id=assignment.business_id,
        location_id=assignment.location_id,
        location_name=location_name,
        role=assignment.role,
        permissions=assignment.permissions,
        is_active=assignment.is_active,
        created_at=assignment.created_at
    )


@router.get("/api/businesses/{business_id}/users", response_model=List[UserAssignmentOut])
def get_user_assignments(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if current_user.role != "super_admin" and business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the business owner or super admin can list user permissions"
        )

    assignments = session.exec(
        select(UserAssignment).where(UserAssignment.business_id == business_id)
    ).all()

    out = []
    for ass in assignments:
        location_name = ass.location.name if ass.location else None
        out.append(UserAssignmentOut(
            id=ass.id,
            user_id=ass.user_id,
            user_email=ass.user.email,
            user_name=ass.user.name,
            business_id=ass.business_id,
            location_id=ass.location_id,
            location_name=location_name,
            role=ass.role,
            permissions=ass.permissions,
            is_active=ass.is_active,
            created_at=ass.created_at
        ))
    return out


@router.put("/api/businesses/{business_id}/users/{assignment_id}", response_model=UserAssignmentOut)
def update_user_assignment(
    business_id: str,
    assignment_id: str,
    data: UserAssignmentUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if current_user.role != "super_admin" and business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the business owner or super admin can edit user permissions"
        )

    assignment = session.get(UserAssignment, assignment_id)
    if not assignment or assignment.business_id != business_id:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if data.role is not None:
        assignment.role = data.role
    if data.location_id is not None:
        if data.location_id:
            loc = session.get(Location, data.location_id)
            if not loc or loc.business_id != business_id:
                raise HTTPException(status_code=400, detail="Invalid location ID for this business")
        assignment.location_id = data.location_id
    if data.permissions is not None:
        assignment.permissions = data.permissions
    if data.is_active is not None:
        assignment.is_active = data.is_active

    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    location_name = assignment.location.name if assignment.location else None
    return UserAssignmentOut(
        id=assignment.id,
        user_id=assignment.user_id,
        user_email=assignment.user.email,
        user_name=assignment.user.name,
        business_id=assignment.business_id,
        location_id=assignment.location_id,
        location_name=location_name,
        role=assignment.role,
        permissions=assignment.permissions,
        is_active=assignment.is_active,
        created_at=assignment.created_at
    )


@router.delete("/api/businesses/{business_id}/users/{assignment_id}")
def delete_user_assignment(
    business_id: str,
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if current_user.role != "super_admin" and business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the business owner or super admin can delete user permissions"
        )

    assignment = session.get(UserAssignment, assignment_id)
    if not assignment or assignment.business_id != business_id:
        raise HTTPException(status_code=404, detail="Assignment not found")

    session.delete(assignment)
    session.commit()
    return {"message": "User assignment deleted successfully"}


@router.get("/api/super-admin/users", response_model=List[UserMeOut])
def list_all_users_for_super_admin(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can access this resource")
    
    users = session.exec(select(User)).all()
    out = []
    for u in users:
        out.append(UserMeOut(
            id=u.id,
            email=u.email,
            name=u.name,
            phone=u.phone,
            role=u.role,
            is_approved=True,
            is_internal=u.is_internal,
            created_at=u.created_at,
            updated_at=u.updated_at,
            start_date=u.start_date or u.created_at,
            modules=u.modules or []
        ))
    return out


class SuperAdminInvitationCreate(SQLModel):
    email: str
    modules: List[str]


@router.post("/api/super-admin/invitations")
def create_owner_invitation(
    data: SuperAdminInvitationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can access this resource")
        
    import resend
    import uuid
    from datetime import datetime, timedelta
    
    # Check if a user with this email already exists
    existing_user = session.exec(select(User).where(User.email == data.email.lower().strip())).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists"
        )
        
    expires_at = datetime.utcnow() + timedelta(days=7)
    invite = StaffInvitation(
        id=str(uuid.uuid4()),
        created_by_id=current_user.id,
        business_id=None,
        role="admin",  # Owner
        assignments_json=[],
        expires_at=expires_at,
        status="pending",
        email=data.email.lower().strip(),
        modules=data.modules
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)
    
    # Send email via Resend
    api_key = os.environ.get("RESEND_API_KEY")
    app_url = os.environ.get("BETTER_AUTH_URL", "http://localhost:3000")
    signup_link = f"{app_url}/signup?token={invite.id}"
    
    if api_key:
        resend.api_key = api_key
        try:
            resend.Emails.send(
                {
                    "from": "NexBrix <info@nexbrix.com.au>",
                    "to": [data.email],
                    "subject": "Invitation to join NexBrix | NexBrix",
                    "html": f"""
                    <p>You have been invited to join NexBrix as an Owner.</p>
                    <p>Please use the following link to register your account and configure your business:</p>
                    <p><a href="{signup_link}" style="display:inline-block;padding:10px 20px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:5px;">Accept Invitation</a></p>
                    <p>Or copy and paste this link in your browser:</p>
                    <p>{signup_link}</p>
                    <p>This invitation link will expire in 7 days.</p>
                    """,
                }
            )
        except Exception as e:
            print(f"Failed to send owner invitation email: {e}")
            
    return {
        "id": invite.id,
        "email": invite.email,
        "modules": invite.modules,
        "expires_at": invite.expires_at,
        "signup_link": signup_link
    }


@router.get("/api/super-admin/invitations")
def list_super_admin_invitations(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can access this resource")
        
    invites = session.exec(
        select(StaffInvitation)
        .where(StaffInvitation.role == "admin")
        .order_by(StaffInvitation.created_at.desc())
    ).all()
    
    app_url = os.environ.get("BETTER_AUTH_URL", "http://localhost:3000")
    
    return [
        {
            "id": i.id,
            "email": i.email,
            "modules": i.modules,
            "expires_at": i.expires_at,
            "created_at": i.created_at,
            "status": "expired" if i.status == "pending" and i.expires_at < datetime.utcnow() else i.status,
            "signup_link": f"{app_url}/signup?token={i.id}"
        }
        for i in invites
    ]


@router.delete("/api/super-admin/invitations/{invitation_id}")
def delete_super_admin_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can access this resource")
        
    invite = session.get(StaffInvitation, invitation_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
        
    session.delete(invite)
    session.commit()
    return {"message": "Invitation deleted successfully"}

