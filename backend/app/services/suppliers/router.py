import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel, func

from app.database import get_session
from app.models import User, Supplier, OrderingMethod
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Suppliers"])


class SupplierCreate(SQLModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str
    website: Optional[str] = None
    notes: Optional[str] = None
    ordering_method: Optional[OrderingMethod] = None
    is_active: bool = True


def validate_and_clean_supplier(data: SupplierCreate):
    name = data.name.strip() if data.name else ""
    contact_person = data.contact_person.strip() if data.contact_person else None
    phone = data.phone.strip() if data.phone else None
    email = data.email.strip() if data.email else None
    address_line1 = data.address_line1.strip() if data.address_line1 else ""
    address_line2 = data.address_line2.strip() if data.address_line2 else None
    city = data.city.strip() if data.city else ""
    state_province = data.state_province.strip() if data.state_province else None
    postal_code = data.postal_code.strip() if data.postal_code else None
    country = data.country.strip() if data.country else ""
    website = data.website.strip() if data.website else None
    notes = data.notes.strip() if data.notes else None

    # Enforce required checks
    if not name:
        raise HTTPException(status_code=400, detail="Supplier name is required")
    if not address_line1:
        raise HTTPException(status_code=400, detail="Address Line 1 is required")
    if not city:
        raise HTTPException(status_code=400, detail="City is required")
    if not country:
        raise HTTPException(status_code=400, detail="Country is required")

    # Special character validation
    alphanumeric = re.compile(r"[a-zA-Z0-9]")
    fields_to_check = [
        ("Supplier name", name),
        ("Contact person", contact_person),
        ("Phone number", phone),
        ("Email", email),
        ("Address Line 1", address_line1),
        ("Address Line 2", address_line2),
        ("City", city),
        ("State / Province", state_province),
        ("Postal code", postal_code),
        ("Website", website),
        ("Notes", notes),
    ]
    for label, val in fields_to_check:
        if val and not alphanumeric.search(val):
            raise HTTPException(
                status_code=400,
                detail=f"{label} cannot contain only special characters",
            )

    # Phone validation format if present
    if phone and not re.match(r"^\+?[0-9\s\-()]{5,20}$", phone):
        raise HTTPException(
            status_code=400, detail="Please enter a valid phone number (5 to 20 digits)"
        )

    # Email validation
    if email and not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        raise HTTPException(
            status_code=400, detail="Please enter a valid email address"
        )

    # Website validation
    if website and not re.match(r"^https?://.+\..+", website):
        raise HTTPException(
            status_code=400, detail="Website must start with http:// or https://"
        )

    return {
        "name": name,
        "contact_person": contact_person,
        "phone": phone,
        "email": email,
        "address_line1": address_line1,
        "address_line2": address_line2,
        "city": city,
        "state_province": state_province,
        "postal_code": postal_code,
        "country": country,
        "website": website,
        "notes": notes,
    }


@router.post(
    "/api/businesses/{business_id}/suppliers",
    response_model=Supplier,
    summary="Create a new supplier",
    description="Creates a new supplier for the business.",
    responses={
        201: {"description": "Supplier created successfully."},
        400: {"description": "Invalid request data."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Not authorized to create supplier."},
        404: {"description": "Business not found."},
        409: {"description": "Supplier already exists."},
    },
)
def create_business_supplier(
    business_id: str,
    data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):

    verify_user_permission(
        current_user, business_id, "stock_items.write", session=session
    )

    cleaned = validate_and_clean_supplier(data)

    # Check for duplicate
    existing = session.exec(
        select(Supplier).where(
            Supplier.business_id == business_id,
            func.lower(Supplier.name) == cleaned["name"].lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A supplier with the name '{cleaned['name']}' already exists in this business",
        )

    supplier = Supplier(
        name=cleaned["name"],
        contact_person=cleaned["contact_person"],
        phone=cleaned["phone"],
        email=cleaned["email"],
        address_line1=cleaned["address_line1"],
        address_line2=cleaned["address_line2"],
        city=cleaned["city"],
        state_province=cleaned["state_province"],
        postal_code=cleaned["postal_code"],
        country=cleaned["country"],
        website=cleaned["website"],
        notes=cleaned["notes"],
        ordering_method=data.ordering_method,
        is_active=data.is_active,
        business_id=business_id,
    )
    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    return supplier


@router.get(
    "/api/businesses/{business_id}/suppliers",
    response_model=List[Supplier],
    summary="List all suppliers",
    description="Returns a list of all suppliers for the business.",
    responses={
        200: {"description": "List of suppliers."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Not authorized to view suppliers."},
        404: {"description": "Business not found."},
    },
)
def get_business_suppliers(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):

    verify_user_permission(
        current_user, business_id, "stock_items.read", session=session
    )

    statement = select(Supplier).where(Supplier.business_id == business_id)
    return session.exec(statement).all()


@router.put(
    "/api/businesses/{business_id}/suppliers/{supplier_id}",
    response_model=Supplier,
    summary="Update a supplier",
    description="Updates an existing supplier for the business.",
    responses={
        200: {"description": "Supplier updated successfully."},
        400: {"description": "Invalid request data."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Not authorized to update supplier."},
        404: {"description": "Supplier not found."},
        409: {"description": "Supplier already exists."},
    },
)
def update_business_supplier(
    business_id: str,
    supplier_id: str,
    data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):

    verify_user_permission(
        current_user, business_id, "stock_items.write", session=session
    )

    supplier = session.get(Supplier, supplier_id)
    if not supplier or supplier.business_id != business_id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    cleaned = validate_and_clean_supplier(data)

    # Check for duplicate excluding current
    existing = session.exec(
        select(Supplier).where(
            Supplier.business_id == business_id,
            Supplier.id != supplier_id,
            func.lower(Supplier.name) == cleaned["name"].lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A supplier with the name '{cleaned['name']}' already exists in this business",
        )

    supplier.name = cleaned["name"]
    supplier.contact_person = cleaned["contact_person"]
    supplier.phone = cleaned["phone"]
    supplier.email = cleaned["email"]
    supplier.address_line1 = cleaned["address_line1"]
    supplier.address_line2 = cleaned["address_line2"]
    supplier.city = cleaned["city"]
    supplier.state_province = cleaned["state_province"]
    supplier.postal_code = cleaned["postal_code"]
    supplier.country = cleaned["country"]
    supplier.website = cleaned["website"]
    supplier.notes = cleaned["notes"]
    supplier.ordering_method = data.ordering_method
    supplier.is_active = data.is_active

    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    return supplier


@router.delete(
    "/api/businesses/{business_id}/suppliers/{supplier_id}",
    summary="Delete a supplier",
    description="Deletes an existing supplier from the business.",
    responses={
        200: {"description": "Supplier deleted successfully."},
        401: {"description": "Missing or invalid authorization credentials."},
        403: {"description": "Not authorized to delete supplier."},
        404: {"description": "Supplier not found."},
    },
)
def delete_business_supplier(
    business_id: str,
    supplier_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):

    verify_user_permission(
        current_user, business_id, "stock_items.write", session=session
    )

    supplier = session.get(Supplier, supplier_id)
    if not supplier or supplier.business_id != business_id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    session.delete(supplier)
    session.commit()
    return {"message": "Supplier deleted successfully"}
