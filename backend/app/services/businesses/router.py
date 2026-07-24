from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel, func

from app.database import get_session
from app.models import User, Business, UserAssignment
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Businesses"])


class BusinessCreate(SQLModel):
    name: str
    terms_url: Optional[str] = None
    terms_name: Optional[str] = None


class BusinessUpdate(SQLModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    terms_url: Optional[str] = None
    terms_name: Optional[str] = None


class BusinessOut(SQLModel):
    id: str
    name: str
    is_active: bool
    created_at: datetime
    created_by_id: str
    owner_name: Optional[str] = None
    locations_count: int = 0
    items_count: int = 0
    terms_url: Optional[str] = None
    terms_name: Optional[str] = None


@router.post(
    "/api/businesses",
    response_model=Business,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new business",
    description="Registers a new business profile owned by the authenticated user.",
    responses={
        201: {"description": "Business profile successfully created."},
        401: {"description": "Missing or invalid authorization credentials."},
    },
)
def create_business(
    data: BusinessCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    **Create a Business**

    - **name**: Desired name of the business brand or company.
    - **terms_url**: Optional URL/key to uploaded terms document.
    - **terms_name**: Optional name of uploaded terms document file.
    """
    existing = session.exec(
        select(Business).where(
            Business.created_by_id == current_user.id,
            func.lower(Business.name) == data.name.strip().lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A business with the name '{data.name.strip()}' already exists",
        )

    business = Business(
        name=data.name.strip(),
        created_by_id=current_user.id,
        terms_url=data.terms_url,
        terms_name=data.terms_name,
    )
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
        200: {
            "description": "List of owned/assigned businesses successfully retrieved."
        },
        401: {"description": "Missing or invalid authorization credentials."},
    },
)
def get_businesses(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    **List Owned & Assigned Businesses**
    """
    if current_user.role == "super_admin":
        statement = select(Business)
    else:
        statement = select(Business).where(
            (Business.created_by_id == current_user.id)
            | (
                Business.id.in_(
                    select(UserAssignment.business_id).where(
                        UserAssignment.user_id == current_user.id,
                        UserAssignment.is_active,
                    )
                )
            )
        )
    businesses = session.exec(statement).all()

    out = []
    for b in businesses:
        out.append(
            BusinessOut(
                id=b.id,
                name=b.name,
                is_active=b.is_active,
                created_at=b.created_at,
                created_by_id=b.created_by_id,
                owner_name=b.created_by.name if b.created_by else None,
                locations_count=len(b.locations),
                items_count=len(b.stock_items),
                terms_url=b.terms_url,
                terms_name=b.terms_name,
            )
        )
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
    },
)
def get_business(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    **Get Business by ID**

    - **business_id**: Unique identifier of the requested business.
    """
    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Business not found"
        )

    verify_user_permission(current_user, business_id, "business.read", session=session)

    return business


@router.put(
    "/api/businesses/{business_id}",
    response_model=BusinessOut,
    summary="Update a business",
    description="Updates a business profile (name, status, terms document).",
    responses={
        200: {"description": "Business successfully updated."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Insufficient permissions to update business."},
        404: {"description": "Business profile not found in database."},
    },
)
def update_business(
    business_id: str,
    data: BusinessUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    **Update Business Details**
    """
    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Business not found"
        )

    # Permission check: super_admin or creator or possesses business write permission
    is_owner_or_admin = (
        current_user.role == "super_admin"
        or business.created_by_id == current_user.id
    )
    if not is_owner_or_admin:
        verify_user_permission(current_user, business_id, "business.write", session=session)

    if data.name is not None:
        trimmed_name = data.name.strip()
        if trimmed_name:
            # Check for duplicate name for this creator
            existing = session.exec(
                select(Business).where(
                    Business.created_by_id == business.created_by_id,
                    Business.id != business_id,
                    func.lower(Business.name) == trimmed_name.lower(),
                )
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A business with the name '{trimmed_name}' already exists",
                )
            business.name = trimmed_name

    if data.is_active is not None:
        business.is_active = data.is_active

    if data.terms_url is not None:
        business.terms_url = data.terms_url if data.terms_url != "" else None

    if data.terms_name is not None:
        business.terms_name = data.terms_name if data.terms_name != "" else None

    session.add(business)
    session.commit()
    session.refresh(business)

    return BusinessOut(
        id=business.id,
        name=business.name,
        is_active=business.is_active,
        created_at=business.created_at,
        created_by_id=business.created_by_id,
        owner_name=business.created_by.name if business.created_by else None,
        locations_count=len(business.locations),
        items_count=len(business.stock_items),
        terms_url=business.terms_url,
        terms_name=business.terms_name,
    )

