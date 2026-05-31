from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import (
    User, Business, StockItem, PurchaseOrder, PurchaseOrderStatus,
    Delivery, DeliveryItem, DeliveryStatus
)
from app.services.auth.dependencies import get_current_user

router = APIRouter(tags=["Deliveries"])


class DeliveryItemCreate(SQLModel):
    stock_item_id: str
    ordered_quantity: float
    received_quantity: float
    unit_cost: float


class DeliveryCreate(SQLModel):
    purchase_order_id: str
    items: List[DeliveryItemCreate]
    notes: Optional[str] = None


@router.post("/api/businesses/{business_id}/deliveries")
def create_delivery(
    business_id: str,
    data: DeliveryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    po = session.get(PurchaseOrder, data.purchase_order_id)
    if not po or po.business_id != business_id:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status != PurchaseOrderStatus.sent:
        raise HTTPException(
            status_code=400, detail="Deliveries can only be received against sent purchase orders")

    delivery_count = len(session.exec(select(Delivery).where(
        Delivery.business_id == business_id)).all())
    delivery_number = f"DEL-{datetime.utcnow().strftime('%y%m%d')}-{delivery_count + 1:03d}"

    any_received = any(item.received_quantity > 0 for item in data.items)
    all_fully_received = all(item.received_quantity == item.ordered_quantity for item in data.items)

    if not any_received:
        status_val = DeliveryStatus.missing
    elif all_fully_received:
        status_val = DeliveryStatus.received
    else:
        status_val = DeliveryStatus.partially_received

    total_amount = sum(item.received_quantity * item.unit_cost for item in data.items)

    delivery = Delivery(
        business_id=business_id,
        supplier_id=po.supplier_id,
        purchase_order_id=po.id,
        delivery_number=delivery_number,
        status=status_val,
        notes=data.notes,
        total_amount=total_amount,
        received_by_id=current_user.id
    )
    session.add(delivery)
    session.commit()
    session.refresh(delivery)

    for item in data.items:
        stock_item = session.get(StockItem, item.stock_item_id)
        if not stock_item or stock_item.business_id != business_id:
            continue

        if po.location_id:
            sil = session.exec(
                select(StockItemLocation)
                .where(StockItemLocation.stock_item_id == item.stock_item_id)
                .where(StockItemLocation.location_id == po.location_id)
            ).first()
            if not sil:
                sil = StockItemLocation(
                    stock_item_id=item.stock_item_id,
                    location_id=po.location_id,
                    storage_capacity=100.0,
                    current_stock=item.received_quantity
                )
            else:
                sil.current_stock += item.received_quantity
            session.add(sil)

        del_item = DeliveryItem(
            delivery_id=delivery.id,
            stock_item_id=item.stock_item_id,
            ordered_quantity=item.ordered_quantity,
            received_quantity=item.received_quantity,
            unit_cost=item.unit_cost,
            total_cost=item.received_quantity * item.unit_cost
        )
        session.add(del_item)

    po.status = PurchaseOrderStatus.completed
    session.add(po)

    session.commit()
    session.refresh(delivery)

    return delivery


@router.get("/api/businesses/{business_id}/deliveries")
def get_deliveries(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    deliveries = session.exec(select(Delivery).where(
        Delivery.business_id == business_id).order_by(Delivery.delivery_date.desc())).all()

    out = []
    for d in deliveries:
        out.append({
            "id": d.id,
            "delivery_number": d.delivery_number,
            "po_number": d.purchase_order.po_number if d.purchase_order else "Unknown PO",
            "purchase_order_id": d.purchase_order_id,
            "supplier_id": d.supplier_id,
            "supplier_name": d.supplier.name if d.supplier else "Unknown Supplier",
            "status": d.status,
            "delivery_date": d.delivery_date,
            "total_amount": d.total_amount,
            "notes": d.notes,
            "items_count": len(d.items)
        })

    return out


@router.get("/api/businesses/{business_id}/deliveries/{delivery_id}")
def get_delivery(
    business_id: str,
    delivery_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    d = session.get(Delivery, delivery_id)
    if not d or d.business_id != business_id:
        raise HTTPException(status_code=404, detail="Delivery not found")

    items_out = []
    for i in d.items:
        items_out.append({
            "id": i.id,
            "stock_item_id": i.stock_item_id,
            "stock_item_name": i.stock_item.name if i.stock_item else "Unknown Item",
            "sku": i.stock_item.sku if i.stock_item else "",
            "ordered_quantity": i.ordered_quantity,
            "received_quantity": i.received_quantity,
            "unit_cost": i.unit_cost,
            "total_cost": i.total_cost
        })

    return {
        "id": d.id,
        "delivery_number": d.delivery_number,
        "po_number": d.purchase_order.po_number if d.purchase_order else "Unknown PO",
        "purchase_order_id": d.purchase_order_id,
        "supplier_id": d.supplier_id,
        "supplier_name": d.supplier.name if d.supplier else "Unknown Supplier",
        "status": d.status,
        "delivery_date": d.delivery_date,
        "total_amount": d.total_amount,
        "notes": d.notes,
        "items": items_out
    }
