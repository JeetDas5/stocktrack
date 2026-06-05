from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel, func

from app.database import get_session
from app.models import User, Business, UserAssignment
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Businesses"])


class BusinessCreate(SQLModel):
    name: str


class BusinessOut(SQLModel):
    id: str
    name: str
    is_active: bool
    created_at: datetime
    created_by_id: str
    locations_count: int = 0
    items_count: int = 0


@router.post(
    "/api/businesses",
    response_model=Business,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new business",
    description="Registers a new business profile owned by the authenticated user.",
    responses={
        201: {"description": "Business profile successfully created."},
        401: {"description": "Missing or invalid authorization credentials."},
    }
)
def create_business(
    data: BusinessCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **Create a Business**

    - **name**: Desired name of the business brand or company.
    """
    existing = session.exec(
        select(Business).where(
            Business.created_by_id == current_user.id,
            func.lower(Business.name) == data.name.strip().lower()
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A business with the name '{data.name.strip()}' already exists"
        )

    business = Business(name=data.name.strip(), created_by_id=current_user.id)
    session.add(business)
    session.commit()
    session.refresh(business)
    return business


@router.get(
    "/api/businesses",
    response_model=List[BusinessOut],
    summary="List all businesses",
    description="Retrieves a list of all businesses owned/created or assigned to the currently authenticated user.",
    responses={
        200: {"description": "List of owned/assigned businesses successfully retrieved."},
        401: {"description": "Missing or invalid authorization credentials."},
    }
)
def get_businesses(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **List Owned & Assigned Businesses**
    """
    if current_user.role == "super_admin":
        statement = select(Business)
    else:
        statement = select(Business).where(
            (Business.created_by_id == current_user.id) |
            (Business.id.in_(
                select(UserAssignment.business_id).where(
                    UserAssignment.user_id == current_user.id,
                    UserAssignment.is_active == True
                )
            ))
        )
    businesses = session.exec(statement).all()

    out = []
    for b in businesses:
        out.append(BusinessOut(
            id=b.id,
            name=b.name,
            is_active=b.is_active,
            created_at=b.created_at,
            created_by_id=b.created_by_id,
            locations_count=len(b.locations),
            items_count=len(b.stock_items)
        ))
    return out


@router.get(
    "/api/businesses/{business_id}",
    response_model=Business,
    summary="Get business details",
    description="Retrieves structural details for a specific business profile by ID.",
    responses={
        200: {"description": "Business details successfully retrieved."},
        401: {"description": "Missing or invalid authorization credentials."},
        404: {"description": "Business profile not found in database."},
    }
)
def get_business(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **Get Business by ID**

    - **business_id**: Unique identifier of the requested business.
    """
    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    verify_user_permission(current_user, business_id, "view_business", session=session)
    
    return business


