from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import (
    User, Business, Location, StockItem, StockCountSession, StockCountItem,
    StockCountStatus, StockItemLocation
)
from app.services.auth.dependencies import get_current_user

router = APIRouter(tags=["Stock Counts"])


class StockCountItemCreate(SQLModel):
    item_id: str
    counted_cartons: Optional[float] = None
    counted_pieces: Optional[float] = None
    notes: Optional[str] = None


class StockCountItemOut(SQLModel):
    id: str
    session_id: str
    item_id: str
    item_name: str
    item_sku: Optional[str] = None
    base_unit: str
    expected_qty: float
    counted_cartons: Optional[float] = None
    counted_pieces: Optional[float] = None
    counted_qty: Optional[float] = None
    variance: Optional[float] = None
    cost_variance: Optional[float] = None
    notes: Optional[str] = None


class StockCountSessionCreate(SQLModel):
    location_id: Optional[str] = None
    count_type: str = "General Count"
    count_date: str
    counted_by_name: str
    notes: Optional[str] = None
    items: List[StockCountItemCreate] = []


class StockCountSessionOut(SQLModel):
    id: str
    business_id: str
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    count_type: str
    count_date: str
    counted_by_name: str
    status: StockCountStatus
    notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    items_count: int = 0
    total_variance: float = 0.0
    items: List[StockCountItemOut] = []


@router.post(
    "/api/businesses/{business_id}/stock-counts",
    response_model=StockCountSessionOut,
    summary="Create a new stock count session",
    description=(
        "Initiates a new stock count session for a specific business. "
        "It retrieves all active stock items for the business, determines their expected stock quantity "
        "(globally or at a specific location), accepts initial count counts, and calculates variances."
    ),
    responses={
        200: {"description": "Stock count session successfully created and initialized."},
        400: {"description": "Invalid location ID specified."},
        403: {"description": "User is not authorized to edit this business."},
    }
)
def create_business_stock_count(
    business_id: str,
    data: StockCountSessionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **Create a Stock Count Session**

    - **business_id**: The unique identifier of the business.
    - **data**: Details of the stock count session including the target location, count date, counter's name, and initial items.
    """
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    location_name = None
    if data.location_id:
        loc = session.get(Location, data.location_id)
        if not loc or loc.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid location ID")
        location_name = loc.name

    count_sess = StockCountSession(
        business_id=business_id,
        location_id=data.location_id,
        count_type=data.count_type,
        count_date=data.count_date,
        counted_by_name=data.counted_by_name,
        notes=data.notes,
        status=StockCountStatus.in_progress
    )
    session.add(count_sess)
    session.commit()
    session.refresh(count_sess)

    active_items = session.exec(select(StockItem).where(
        StockItem.business_id == business_id, StockItem.is_active == True)).all()

    items_out = []
    for item in active_items:
        conversion = 1.0
        if item.counting_options:
            conversion = item.counting_options[0].conversion_to_base_qty

        expected_qty = 0.0
        if count_sess.location_id:
            sil = session.exec(select(StockItemLocation).where(
                StockItemLocation.stock_item_id == item.id,
                StockItemLocation.location_id == count_sess.location_id
            )).first()
            if sil:
                expected_qty = sil.current_stock
        else:
            rules = session.exec(select(StockItemLocation).where(
                StockItemLocation.stock_item_id == item.id)).all()
            expected_qty = sum(
                r.current_stock for r in rules) if rules else 0.0

        initial_cartons = None
        initial_pieces = None
        initial_qty = None
        initial_variance = None
        initial_cost_variance = None
        initial_notes = None

        for input_item in data.items:
            if input_item.item_id == item.id:
                initial_cartons = input_item.counted_cartons
                initial_pieces = input_item.counted_pieces
                initial_notes = input_item.notes

                c_qty = 0.0
                has_counted = False
                if initial_cartons is not None:
                    c_qty += initial_cartons * conversion
                    has_counted = True
                if initial_pieces is not None:
                    c_qty += initial_pieces
                    has_counted = True

                if has_counted:
                    initial_qty = c_qty
                    initial_variance = initial_qty - expected_qty
                    initial_cost_variance = initial_variance * \
                        (item.cost_per_base_unit or 0.0)
                break

        count_item = StockCountItem(
            session_id=count_sess.id,
            item_id=item.id,
            expected_qty=expected_qty,
            counted_cartons=initial_cartons,
            counted_pieces=initial_pieces,
            counted_qty=initial_qty,
            variance=initial_variance,
            cost_variance=initial_cost_variance,
            notes=initial_notes
        )
        session.add(count_item)
        session.commit()
        session.refresh(count_item)

        items_out.append(StockCountItemOut(
            id=count_item.id,
            session_id=count_item.session_id,
            item_id=count_item.item_id,
            item_name=item.name,
            item_sku=item.sku,
            base_unit=item.base_unit,
            expected_qty=count_item.expected_qty,
            counted_cartons=count_item.counted_cartons,
            counted_pieces=count_item.counted_pieces,
            counted_qty=count_item.counted_qty,
            variance=count_item.variance,
            cost_variance=count_item.cost_variance,
            notes=count_item.notes
        ))

    return StockCountSessionOut(
        id=count_sess.id,
        business_id=count_sess.business_id,
        location_id=count_sess.location_id,
        location_name=location_name,
        count_type=count_sess.count_type,
        count_date=count_sess.count_date,
        counted_by_name=count_sess.counted_by_name,
        status=count_sess.status,
        notes=count_sess.notes,
        created_at=count_sess.created_at,
        completed_at=count_sess.completed_at,
        items_count=len(items_out),
        total_variance=sum(
            x.cost_variance for x in items_out if x.cost_variance is not None),
        items=items_out
    )


@router.get(
    "/api/businesses/{business_id}/stock-counts",
    response_model=List[StockCountSessionOut],
    summary="List all stock count sessions",
    description="Retrieves a list of all stock count sessions associated with the specified business.",
    responses={
        200: {"description": "A list of stock count sessions successfully retrieved."},
        403: {"description": "User is not authorized to access this business."},
    }
)
def get_business_stock_counts(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **List Stock Count Sessions**

    - **business_id**: The unique identifier of the business.
    """
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    sessions = session.exec(select(StockCountSession).where(
        StockCountSession.business_id == business_id)).all()

    out = []
    for s in sessions:
        location_name = None
        if s.location_id:
            loc = session.get(Location, s.location_id)
            location_name = loc.name if loc else None

        items_out = []
        for ci in s.items:
            item = session.get(StockItem, ci.item_id)
            item_name = item.name if item else "Unknown"
            item_sku = item.sku if item else None
            base_unit = item.base_unit if item else "pcs"
            items_out.append(StockCountItemOut(
                id=ci.id,
                session_id=ci.session_id,
                item_id=ci.item_id,
                item_name=item_name,
                item_sku=item_sku,
                base_unit=base_unit,
                expected_qty=ci.expected_qty,
                counted_cartons=ci.counted_cartons,
                counted_pieces=ci.counted_pieces,
                counted_qty=ci.counted_qty,
                variance=ci.variance,
                cost_variance=ci.cost_variance,
                notes=ci.notes
            ))

        out.append(StockCountSessionOut(
            id=s.id,
            business_id=s.business_id,
            location_id=s.location_id,
            location_name=location_name,
            count_type=s.count_type,
            count_date=s.count_date,
            counted_by_name=s.counted_by_name,
            status=s.status,
            notes=s.notes,
            created_at=s.created_at,
            completed_at=s.completed_at,
            items_count=len(items_out),
            total_variance=sum(
                x.cost_variance for x in items_out if x.cost_variance is not None),
            items=items_out
        ))
    return out


@router.get(
    "/api/businesses/{business_id}/stock-counts/{session_id}",
    response_model=StockCountSessionOut,
    summary="Get stock count session details",
    description="Retrieves granular information, itemized list, and calculated variances for a specific stock count session.",
    responses={
        200: {"description": "Detailed stock count session info successfully retrieved."},
        403: {"description": "User is not authorized to access this business."},
        404: {"description": "Stock count session not found."},
    }
)
def get_business_stock_count_detail(
    business_id: str,
    session_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **Get Stock Count Details**

    - **business_id**: The unique identifier of the business.
    - **session_id**: The unique identifier of the stock count session.
    """
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    count_sess = session.get(StockCountSession, session_id)
    if not count_sess or count_sess.business_id != business_id:
        raise HTTPException(
            status_code=404, detail="Stock count session not found")

    location_name = None
    if count_sess.location_id:
        loc = session.get(Location, count_sess.location_id)
        location_name = loc.name if loc else None

    items_out = []
    for ci in count_sess.items:
        item = session.get(StockItem, ci.item_id)
        item_name = item.name if item else "Unknown"
        item_sku = item.sku if item else None
        base_unit = item.base_unit if item else "pcs"
        items_out.append(StockCountItemOut(
            id=ci.id,
            session_id=ci.session_id,
            item_id=ci.item_id,
            item_name=item_name,
            item_sku=item_sku,
            base_unit=base_unit,
            expected_qty=ci.expected_qty,
            counted_cartons=ci.counted_cartons,
            counted_pieces=ci.counted_pieces,
            counted_qty=ci.counted_qty,
            variance=ci.variance,
            cost_variance=ci.cost_variance,
            notes=ci.notes
        ))

    return StockCountSessionOut(
        id=count_sess.id,
        business_id=count_sess.business_id,
        location_id=count_sess.location_id,
        location_name=location_name,
        count_type=count_sess.count_type,
        count_date=count_sess.count_date,
        counted_by_name=count_sess.counted_by_name,
        status=count_sess.status,
        notes=count_sess.notes,
        created_at=count_sess.created_at,
        completed_at=count_sess.completed_at,
        items_count=len(items_out),
        total_variance=sum(
            x.cost_variance for x in items_out if x.cost_variance is not None),
        items=items_out
    )


@router.put(
    "/api/businesses/{business_id}/stock-counts/{session_id}",
    response_model=StockCountSessionOut,
    summary="Update a stock count session",
    description=(
        "Updates an active stock count session's general info and individual stock count items. "
        "When status is set to 'completed', this action automatically commits the finalized count "
        "and updates the current stock levels in the business locations database."
    ),
    responses={
        200: {"description": "Stock count session successfully updated."},
        400: {"description": "Invalid location ID specified."},
        403: {"description": "User is not authorized to edit this business."},
        404: {"description": "Stock count session not found."},
    }
)
def update_business_stock_count(
    business_id: str,
    session_id: str,
    data: StockCountSessionCreate,
    status: Optional[StockCountStatus] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **Update Stock Count Session**

    - **business_id**: The unique identifier of the business.
    - **session_id**: The unique identifier of the stock count session.
    - **data**: Updated count quantities and notes.
    - **status**: Optional new status (e.g. set to `completed` to lock the session and reconcile stock inventory).
    """
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    count_sess = session.get(StockCountSession, session_id)
    if not count_sess or count_sess.business_id != business_id:
        raise HTTPException(
            status_code=404, detail="Stock count session not found")

    if data.location_id:
        loc = session.get(Location, data.location_id)
        if not loc or loc.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid location ID")
        count_sess.location_id = data.location_id

    count_sess.count_type = data.count_type
    count_sess.count_date = data.count_date
    count_sess.counted_by_name = data.counted_by_name
    count_sess.notes = data.notes

    if status:
        count_sess.status = status

    session.add(count_sess)
    session.commit()
    session.refresh(count_sess)

    for input_item in data.items:
        ci = session.exec(select(StockCountItem).where(
            StockCountItem.session_id == session_id, StockCountItem.item_id == input_item.item_id)).first()
        if ci:
            item = session.get(StockItem, input_item.item_id)
            if not item:
                continue

            conversion = 1.0
            if item.counting_options:
                conversion = item.counting_options[0].conversion_to_base_qty

            ci.counted_cartons = input_item.counted_cartons
            ci.counted_pieces = input_item.counted_pieces
            ci.notes = input_item.notes

            c_qty = 0.0
            has_counted = False
            if input_item.counted_cartons is not None:
                c_qty += input_item.counted_cartons * conversion
                has_counted = True
            if input_item.counted_pieces is not None:
                c_qty += input_item.counted_pieces
                has_counted = True

            if has_counted:
                ci.counted_qty = c_qty
                ci.variance = ci.counted_qty - ci.expected_qty
                ci.cost_variance = ci.variance * \
                    (item.cost_per_base_unit or 0.0)
            else:
                ci.counted_qty = None
                ci.variance = None
                ci.cost_variance = None

            session.add(ci)
            session.commit()
            session.refresh(ci)

    if count_sess.status == StockCountStatus.completed:
        count_sess.completed_at = datetime.utcnow()
        session.add(count_sess)
        session.commit()
        session.refresh(count_sess)

        for ci in count_sess.items:
            if ci.counted_qty is not None:
                if count_sess.location_id:
                    sil = session.exec(select(StockItemLocation).where(
                        StockItemLocation.stock_item_id == ci.item_id,
                        StockItemLocation.location_id == count_sess.location_id
                    )).first()
                    if sil:
                        sil.current_stock = ci.counted_qty
                        session.add(sil)
                        session.commit()
                        session.refresh(sil)

    location_name = None
    if count_sess.location_id:
        loc = session.get(Location, count_sess.location_id)
        location_name = loc.name if loc else None

    items_out = []
    for ci in count_sess.items:
        item = session.get(StockItem, ci.item_id)
        item_name = item.name if item else "Unknown"
        item_sku = item.sku if item else None
        base_unit = item.base_unit if item else "pcs"
        items_out.append(StockCountItemOut(
            id=ci.id,
            session_id=ci.session_id,
            item_id=ci.item_id,
            item_name=item_name,
            item_sku=item_sku,
            base_unit=base_unit,
            expected_qty=ci.expected_qty,
            counted_cartons=ci.counted_cartons,
            counted_pieces=ci.counted_pieces,
            counted_qty=ci.counted_qty,
            variance=ci.variance,
            cost_variance=ci.cost_variance,
            notes=ci.notes
        ))

    return StockCountSessionOut(
        id=count_sess.id,
        business_id=count_sess.business_id,
        location_id=count_sess.location_id,
        location_name=location_name,
        count_type=count_sess.count_type,
        count_date=count_sess.count_date,
        counted_by_name=count_sess.counted_by_name,
        status=count_sess.status,
        notes=count_sess.notes,
        created_at=count_sess.created_at,
        completed_at=count_sess.completed_at,
        items_count=len(items_out),
        total_variance=sum(
            x.cost_variance for x in items_out if x.cost_variance is not None),
        items=items_out
    )


@router.delete(
    "/api/businesses/{business_id}/stock-counts/{session_id}",
    summary="Delete a stock count session",
    description="Deletes a specific stock count session from the records of the designated business.",
    responses={
        200: {"description": "Stock count session successfully deleted."},
        403: {"description": "User is not authorized to edit this business."},
        404: {"description": "Stock count session not found."},
    }
)
def delete_business_stock_count(
    business_id: str,
    session_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    **Delete Stock Count Session**

    - **business_id**: The unique identifier of the business.
    - **session_id**: The unique identifier of the stock count session.
    """
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    count_sess = session.get(StockCountSession, session_id)
    if not count_sess or count_sess.business_id != business_id:
        raise HTTPException(
            status_code=404, detail="Stock count session not found")

    session.delete(count_sess)
    session.commit()
    return {"message": "Stock count session deleted successfully"}
