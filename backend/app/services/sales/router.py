from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import (
    User, Business, StockItem, Location, Sale, SaleItem, SaleStatus,
    StockItemLocation
)
from app.services.auth.dependencies import get_current_user


router = APIRouter(tags=["Sales"])


class SaleItemCreate(SQLModel):
    recipe_id: str
    quantity: float
    unit_price: float
    discount_percentage: float = 0.0


class SaleCreate(SQLModel):
    sale_date: str
    location_id: Optional[str] = None
    customer_name: Optional[str] = "Walk-in Customer"
    payment_method: Optional[str] = "Cash"
    reference: Optional[str] = None
    remarks: Optional[str] = None
    status: SaleStatus = SaleStatus.draft
    tax_rate: float = 5.0
    items: List[SaleItemCreate]



class SaleUpdate(SQLModel):
    remarks: Optional[str] = None
    status: Optional[SaleStatus] = None


@router.post("/api/businesses/{business_id}/sales")
def create_sale(
    business_id: str,
    data: SaleCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    if data.location_id:
        loc = session.get(Location, data.location_id)
        if not loc or loc.business_id != business_id:
            raise HTTPException(status_code=404, detail="Location not found")

    sale_count = len(session.exec(select(Sale).where(
        Sale.business_id == business_id)).all())
    sale_number = f"SALE-{datetime.utcnow().strftime('%y%m%d')}-{sale_count + 1:03d}"

    subtotal_amount = sum(item.quantity * item.unit_price for item in data.items)
    discount_amount = sum(
        item.quantity * item.unit_price * (item.discount_percentage / 100.0)
        for item in data.items
    )
    taxable_amount = subtotal_amount - discount_amount
    tax_amount = round(taxable_amount * (data.tax_rate / 100.0), 2)
    total_amount = taxable_amount + tax_amount

    sale = Sale(
        business_id=business_id,
        location_id=data.location_id,
        sale_number=sale_number,
        sale_date=data.sale_date,
        customer_name=data.customer_name,
        payment_method=data.payment_method,
        reference=data.reference,
        remarks=data.remarks,
        status=data.status,
        tax_rate=data.tax_rate,
        subtotal_amount=subtotal_amount,
        tax_amount=tax_amount,
        discount_amount=discount_amount,
        total_amount=total_amount,
        created_by_id=current_user.id
    )

    session.add(sale)
    session.commit()
    session.refresh(sale)

    for item in data.items:
        recipe = session.get(Recipe, item.recipe_id)
        if not recipe or recipe.business_id != business_id:
            continue

        if data.status == SaleStatus.completed:
            for ing in recipe.ingredients:
                stock_item = session.get(StockItem, ing.item_id)
                if not stock_item or stock_item.business_id != business_id:
                    continue

                decrement_qty = (item.quantity * ing.qty_used) / recipe.yield_qty
                stock_item.current_stock -= decrement_qty
                session.add(stock_item)

                if data.location_id:
                    sil = session.exec(
                        select(StockItemLocation)
                        .where(StockItemLocation.stock_item_id == ing.item_id)
                        .where(StockItemLocation.location_id == data.location_id)
                    ).first()
                    if sil:
                        sil.current_stock -= decrement_qty
                        session.add(sil)

        item_total = (item.quantity * item.unit_price) * (1.0 - (item.discount_percentage / 100.0))

        sale_item = SaleItem(
            sale_id=sale.id,
            recipe_id=item.recipe_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_percentage=item.discount_percentage,
            total_amount=item_total
        )
        session.add(sale_item)

    session.commit()
    session.refresh(sale)

    return sale


@router.get("/api/businesses/{business_id}/sales")
def get_sales(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    sales = session.exec(
        select(Sale)
        .where(Sale.business_id == business_id)
        .order_by(Sale.created_at.desc())
    ).all()

    out = []
    for s in sales:
        out.append({
            "id": s.id,
            "sale_number": s.sale_number,
            "sale_date": s.sale_date,
            "location_id": s.location_id,
            "location_name": s.location.name if s.location else "Unknown Location",
            "customer_name": s.customer_name,
            "payment_method": s.payment_method,
            "status": s.status,
            "reference": s.reference,
            "remarks": s.remarks,
            "tax_rate": s.tax_rate,
            "subtotal_amount": s.subtotal_amount,
            "tax_amount": s.tax_amount,
            "discount_amount": s.discount_amount,
            "total_amount": s.total_amount,
            "items_count": len(s.items)
        })

    return out


@router.get("/api/businesses/{business_id}/sales/{sale_id}")
def get_sale(
    business_id: str,
    sale_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    s = session.get(Sale, sale_id)
    if not s or s.business_id != business_id:
        raise HTTPException(status_code=404, detail="Sale not found")

    items_out = []
    for i in s.items:
        items_out.append({
            "id": i.id,
            "recipe_id": i.recipe_id,
            "recipe_name": i.recipe.recipe_name if i.recipe else "Unknown Recipe",
            "recipe_code": i.recipe.recipe_code if i.recipe else "",
            "quantity": i.quantity,
            "unit_price": i.unit_price,
            "discount_percentage": i.discount_percentage,
            "total_amount": i.total_amount
        })

    return {
        "id": s.id,
        "sale_number": s.sale_number,
        "sale_date": s.sale_date,
        "location_id": s.location_id,
        "location_name": s.location.name if s.location else "Unknown Location",
        "customer_name": s.customer_name,
        "payment_method": s.payment_method,
        "status": s.status,
        "reference": s.reference,
        "remarks": s.remarks,
        "tax_rate": s.tax_rate,
        "subtotal_amount": s.subtotal_amount,
        "tax_amount": s.tax_amount,
        "discount_amount": s.discount_amount,
        "total_amount": s.total_amount,
        "items": items_out
    }


@router.put("/api/businesses/{business_id}/sales/{sale_id}")
def update_sale(
    business_id: str,
    sale_id: str,
    data: SaleUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    sale = session.get(Sale, sale_id)
    if not sale or sale.business_id != business_id:
        raise HTTPException(status_code=404, detail="Sale not found")

    if data.remarks is not None:
        sale.remarks = data.remarks

    if data.status is not None:
        if data.status == SaleStatus.completed and sale.status == SaleStatus.draft:
            for item in sale.items:
                recipe = session.get(Recipe, item.recipe_id)
                if recipe and recipe.business_id == business_id:
                    for ing in recipe.ingredients:
                        stock_item = session.get(StockItem, ing.item_id)
                        if stock_item and stock_item.business_id == business_id:
                            decrement_qty = (item.quantity * ing.qty_used) / recipe.yield_qty
                            stock_item.current_stock -= decrement_qty
                            session.add(stock_item)

                            if sale.location_id:
                                sil = session.exec(
                                    select(StockItemLocation)
                                    .where(StockItemLocation.stock_item_id == ing.item_id)
                                    .where(StockItemLocation.location_id == sale.location_id)
                                ).first()
                                if sil:
                                    sil.current_stock -= decrement_qty
                                    session.add(sil)

        sale.status = data.status

    session.add(sale)
    session.commit()
    session.refresh(sale)

    return sale
