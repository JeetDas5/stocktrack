from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import (
    User, Business, Category, Location, Supplier, StockItem,
    StockItemLocation, CountingOption
)
from app.services.auth.dependencies import get_current_user

router = APIRouter(tags=["Stock Items"])


class CountingOptionCreate(SQLModel):
    level_name: str
    display_name: str
    conversion_to_base_qty: float
    base_unit: str
    sort_order: int
    show_on_mobile: bool = True


class CountingOptionOut(SQLModel):
    id: str
    item_id: str
    business_id: str
    level_name: str
    display_name: str
    conversion_to_base_qty: float
    base_unit: str
    sort_order: int
    show_on_mobile: bool


class LocationRuleOut(SQLModel):
    id: str
    stock_item_id: str
    location_id: str
    location_name: str
    storage_capacity: float
    storage_capacity_unit: Optional[str] = None
    reorder_level: float
    reorder_level_unit: Optional[str] = None
    current_stock: float = 0.0


class StockItemOut(SQLModel):
    id: str
    name: str
    sku: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    base_unit: str
    cost_per_base_unit: Optional[float] = None
    current_stock: float = 0.0
    is_active: bool
    created_at: datetime
    business_id: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    locations_count: int = 0
    location_rules: List[LocationRuleOut] = []
    counting_options: List[CountingOptionOut] = []


class StockItemCreate(SQLModel):
    name: str
    sku: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    base_unit: str = "pcs"
    cost_per_base_unit: Optional[float] = None
    current_stock: float = 0.0
    is_active: bool = True
    category_id: Optional[str] = None
    supplier_id: Optional[str] = None
    location_rules: Optional[List[dict]] = None
    counting_options: Optional[List[CountingOptionCreate]] = None


@router.post("/api/businesses/{business_id}/stock-items", response_model=StockItemOut,
             summary="Create business stock item",
             description="Creates a new stock item profile within a specific business, optionally attaching supplier, category, location rules, and counting configurations.",
             responses={
                 201: {"description": "Stock item successfully created."},
                 401: {"description": "Missing or invalid authorization credentials."},
                 404: {"description": "Business profile not found in database."},
             }
             )
def create_business_stock_item(
    business_id: str,
    data: StockItemCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    if data.category_id:
        category = session.get(Category, data.category_id)
        if not category or category.business_id != business_id:
            raise HTTPException(
                status_code=400, detail="Invalid category ID for this business")

    if data.supplier_id:
        supplier = session.get(Supplier, data.supplier_id)
        if not supplier or supplier.business_id != business_id:
            raise HTTPException(
                status_code=400, detail="Invalid supplier ID for this business")

    total_stock = sum(float(r.get("current_stock", 0.0))
                      for r in data.location_rules) if data.location_rules else 0.0
    stock_item = StockItem(
        name=data.name,
        sku=data.sku,
        image_url=data.image_url,
        description=data.description,
        base_unit=data.base_unit,
        cost_per_base_unit=data.cost_per_base_unit,
        is_active=data.is_active,
        business_id=business_id,
        category_id=data.category_id,
        supplier_id=data.supplier_id
    )
    session.add(stock_item)
    session.commit()
    session.refresh(stock_item)

    location_rules_out = []
    if data.location_rules:
        for rule in data.location_rules:
            loc_id = rule.get("location_id")
            if not loc_id:
                continue
            loc = session.get(Location, loc_id)
            if not loc or loc.business_id != business_id:
                continue

            storage_capacity = float(rule.get("storage_capacity", 0.0))
            reorder_level = float(rule.get("reorder_level", 0.0))
            current_stock = float(rule.get("current_stock", 0.0))

            if storage_capacity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Storage capacity ({storage_capacity}) must be greater than zero at location {loc.name}"
                )
            if reorder_level < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Reorder level ({reorder_level}) cannot be negative at location {loc.name}"
                )
            if current_stock < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Current stock ({current_stock}) cannot be negative at location {loc.name}"
                )

            if reorder_level >= storage_capacity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Reorder level ({reorder_level}) must be less than storage capacity ({storage_capacity}) at location {loc.name}"
                )
            if current_stock >= storage_capacity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Current stock ({current_stock}) must be less than storage capacity ({storage_capacity}) at location {loc.name}"
                )

            sil = StockItemLocation(
                stock_item_id=stock_item.id,
                location_id=loc_id,
                storage_capacity=storage_capacity,
                storage_capacity_unit=rule.get("storage_capacity_unit"),
                reorder_level=reorder_level,
                reorder_level_unit=rule.get("reorder_level_unit"),
                current_stock=current_stock
            )
            session.add(sil)
            session.commit()
            session.refresh(sil)

            location_rules_out.append(LocationRuleOut(
                id=sil.id,
                stock_item_id=sil.stock_item_id,
                location_id=sil.location_id,
                location_name=loc.name,
                storage_capacity=sil.storage_capacity,
                storage_capacity_unit=sil.storage_capacity_unit,
                reorder_level=sil.reorder_level,
                reorder_level_unit=sil.reorder_level_unit,
                current_stock=sil.current_stock
            ))

    counting_options_out = []
    if data.counting_options:
        for co in data.counting_options:
            counting_opt = CountingOption(
                item_id=stock_item.id,
                business_id=business_id,
                level_name=co.level_name,
                display_name=co.display_name,
                conversion_to_base_qty=co.conversion_to_base_qty,
                base_unit=co.base_unit,
                sort_order=co.sort_order,
                show_on_mobile=co.show_on_mobile
            )
            session.add(counting_opt)
            session.commit()
            session.refresh(counting_opt)

            counting_options_out.append(CountingOptionOut(
                id=counting_opt.id,
                item_id=counting_opt.item_id,
                business_id=counting_opt.business_id,
                level_name=counting_opt.level_name,
                display_name=counting_opt.display_name,
                conversion_to_base_qty=counting_opt.conversion_to_base_qty,
                base_unit=counting_opt.base_unit,
                sort_order=counting_opt.sort_order,
                show_on_mobile=counting_opt.show_on_mobile
            ))

    category_name = stock_item.category.name if stock_item.category else None
    supplier_name = stock_item.supplier.name if stock_item.supplier else None

    return StockItemOut(
        id=stock_item.id,
        name=stock_item.name,
        sku=stock_item.sku,
        image_url=stock_item.image_url,
        description=stock_item.description,
        base_unit=stock_item.base_unit,
        cost_per_base_unit=stock_item.cost_per_base_unit,
        current_stock=total_stock,
        is_active=stock_item.is_active,
        created_at=stock_item.created_at,
        business_id=stock_item.business_id,
        category_id=stock_item.category_id,
        category_name=category_name,
        supplier_id=stock_item.supplier_id,
        supplier_name=supplier_name,
        locations_count=len(location_rules_out),
        location_rules=location_rules_out,
        counting_options=counting_options_out
    )


@router.get("/api/businesses/{business_id}/stock-items", response_model=List[StockItemOut],
            summary="List business stock items",
            description="Retrieves all stock items owned by a specific business, including location rules and counting options.",
            responses={
                200: {"description": "List of stock items successfully retrieved."},
                401: {"description": "Missing or invalid authorization credentials."},
                404: {"description": "Business profile not found in database."},
}
)
def get_business_stock_items(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    items = session.exec(select(StockItem).where(
        StockItem.business_id == business_id)).all()

    out = []
    for item in items:
        category_name = item.category.name if item.category else None
        supplier_name = item.supplier.name if item.supplier else None

        rules = session.exec(select(StockItemLocation).where(
            StockItemLocation.stock_item_id == item.id)).all()
        location_rules_out = []
        for r in rules:
            loc = session.get(Location, r.location_id)
            loc_name = loc.name if loc else "Unknown"
            location_rules_out.append(LocationRuleOut(
                id=r.id,
                stock_item_id=r.stock_item_id,
                location_id=r.location_id,
                location_name=loc_name,
                storage_capacity=r.storage_capacity,
                storage_capacity_unit=r.storage_capacity_unit,
                reorder_level=r.reorder_level,
                reorder_level_unit=r.reorder_level_unit,
                current_stock=r.current_stock
            ))

        opts = session.exec(select(CountingOption).where(
            CountingOption.item_id == item.id)).all()
        counting_options_out = []
        for o in opts:
            counting_options_out.append(CountingOptionOut(
                id=o.id,
                item_id=o.item_id,
                business_id=o.business_id,
                level_name=o.level_name,
                display_name=o.display_name,
                conversion_to_base_qty=o.conversion_to_base_qty,
                base_unit=o.base_unit,
                sort_order=o.sort_order,
                show_on_mobile=o.show_on_mobile
            ))

        total_stock = sum(r.current_stock for r in rules) if rules else 0.0
        out.append(StockItemOut(
            id=item.id,
            name=item.name,
            sku=item.sku,
            image_url=item.image_url,
            description=item.description,
            base_unit=item.base_unit,
            cost_per_base_unit=item.cost_per_base_unit,
            current_stock=total_stock,
            is_active=item.is_active,
            created_at=item.created_at,
            business_id=item.business_id,
            category_id=item.category_id,
            category_name=category_name,
            supplier_id=item.supplier_id,
            supplier_name=supplier_name,
            locations_count=len(rules),
            location_rules=location_rules_out,
            counting_options=counting_options_out
        ))
    return out


@router.get("/api/businesses/{business_id}/locations/{location_id}/stock-items", response_model=List[StockItemOut],
            summary="List business stock items for a specific location",
            description="Retrieves all stock items owned by a specific business that are associated with the given location, including the location-specific rule and counting options.",
            responses={
                200: {"description": "List of stock items successfully retrieved."},
                401: {"description": "Missing or invalid authorization credentials."},
                403: {"description": "Not authorized to access this business."},
                404: {"description": "Business or location not found."},
            }
)
def get_location_stock_items(
    business_id: str,
    location_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    location = session.get(Location, location_id)
    if not location or location.business_id != business_id:
        raise HTTPException(status_code=404, detail="Location not found")

    sil_records = session.exec(select(StockItemLocation).where(
        StockItemLocation.location_id == location_id)).all()

    out = []
    for sil in sil_records:
        item = session.get(StockItem, sil.stock_item_id)
        if not item or item.business_id != business_id:
            continue

        category_name = item.category.name if item.category else None
        supplier_name = item.supplier.name if item.supplier else None

        location_rules_out = [
            LocationRuleOut(
                id=sil.id,
                stock_item_id=sil.stock_item_id,
                location_id=sil.location_id,
                location_name=location.name,
                storage_capacity=sil.storage_capacity,
                storage_capacity_unit=sil.storage_capacity_unit,
                reorder_level=sil.reorder_level,
                reorder_level_unit=sil.reorder_level_unit,
                current_stock=sil.current_stock
            )
        ]

        opts = session.exec(select(CountingOption).where(
            CountingOption.item_id == item.id)).all()
        counting_options_out = []
        for o in opts:
            counting_options_out.append(CountingOptionOut(
                id=o.id,
                item_id=o.item_id,
                business_id=o.business_id,
                level_name=o.level_name,
                display_name=o.display_name,
                conversion_to_base_qty=o.conversion_to_base_qty,
                base_unit=o.base_unit,
                sort_order=o.sort_order,
                show_on_mobile=o.show_on_mobile
            ))

        out.append(StockItemOut(
            id=item.id,
            name=item.name,
            sku=item.sku,
            image_url=item.image_url,
            description=item.description,
            base_unit=item.base_unit,
            cost_per_base_unit=item.cost_per_base_unit,
            current_stock=sil.current_stock,
            is_active=item.is_active,
            created_at=item.created_at,
            business_id=item.business_id,
            category_id=item.category_id,
            category_name=category_name,
            supplier_id=item.supplier_id,
            supplier_name=supplier_name,
            locations_count=1,
            location_rules=location_rules_out,
            counting_options=counting_options_out
        ))
    return out





@router.put("/api/businesses/{business_id}/stock-items/{item_id}", response_model=StockItemOut,
            summary="Update business stock item",
            description="Updates stock item profile details within a business, adjusting associated location rules and counting options as needed.",
            responses={
                200: {"description": "Stock item successfully updated."},
                401: {"description": "Missing or invalid authorization credentials."},
                404: {"description": "Stock item or business not found in database."},
            }
            )
def update_business_stock_item(
    business_id: str,
    item_id: str,
    data: StockItemCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    stock_item = session.get(StockItem, item_id)
    if not stock_item or stock_item.business_id != business_id:
        raise HTTPException(status_code=404, detail="Stock item not found")

    if data.category_id:
        category = session.get(Category, data.category_id)
        if not category or category.business_id != business_id:
            raise HTTPException(
                status_code=400, detail="Invalid category ID for this business")

    if data.supplier_id:
        supplier = session.get(Supplier, data.supplier_id)
        if not supplier or supplier.business_id != business_id:
            raise HTTPException(
                status_code=400, detail="Invalid supplier ID for this business")

    total_stock = sum(float(r.get("current_stock", 0.0))
                      for r in data.location_rules) if data.location_rules else 0.0
    stock_item.name = data.name
    stock_item.sku = data.sku
    stock_item.image_url = data.image_url
    stock_item.description = data.description
    stock_item.base_unit = data.base_unit
    stock_item.cost_per_base_unit = data.cost_per_base_unit
    stock_item.is_active = data.is_active
    stock_item.category_id = data.category_id
    stock_item.supplier_id = data.supplier_id

    session.add(stock_item)
    session.commit()
    session.refresh(stock_item)

    existing_rules = session.exec(select(StockItemLocation).where(
        StockItemLocation.stock_item_id == item_id)).all()
    for rule in existing_rules:
        session.delete(rule)
    session.commit()

    location_rules_out = []
    if data.location_rules:
        for rule in data.location_rules:
            loc_id = rule.get("location_id")
            if not loc_id:
                continue
            loc = session.get(Location, loc_id)
            if not loc or loc.business_id != business_id:
                continue

            storage_capacity = float(rule.get("storage_capacity", 0.0))
            reorder_level = float(rule.get("reorder_level", 0.0))
            current_stock = float(rule.get("current_stock", 0.0))

            if storage_capacity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Storage capacity ({storage_capacity}) must be greater than zero at location {loc.name}"
                )
            if reorder_level < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Reorder level ({reorder_level}) cannot be negative at location {loc.name}"
                )
            if current_stock < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Current stock ({current_stock}) cannot be negative at location {loc.name}"
                )

            if reorder_level >= storage_capacity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Reorder level ({reorder_level}) must be less than storage capacity ({storage_capacity}) at location {loc.name}"
                )
            if current_stock >= storage_capacity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Current stock ({current_stock}) must be less than storage capacity ({storage_capacity}) at location {loc.name}"
                )

            sil = StockItemLocation(
                stock_item_id=stock_item.id,
                location_id=loc_id,
                storage_capacity=storage_capacity,
                storage_capacity_unit=rule.get("storage_capacity_unit"),
                reorder_level=reorder_level,
                reorder_level_unit=rule.get("reorder_level_unit"),
                current_stock=current_stock
            )
            session.add(sil)
            session.commit()
            session.refresh(sil)

            location_rules_out.append(LocationRuleOut(
                id=sil.id,
                stock_item_id=sil.stock_item_id,
                location_id=sil.location_id,
                location_name=loc.name,
                storage_capacity=sil.storage_capacity,
                storage_capacity_unit=sil.storage_capacity_unit,
                reorder_level=sil.reorder_level,
                reorder_level_unit=sil.reorder_level_unit,
                current_stock=sil.current_stock
            ))

    existing_options = session.exec(select(CountingOption).where(
        CountingOption.item_id == item_id)).all()
    for opt in existing_options:
        session.delete(opt)
    session.commit()

    counting_options_out = []
    if data.counting_options:
        for co in data.counting_options:
            counting_opt = CountingOption(
                item_id=stock_item.id,
                business_id=business_id,
                level_name=co.level_name,
                display_name=co.display_name,
                conversion_to_base_qty=co.conversion_to_base_qty,
                base_unit=co.base_unit,
                sort_order=co.sort_order,
                show_on_mobile=co.show_on_mobile
            )
            session.add(counting_opt)
            session.commit()
            session.refresh(counting_opt)

            counting_options_out.append(CountingOptionOut(
                id=counting_opt.id,
                item_id=counting_opt.item_id,
                business_id=counting_opt.business_id,
                level_name=counting_opt.level_name,
                display_name=counting_opt.display_name,
                conversion_to_base_qty=counting_opt.conversion_to_base_qty,
                base_unit=counting_opt.base_unit,
                sort_order=counting_opt.sort_order,
                show_on_mobile=counting_opt.show_on_mobile
            ))

    category_name = stock_item.category.name if stock_item.category else None
    supplier_name = stock_item.supplier.name if stock_item.supplier else None

    return StockItemOut(
        id=stock_item.id,
        name=stock_item.name,
        sku=stock_item.sku,
        image_url=stock_item.image_url,
        description=stock_item.description,
        base_unit=stock_item.base_unit,
        cost_per_base_unit=stock_item.cost_per_base_unit,
        current_stock=total_stock,
        is_active=stock_item.is_active,
        created_at=stock_item.created_at,
        business_id=stock_item.business_id,
        category_id=stock_item.category_id,
        category_name=category_name,
        supplier_id=stock_item.supplier_id,
        supplier_name=supplier_name,
        locations_count=len(location_rules_out),
        location_rules=location_rules_out,
        counting_options=counting_options_out
    )


@router.delete("/api/businesses/{business_id}/stock-items/{item_id}")
def delete_business_stock_item(
    business_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    stock_item = session.get(StockItem, item_id)
    if not stock_item or stock_item.business_id != business_id:
        raise HTTPException(status_code=404, detail="Stock item not found")

    session.delete(stock_item)
    session.commit()
    return {"message": "Stock item deleted successfully"}
