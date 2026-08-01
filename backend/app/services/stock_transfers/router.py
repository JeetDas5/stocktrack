import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel
from sqlalchemy.orm import selectinload

from app.database import get_session
from app.models import (
    User, Location, StockItem, StockItemLocation,
    StockTransfer, StockTransferItem, StockTransferStatus
)
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Stock Transfers"])


class TransferItemCreate(SQLModel):
    stock_item_id: str
    dispatched_qty: float


class TransferDispatchCreate(SQLModel):
    from_location_id: str
    to_location_id: str
    notes: Optional[str] = None
    items: List[TransferItemCreate]


class TransferItemReceive(SQLModel):
    stock_item_id: str
    received_qty: float


class TransferReceiveRequest(SQLModel):
    items: Optional[List[TransferItemReceive]] = None
    notes: Optional[str] = None


@router.post(
    "/api/businesses/{business_id}/stock-transfers/dispatch",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Dispatch stock transfer",
    description="Initiates a 2-step in-transit stock transfer. Validates available stock at source location and decrements source stock immediately.",
)
def dispatch_stock_transfer(
    business_id: str,
    data: TransferDispatchCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "stock_transfers.write", session=session)

    if data.from_location_id == data.to_location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source location and destination location cannot be the same"
        )

    from_loc = session.get(Location, data.from_location_id)
    to_loc = session.get(Location, data.to_location_id)

    if not from_loc or not to_loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source or destination location not found"
        )

    if not data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer must include at least one item"
        )

    # 1. Validate stock availability at source location
    source_stock_map = {}
    for item in data.items:
        if item.dispatched_qty <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dispatched quantity must be greater than zero"
            )

        stock_item = session.get(StockItem, item.stock_item_id)
        if not stock_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock item '{item.stock_item_id}' not found"
            )

        sil = session.exec(
            select(StockItemLocation).where(
                StockItemLocation.stock_item_id == item.stock_item_id,
                StockItemLocation.location_id == data.from_location_id
            )
        ).first()

        current_available = sil.current_stock if sil else 0.0
        if current_available < item.dispatched_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{stock_item.name}'. Available: {current_available}, Requested: {item.dispatched_qty}"
            )
        source_stock_map[item.stock_item_id] = (sil, stock_item)

    # 2. Decrement stock at source location & build transfer record
    transfer_num = f"TRF-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    transfer = StockTransfer(
        transfer_number=transfer_num,
        business_id=business_id,
        from_location_id=data.from_location_id,
        to_location_id=data.to_location_id,
        status=StockTransferStatus.in_transit,
        dispatched_by_id=current_user.id,
        dispatched_at=datetime.utcnow(),
        notes=data.notes
    )
    session.add(transfer)
    session.flush()

    for item in data.items:
        sil, stock_item = source_stock_map[item.stock_item_id]
        sil.current_stock -= item.dispatched_qty
        session.add(sil)

        transfer_item = StockTransferItem(
            transfer_id=transfer.id,
            stock_item_id=item.stock_item_id,
            dispatched_qty=item.dispatched_qty,
            unit_cost=stock_item.cost_per_base_unit or 0.0
        )
        session.add(transfer_item)

    session.commit()
    session.refresh(transfer)

    return {
        "id": transfer.id,
        "transfer_number": transfer.transfer_number,
        "status": transfer.status.value,
        "from_location_name": from_loc.name,
        "to_location_name": to_loc.name,
        "message": f"Stock transfer {transfer.transfer_number} dispatched successfully and is now In-Transit."
    }


@router.post(
    "/api/businesses/{business_id}/stock-transfers/{transfer_id}/receive",
    response_model=dict,
    summary="Receive stock transfer",
    description="Completes a 2-step stock transfer. Increments stock count at the destination location.",
)
def receive_stock_transfer(
    business_id: str,
    transfer_id: str,
    data: Optional[TransferReceiveRequest] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "stock_transfers.write", session=session)

    transfer = session.get(StockTransfer, transfer_id)
    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock transfer record not found"
        )

    if transfer.status != StockTransferStatus.in_transit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transfer cannot be received because its current status is '{transfer.status.value}'"
        )

    transfer_items = session.exec(
        select(StockTransferItem).where(StockTransferItem.transfer_id == transfer_id)
    ).all()

    received_qty_map = {}
    if data and data.items:
        for r_item in data.items:
            received_qty_map[r_item.stock_item_id] = r_item.received_qty

    for t_item in transfer_items:
        qty_to_receive = received_qty_map.get(t_item.stock_item_id, t_item.dispatched_qty)
        t_item.received_qty = qty_to_receive
        session.add(t_item)

        # Increment destination stock
        sil = session.exec(
            select(StockItemLocation).where(
                StockItemLocation.stock_item_id == t_item.stock_item_id,
                StockItemLocation.location_id == transfer.to_location_id
            )
        ).first()

        if not sil:
            sil = StockItemLocation(
                stock_item_id=t_item.stock_item_id,
                location_id=transfer.to_location_id,
                current_stock=qty_to_receive
            )
        else:
            sil.current_stock += qty_to_receive

        session.add(sil)

    transfer.status = StockTransferStatus.completed
    transfer.received_by_id = current_user.id
    transfer.received_at = datetime.utcnow()
    if data and data.notes:
        transfer.notes = (transfer.notes or "") + f" | Receive note: {data.notes}"

    session.add(transfer)
    session.commit()

    return {
        "id": transfer.id,
        "transfer_number": transfer.transfer_number,
        "status": transfer.status.value,
        "message": f"Stock transfer {transfer.transfer_number} received and completed successfully."
    }


@router.get(
    "/api/businesses/{business_id}/stock-transfers",
    response_model=List[dict],
    summary="List stock transfers",
    description="Retrieves stock transfers for a business.",
)
def list_stock_transfers(
    business_id: str,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    verify_user_permission(current_user, business_id, "stock_transfers.read", session=session)

    statement = select(StockTransfer).where(
        (StockTransfer.business_id == business_id) | (StockTransfer.business_id == None)
    )

    if status_filter:
        statement = statement.where(StockTransfer.status == status_filter)

    transfers = session.exec(statement.order_by(StockTransfer.dispatched_at.desc())).all()

    result = []
    for trf in transfers:
        from_loc = session.get(Location, trf.from_location_id)
        to_loc = session.get(Location, trf.to_location_id)

        items_stmt = select(StockTransferItem).where(StockTransferItem.transfer_id == trf.id)
        items = session.exec(items_stmt).all()

        item_details = []
        for it in items:
            si = session.get(StockItem, it.stock_item_id)
            item_details.append({
                "id": it.id,
                "stock_item_id": it.stock_item_id,
                "stock_item_name": si.name if si else "Unknown",
                "dispatched_qty": it.dispatched_qty,
                "received_qty": it.received_qty,
                "unit_cost": it.unit_cost
            })

        result.append({
            "id": trf.id,
            "transfer_number": trf.transfer_number,
            "status": trf.status.value,
            "from_location_id": trf.from_location_id,
            "from_location_name": from_loc.name if from_loc else "Unknown",
            "to_location_id": trf.to_location_id,
            "to_location_name": to_loc.name if to_loc else "Unknown",
            "dispatched_at": trf.dispatched_at.isoformat() if trf.dispatched_at else None,
            "received_at": trf.received_at.isoformat() if trf.received_at else None,
            "notes": trf.notes,
            "items": item_details
        })

    return result
