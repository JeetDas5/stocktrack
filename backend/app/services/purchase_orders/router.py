from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import (
    User, Business, Location, StockItem, Supplier, StockItemLocation,
    PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus
)
from app.services.auth.dependencies import get_current_user

router = APIRouter(tags=["Purchase Orders"])


class PurchaseOrderItemCreate(SQLModel):
    stock_item_id: str
    quantity: float
    unit_cost: float


class PurchaseOrderCreate(SQLModel):
    supplier_id: str
    location_id: Optional[str] = None
    items: List[PurchaseOrderItemCreate]
    notes: Optional[str] = None


class PurchaseOrderUpdate(SQLModel):
    status: Optional[PurchaseOrderStatus] = None
    notes: Optional[str] = None
    location_id: Optional[str] = None
    items: Optional[List[PurchaseOrderItemCreate]] = None


@router.get("/api/businesses/{business_id}/refill-suggestions")
def get_refill_suggestions(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    items = session.exec(select(StockItem).where(
        StockItem.business_id == business_id).where(StockItem.is_active == True)).all()
    suggestions = []

    for item in items:
        category_name = item.category.name if item.category else "Others"
        supplier_name = item.supplier.name if item.supplier else "No Supplier"
        supplier_id = item.supplier_id
        cost = item.cost_per_base_unit or 0.0

        rules = session.exec(select(StockItemLocation).where(
            StockItemLocation.stock_item_id == item.id)).all()
        if rules:
            for r in rules:
                loc = session.get(Location, r.location_id)
                loc_name = loc.name if loc else "Unknown Location"

                current = r.current_stock
                capacity = r.storage_capacity
                reorder = r.reorder_level

                to_refill = max(0.0, reorder - current)
                est_cost = to_refill * cost
                suggestions.append({
                    "stock_item_id": item.id,
                    "stock_item_name": item.name,
                    "sku": item.sku or "",
                    "category_name": category_name,
                    "supplier_id": supplier_id,
                    "supplier_name": supplier_name,
                    "location_id": r.location_id,
                    "location_name": loc_name,
                    "current_stock": current,
                    "capacity": capacity,
                    "reorder_level": reorder,
                    "to_refill": to_refill,
                    "cost_per_base_unit": cost,
                    "est_cost": est_cost
                })
        else:
            current = 0.0
            capacity = 0.0
            reorder = 0.0

            to_refill = max(0.0, reorder - current)
            est_cost = to_refill * cost
            suggestions.append({
                "stock_item_id": item.id,
                "stock_item_name": item.name,
                "sku": item.sku or "",
                "category_name": category_name,
                "supplier_id": supplier_id,
                "supplier_name": supplier_name,
                "location_id": None,
                "location_name": "No Location",
                "current_stock": current,
                "capacity": capacity,
                "reorder_level": reorder,
                "to_refill": to_refill,
                "cost_per_base_unit": cost,
                "est_cost": est_cost
            })

    return suggestions


@router.post("/api/businesses/{business_id}/purchase-orders")
def create_purchase_order(
    business_id: str,
    data: PurchaseOrderCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    supplier = session.get(Supplier, data.supplier_id)
    if not supplier or supplier.business_id != business_id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    location_id = None
    if data.location_id:
        loc = session.get(Location, data.location_id)
        if not loc or loc.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid location ID")
        location_id = data.location_id

    po_count = len(session.exec(select(PurchaseOrder).where(
        PurchaseOrder.business_id == business_id)).all())
    po_number = f"PO-{datetime.utcnow().strftime('%Y%m%d')}-{po_count + 1:03d}"

    po = PurchaseOrder(
        business_id=business_id,
        supplier_id=data.supplier_id,
        location_id=location_id,
        po_number=po_number,
        status=PurchaseOrderStatus.draft,
        created_by_id=current_user.id,
        notes=data.notes,
        total_amount=0.0
    )
    session.add(po)
    session.commit()
    session.refresh(po)

    total_amount = 0.0
    for item in data.items:
        stock_item = session.get(StockItem, item.stock_item_id)
        if not stock_item or stock_item.business_id != business_id:
            continue

        total_cost = item.quantity * item.unit_cost
        total_amount += total_cost

        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            stock_item_id=item.stock_item_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            total_cost=total_cost
        )
        session.add(po_item)

    po.total_amount = total_amount
    session.add(po)
    session.commit()
    session.refresh(po)

    return po


@router.get("/api/businesses/{business_id}/purchase-orders")
def get_purchase_orders(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    orders = session.exec(select(PurchaseOrder).where(
        PurchaseOrder.business_id == business_id).order_by(PurchaseOrder.created_at.desc())).all()

    out = []
    for po in orders:
        items_out = []
        for i in po.items:
            items_out.append({
                "id": i.id,
                "stock_item_id": i.stock_item_id,
                "stock_item_name": i.stock_item.name if i.stock_item else "Unknown Item",
                "sku": i.stock_item.sku if i.stock_item else "",
                "quantity": i.quantity,
                "unit_cost": i.unit_cost,
                "total_cost": i.total_cost
            })

        out.append({
            "id": po.id,
            "po_number": po.po_number,
            "supplier_id": po.supplier_id,
            "supplier_name": po.supplier.name if po.supplier else "Unknown Supplier",
            "location_id": po.location_id,
            "location_name": po.location.name if po.location else "All Locations",
            "status": po.status,
            "created_at": po.created_at,
            "total_amount": po.total_amount,
            "notes": po.notes,
            "items": items_out
        })

    return out


@router.get("/api/businesses/{business_id}/purchase-orders/{po_id}")
def get_purchase_order(
    business_id: str,
    po_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    po = session.get(PurchaseOrder, po_id)
    if not po or po.business_id != business_id:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    items_out = []
    for i in po.items:
        items_out.append({
            "id": i.id,
            "stock_item_id": i.stock_item_id,
            "stock_item_name": i.stock_item.name if i.stock_item else "Unknown Item",
            "sku": i.stock_item.sku if i.stock_item else "",
            "quantity": i.quantity,
            "unit_cost": i.unit_cost,
            "total_cost": i.total_cost
        })

    return {
        "id": po.id,
        "po_number": po.po_number,
        "supplier_id": po.supplier_id,
        "supplier_name": po.supplier.name if po.supplier else "Unknown Supplier",
        "location_id": po.location_id,
        "location_name": po.location.name if po.location else "All Locations",
        "status": po.status,
        "created_at": po.created_at,
        "total_amount": po.total_amount,
        "notes": po.notes,
        "items": items_out
    }


@router.put("/api/businesses/{business_id}/purchase-orders/{po_id}")
def update_purchase_order(
    business_id: str,
    po_id: str,
    data: PurchaseOrderUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    po = session.get(PurchaseOrder, po_id)
    if not po or po.business_id != business_id:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if data.status is not None:
        if data.status == PurchaseOrderStatus.completed:
            raise HTTPException(
                status_code=400,
                detail="Purchase orders can only be marked completed by receiving a delivery against them"
            )
        po.status = data.status

    if data.notes is not None:
        po.notes = data.notes

    if data.location_id is not None:
        if data.location_id == "":
            po.location_id = None
        else:
            loc = session.get(Location, data.location_id)
            if not loc or loc.business_id != business_id:
                raise HTTPException(status_code=400, detail="Invalid location ID")
            po.location_id = data.location_id

    if data.items is not None:
        for i in po.items:
            session.delete(i)

        total_amount = 0.0
        for item in data.items:
            stock_item = session.get(StockItem, item.stock_item_id)
            if not stock_item or stock_item.business_id != business_id:
                continue

            total_cost = item.quantity * item.unit_cost
            total_amount += total_cost

            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                stock_item_id=item.stock_item_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                total_cost=total_cost
            )
            session.add(po_item)

        po.total_amount = total_amount

    session.add(po)
    session.commit()
    session.refresh(po)

    return po


@router.delete("/api/businesses/{business_id}/purchase-orders/{po_id}")
def delete_purchase_order(
    business_id: str,
    po_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    po = session.get(PurchaseOrder, po_id)
    if not po or po.business_id != business_id:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    session.delete(po)
    session.commit()
    return {"message": "Purchase order deleted successfully"}
