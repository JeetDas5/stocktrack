from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import User, Business, Supplier, OrderingMethod
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


@router.post("/api/businesses/{business_id}/suppliers", response_model=Supplier)
def create_business_supplier(
    business_id: str,
    data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):

    verify_user_permission(current_user, business_id, "manage_stock_items", session=session)

    supplier = Supplier(
        name=data.name,
        contact_person=data.contact_person,
        phone=data.phone,
        email=data.email,
        address_line1=data.address_line1,
        address_line2=data.address_line2,
        city=data.city,
        state_province=data.state_province,
        postal_code=data.postal_code,
        country=data.country,
        website=data.website,
        notes=data.notes,
        ordering_method=data.ordering_method,
        is_active=data.is_active,
        business_id=business_id
    )
    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    return supplier


@router.get("/api/businesses/{business_id}/suppliers", response_model=List[Supplier])
def get_business_suppliers(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):

    verify_user_permission(current_user, business_id, "view_stock_items", session=session)

    statement = select(Supplier).where(Supplier.business_id == business_id)
    return session.exec(statement).all()


@router.put("/api/businesses/{business_id}/suppliers/{supplier_id}", response_model=Supplier)
def update_business_supplier(
    business_id: str,
    supplier_id: str,
    data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):

    verify_user_permission(current_user, business_id, "manage_stock_items", session=session)

    supplier = session.get(Supplier, supplier_id)
    if not supplier or supplier.business_id != business_id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    supplier.name = data.name
    supplier.contact_person = data.contact_person
    supplier.phone = data.phone
    supplier.email = data.email
    supplier.address_line1 = data.address_line1
    supplier.address_line2 = data.address_line2
    supplier.city = data.city
    supplier.state_province = data.state_province
    supplier.postal_code = data.postal_code
    supplier.country = data.country
    supplier.website = data.website
    supplier.notes = data.notes
    supplier.ordering_method = data.ordering_method
    supplier.is_active = data.is_active

    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    return supplier


@router.delete("/api/businesses/{business_id}/suppliers/{supplier_id}")
def delete_business_supplier(
    business_id: str,
    supplier_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):

    verify_user_permission(current_user, business_id, "manage_stock_items", session=session)

    supplier = session.get(Supplier, supplier_id)
    if not supplier or supplier.business_id != business_id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    session.delete(supplier)
    session.commit()
    return {"message": "Supplier deleted successfully"}
