from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel, func

from app.database import get_session
from app.models import User, Business, Location
from app.services.auth.dependencies import get_current_user, verify_user_permission, get_allowed_locations

router = APIRouter(tags=["Locations"])


class LocationCreate(SQLModel):
    name: str
    description: Optional[str] = None
    type: str = "store"
    address: Optional[str] = None
    is_active: bool = True


@router.post(
    "/api/businesses/{business_id}/locations",
    response_model=Location,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new location",
    description="Creates a new physical or virtual location (e.g. warehouse, retail store) under a specific business.",
    responses={
        201: {"description": "Location successfully created."},
        400: {"description": "Invalid input data supplied."},
        403: {"description": "User is not authorized to edit this business."},
        404: {"description": "Target business profile not found."},
    }
)
def create_business_location(
    business_id: str,
    data: LocationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **Create Location**

    - **business_id**: The unique identifier of the parent business.
    - **data**: Location attributes (name, description, type, address, active status).
    """

    verify_user_permission(current_user, business_id, "manage_locations", session=session)

    existing = session.exec(
        select(Location).where(
            Location.business_id == business_id,
            func.lower(Location.name) == data.name.strip().lower()
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409, detail=f"A location with the name '{data.name.strip()}' already exists in this business")

    location = Location(
        name=data.name.strip(),
        description=data.description,
        type=data.type,
        address=data.address,
        is_active=data.is_active,
        business_id=business_id
    )
    session.add(location)
    session.commit()
    session.refresh(location)
    return location


@router.get(
    "/api/businesses/{business_id}/locations",
    response_model=List[Location],
    summary="List all locations",
    description="Retrieves all operational locations mapped under the designated business.",
    responses={
        200: {"description": "List of locations successfully retrieved."},
        403: {"description": "User is not authorized to access this business."},
        404: {"description": "Target business profile not found."},
    }
)
def get_business_locations(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **List Locations**

    - **business_id**: The unique identifier of the parent business.
    """

    allowed_locs = get_allowed_locations(current_user, business_id, "view_locations", session)

    statement = select(Location).where(Location.business_id == business_id)
    if allowed_locs is not None:
        statement = statement.where(Location.id.in_(allowed_locs))
    return session.exec(statement).all()


@router.put(
    "/api/businesses/{business_id}/locations/{location_id}",
    response_model=Location,
    summary="Update a location",
    description="Updates structural attributes (name, type, address, etc.) for a specific location within a business.",
    responses={
        200: {"description": "Location details successfully updated."},
        403: {"description": "User is not authorized to edit this business."},
        404: {"description": "Business or location profile not found."},
    }
)
def update_business_location(
    business_id: str,
    location_id: str,
    data: LocationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **Update Location**

    - **business_id**: The unique identifier of the parent business.
    - **location_id**: The unique identifier of the location to update.
    - **data**: Structural fields to write.
    """
    verify_user_permission(current_user, business_id, "manage_locations", location_id=location_id, session=session)

    location = session.get(Location, location_id)
    if not location or location.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    existing = session.exec(
        select(Location).where(
            Location.business_id == business_id,
            Location.id != location_id,
            func.lower(Location.name) == data.name.strip().lower()
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409, detail=f"A location with the name '{data.name.strip()}' already exists in this business")

    location.name = data.name.strip()
    location.description = data.description
    location.type = data.type
    location.address = data.address
    location.is_active = data.is_active

    session.add(location)
    session.commit()
    session.refresh(location)
    return location


@router.delete(
    "/api/businesses/{business_id}/locations/{location_id}",
    summary="Delete a location",
    description="Removes a specific location from the database records of a business.",
    responses={
        200: {"description": "Location successfully deleted."},
        403: {"description": "User is not authorized to edit this business."},
        404: {"description": "Business or location profile not found."},
    }
)
def delete_business_location(
    business_id: str,
    location_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **Delete Location**

    - **business_id**: The unique identifier of the parent business.
    - **location_id**: The unique identifier of the location to delete.
    """
    verify_user_permission(current_user, business_id, "manage_locations", location_id=location_id, session=session)

    location = session.get(Location, location_id)
    if not location or location.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    session.delete(location)
    session.commit()
    return {"message": "Location deleted successfully"}


@router.get(
    "/api/businesses/{business_id}/locations/{location_id}",
    response_model=Location,
    summary="Get location details",
    description="Retrieves metadata details for a specific location within a business.",
    responses={
        200: {"description": "Location details successfully retrieved."},
        403: {"description": "User is not authorized to access this business."},
        404: {"description": "Business or location profile not found."},
    }
)
def get_location(
    business_id: str,
    location_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **Get Location Details**

    - **business_id**: The unique identifier of the parent business.
    - **location_id**: The unique identifier of the target location.
    """
    verify_user_permission(current_user, business_id, "view_locations", location_id=location_id, session=session)

    location = session.get(Location, location_id)
    if not location or location.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location

