import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import (
    User, Business, Location, StockItem, StockCountSession, StockCountItem,
    StockCountStatus, StockItemLocation, Reconciliation, ReconciliationItem
)
from app.services.auth.dependencies import get_current_user

router = APIRouter(tags=["Reconciliation"])


class ReconciliationCreate(SQLModel):
    location_id: Optional[str] = None
    reconciliation_date: str
    compare_with: str = "System (Expected)"


class ReconciliationItemOut(SQLModel):
    id: Optional[str] = None
    item_id: str
    item_name: str
    item_sku: Optional[str] = None
    category_name: str
    base_unit: str
    expected_qty: float
    actual_qty: float
    variance_qty: float
    variance_percent: float
    variance_value: float
    status: str


class ReconciliationOut(SQLModel):
    id: Optional[str] = None
    business_id: str
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    reconciliation_date: str
    compare_with: str
    status: str
    total_items: int
    matched_items: int
    variance_items: int
    total_variance_usd: float
    total_value_expected: float
    total_value_actual: float
    positive_variance_usd: float
    negative_variance_usd: float
    created_at: Optional[datetime] = None
    items: List[ReconciliationItemOut] = []


def perform_reconciliation_calculation(
    business_id: str,
    location_id: Optional[str],
    reconciliation_date: str,
    compare_with: str,
    session: Session
):
    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    active_items = session.exec(select(StockItem).where(
        StockItem.business_id == business_id, StockItem.is_active == True)).all()

    completed_sessions = {}
    if location_id:
        query = select(StockCountSession).where(
            StockCountSession.business_id == business_id,
            StockCountSession.location_id == location_id,
            StockCountSession.status == StockCountStatus.completed,
            StockCountSession.count_date <= reconciliation_date
        ).order_by(StockCountSession.count_date.desc())
        latest = session.exec(query).first()
        if latest:
            completed_sessions[location_id] = latest
    else:
        locations = session.exec(select(Location).where(Location.business_id == business_id)).all()
        for loc in locations:
            query = select(StockCountSession).where(
                StockCountSession.business_id == business_id,
                StockCountSession.location_id == loc.id,
                StockCountSession.status == StockCountStatus.completed,
                StockCountSession.count_date <= reconciliation_date
            ).order_by(StockCountSession.count_date.desc())
            latest = session.exec(query).first()
            if latest:
                completed_sessions[loc.id] = latest

    items_out = []
    for item in active_items:
        expected_qty = 0.0
        if location_id:
            sil = session.exec(select(StockItemLocation).where(
                StockItemLocation.stock_item_id == item.id,
                StockItemLocation.location_id == location_id
            )).first()
            if sil:
                expected_qty = sil.current_stock
        else:
            sils = session.exec(select(StockItemLocation).where(
                StockItemLocation.stock_item_id == item.id)).all()
            expected_qty = sum(sil.current_stock for sil in sils)

        actual_qty = 0.0
        if location_id:
            sess = completed_sessions.get(location_id)
            if sess:
                ci = session.exec(select(StockCountItem).where(
                    StockCountItem.session_id == sess.id,
                    StockCountItem.item_id == item.id
                )).first()
                if ci and ci.counted_qty is not None:
                    actual_qty = ci.counted_qty
                else:
                    actual_qty = expected_qty
            else:
                actual_qty = expected_qty
        else:
            if completed_sessions:
                temp_actual = 0.0
                for loc_id, sess in completed_sessions.items():
                    ci = session.exec(select(StockCountItem).where(
                        StockCountItem.session_id == sess.id,
                        StockCountItem.item_id == item.id
                    )).first()
                    if ci and ci.counted_qty is not None:
                        temp_actual += ci.counted_qty
                    else:
                        sil = session.exec(select(StockItemLocation).where(
                            StockItemLocation.stock_item_id == item.id,
                            StockItemLocation.location_id == loc_id
                        )).first()
                        temp_actual += sil.current_stock if sil else 0.0
                actual_qty = temp_actual
            else:
                actual_qty = expected_qty

        variance_qty = actual_qty - expected_qty
        variance_percent = 0.0
        if expected_qty != 0.0:
            variance_percent = (variance_qty / expected_qty) * 100.0
        variance_value = variance_qty * (item.cost_per_base_unit or 0.0)
        status_val = "Matched" if abs(variance_qty) < 0.001 else "Variance"

        items_out.append(ReconciliationItemOut(
            item_id=item.id,
            item_name=item.name,
            item_sku=item.sku,
            category_name=item.category.name if item.category else "Uncategorized",
            base_unit=item.base_unit,
            expected_qty=expected_qty,
            actual_qty=actual_qty,
            variance_qty=variance_qty,
            variance_percent=variance_percent,
            variance_value=variance_value,
            status=status_val
        ))

    total_items = len(items_out)
    matched_items = sum(1 for x in items_out if x.status == "Matched")
    variance_items = sum(1 for x in items_out if x.status == "Variance")
    total_variance_usd = sum(x.variance_value for x in items_out)
    total_value_expected = sum(x.expected_qty * (session.get(StockItem, x.item_id).cost_per_base_unit or 0.0) for x in items_out)
    total_value_actual = sum(x.actual_qty * (session.get(StockItem, x.item_id).cost_per_base_unit or 0.0) for x in items_out)
    positive_variance_usd = sum(x.variance_value for x in items_out if x.variance_value > 0.0)
    negative_variance_usd = sum(x.variance_value for x in items_out if x.variance_value < 0.0)

    location_name = None
    if location_id:
        loc = session.get(Location, location_id)
        if loc:
            location_name = loc.name

    return {
        "business_id": business_id,
        "location_id": location_id,
        "location_name": location_name,
        "reconciliation_date": reconciliation_date,
        "compare_with": compare_with,
        "status": "Completed",
        "total_items": total_items,
        "matched_items": matched_items,
        "variance_items": variance_items,
        "total_variance_usd": total_variance_usd,
        "total_value_expected": total_value_expected,
        "total_value_actual": total_value_actual,
        "positive_variance_usd": positive_variance_usd,
        "negative_variance_usd": negative_variance_usd,
        "items": items_out
    }


@router.post(
    "/api/businesses/{business_id}/reconciliations",
    response_model=ReconciliationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Run and save a new reconciliation"
)
def run_business_reconciliation(
    business_id: str,
    data: ReconciliationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this business")

    calc = perform_reconciliation_calculation(
        business_id=business_id,
        location_id=data.location_id,
        reconciliation_date=data.reconciliation_date,
        compare_with=data.compare_with,
        session=session
    )

    rec = Reconciliation(
        business_id=business_id,
        location_id=calc["location_id"],
        reconciliation_date=calc["reconciliation_date"],
        compare_with=calc["compare_with"],
        status=calc["status"],
        total_items=calc["total_items"],
        matched_items=calc["matched_items"],
        variance_items=calc["variance_items"],
        total_variance_usd=calc["total_variance_usd"],
        total_value_expected=calc["total_value_expected"],
        total_value_actual=calc["total_value_actual"],
        positive_variance_usd=calc["positive_variance_usd"],
        negative_variance_usd=calc["negative_variance_usd"]
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)

    for item_data in calc["items"]:
        item = ReconciliationItem(
            reconciliation_id=rec.id,
            item_id=item_data.item_id,
            expected_qty=item_data.expected_qty,
            actual_qty=item_data.actual_qty,
            variance_qty=item_data.variance_qty,
            variance_percent=item_data.variance_percent,
            variance_value=item_data.variance_value,
            status=item_data.status
        )
        session.add(item)

    session.commit()
    session.refresh(rec)

    location_name = calc["location_name"]
    items_out = []
    for ci in rec.items:
        s_item = session.get(StockItem, ci.item_id)
        items_out.append(ReconciliationItemOut(
            id=ci.id,
            item_id=ci.item_id,
            item_name=s_item.name if s_item else "Unknown",
            item_sku=s_item.sku if s_item else None,
            category_name=s_item.category.name if s_item and s_item.category else "Uncategorized",
            base_unit=s_item.base_unit if s_item else "pcs",
            expected_qty=ci.expected_qty,
            actual_qty=ci.actual_qty,
            variance_qty=ci.variance_qty,
            variance_percent=ci.variance_percent,
            variance_value=ci.variance_value,
            status=ci.status
        ))

    return ReconciliationOut(
        id=rec.id,
        business_id=rec.business_id,
        location_id=rec.location_id,
        location_name=location_name,
        reconciliation_date=rec.reconciliation_date,
        compare_with=rec.compare_with,
        status=rec.status,
        total_items=rec.total_items,
        matched_items=rec.matched_items,
        variance_items=rec.variance_items,
        total_variance_usd=rec.total_variance_usd,
        total_value_expected=rec.total_value_expected,
        total_value_actual=rec.total_value_actual,
        positive_variance_usd=rec.positive_variance_usd,
        negative_variance_usd=rec.negative_variance_usd,
        created_at=rec.created_at,
        items=items_out
    )


@router.get(
    "/api/businesses/{business_id}/reconciliations/preview",
    response_model=ReconciliationOut,
    summary="Get reconciliation preview on-the-fly"
)
def get_reconciliation_preview(
    business_id: str,
    location_id: Optional[str] = None,
    date: Optional[str] = None,
    compare_with: str = "System (Expected)",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this business")

    target_date = date or datetime.utcnow().strftime("%Y-%m-%d")

    calc = perform_reconciliation_calculation(
        business_id=business_id,
        location_id=location_id,
        reconciliation_date=target_date,
        compare_with=compare_with,
        session=session
    )

    return ReconciliationOut(
        business_id=business_id,
        location_id=location_id,
        location_name=calc["location_name"],
        reconciliation_date=target_date,
        compare_with=compare_with,
        status=calc["status"],
        total_items=calc["total_items"],
        matched_items=calc["matched_items"],
        variance_items=calc["variance_items"],
        total_variance_usd=calc["total_variance_usd"],
        total_value_expected=calc["total_value_expected"],
        total_value_actual=calc["total_value_actual"],
        positive_variance_usd=calc["positive_variance_usd"],
        negative_variance_usd=calc["negative_variance_usd"],
        items=calc["items"]
    )


@router.get(
    "/api/businesses/{business_id}/reconciliations",
    response_model=List[ReconciliationOut],
    summary="List all reconciliation runs"
)
def get_business_reconciliations(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this business")

    recs = session.exec(select(Reconciliation).where(
        Reconciliation.business_id == business_id
    ).order_by(Reconciliation.created_at.desc())).all()

    out = []
    for rec in recs:
        location_name = None
        if rec.location_id:
            loc = session.get(Location, rec.location_id)
            if loc:
                location_name = loc.name

        out.append(ReconciliationOut(
            id=rec.id,
            business_id=rec.business_id,
            location_id=rec.location_id,
            location_name=location_name,
            reconciliation_date=rec.reconciliation_date,
            compare_with=rec.compare_with,
            status=rec.status,
            total_items=rec.total_items,
            matched_items=rec.matched_items,
            variance_items=rec.variance_items,
            total_variance_usd=rec.total_variance_usd,
            total_value_expected=rec.total_value_expected,
            total_value_actual=rec.total_value_actual,
            positive_variance_usd=rec.positive_variance_usd,
            negative_variance_usd=rec.negative_variance_usd,
            created_at=rec.created_at
        ))
    return out


@router.get(
    "/api/businesses/{business_id}/reconciliations/{reconciliation_id}",
    response_model=ReconciliationOut,
    summary="Get reconciliation details"
)
def get_business_reconciliation_detail(
    business_id: str,
    reconciliation_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this business")

    rec = session.get(Reconciliation, reconciliation_id)
    if not rec or rec.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation not found")

    location_name = None
    if rec.location_id:
        loc = session.get(Location, rec.location_id)
        if loc:
            location_name = loc.name

    items_out = []
    for ci in rec.items:
        s_item = session.get(StockItem, ci.item_id)
        items_out.append(ReconciliationItemOut(
            id=ci.id,
            item_id=ci.item_id,
            item_name=s_item.name if s_item else "Unknown",
            item_sku=s_item.sku if s_item else None,
            category_name=s_item.category.name if s_item and s_item.category else "Uncategorized",
            base_unit=s_item.base_unit if s_item else "pcs",
            expected_qty=ci.expected_qty,
            actual_qty=ci.actual_qty,
            variance_qty=ci.variance_qty,
            variance_percent=ci.variance_percent,
            variance_value=ci.variance_value,
            status=ci.status
        ))

    return ReconciliationOut(
        id=rec.id,
        business_id=rec.business_id,
        location_id=rec.location_id,
        location_name=location_name,
        reconciliation_date=rec.reconciliation_date,
        compare_with=rec.compare_with,
        status=rec.status,
        total_items=rec.total_items,
        matched_items=rec.matched_items,
        variance_items=rec.variance_items,
        total_variance_usd=rec.total_variance_usd,
        total_value_expected=rec.total_value_expected,
        total_value_actual=rec.total_value_actual,
        positive_variance_usd=rec.positive_variance_usd,
        negative_variance_usd=rec.negative_variance_usd,
        created_at=rec.created_at,
        items=items_out
    )


@router.delete(
    "/api/businesses/{business_id}/reconciliations/{reconciliation_id}",
    summary="Delete a reconciliation"
)
def delete_business_reconciliation(
    business_id: str,
    reconciliation_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this business")

    rec = session.get(Reconciliation, reconciliation_id)
    if not rec or rec.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation not found")

    session.delete(rec)
    session.commit()
    return {"message": "Reconciliation deleted successfully"}
