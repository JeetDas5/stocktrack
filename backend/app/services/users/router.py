from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import User, UserAssignment, Business, Location
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


@router.get("/api/users/me", response_model=User)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


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

