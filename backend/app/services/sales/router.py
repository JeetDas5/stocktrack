import csv
import io
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import (
    User, Business, StockItem, Location, Sale, SaleItem, SaleStatus,
    StockItemLocation, Recipe, SalesImport
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


@router.post("/api/businesses/{business_id}/sales",
             response_model=Sale,
             status_code=status.HTTP_201_CREATED,
             summary="Create a new sale",
             description="Creates a new sale under a specific business.",
             responses={
                 201: {"description": "Sale successfully created."},
                 403: {"description": "User is not authorized to edit this business."},
                 404: {"description": "Business or location profile not found."},
             }
             )
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

    subtotal_amount = sum(
        item.quantity * item.unit_price for item in data.items)
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

    for item in data.items:
        recipe = session.get(Recipe, item.recipe_id)
        if not recipe or recipe.business_id != business_id:
            continue

        if data.status == SaleStatus.completed:
            for ing in recipe.ingredients:
                stock_item = session.get(StockItem, ing.item_id)
                if not stock_item or stock_item.business_id != business_id:
                    continue

                decrement_qty = (item.quantity * ing.qty_used) / \
                    recipe.yield_qty

                if data.location_id:
                    sil = session.exec(
                        select(StockItemLocation)
                        .where(StockItemLocation.stock_item_id == ing.item_id)
                        .where(StockItemLocation.location_id == data.location_id)
                    ).first()
                    if sil:
                        sil.current_stock -= decrement_qty
                        session.add(sil)

        item_total = (item.quantity * item.unit_price) * \
            (1.0 - (item.discount_percentage / 100.0))

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


@router.get("/api/businesses/{business_id}/sales",
            response_model=List[Sale],
            summary="List all sales",
            description="Retrieves all sales under a specific business.",
            responses={
                200: {"description": "List of sales successfully retrieved."},
                403: {"description": "User is not authorized to access this business."},
                404: {"description": "Business or location profile not found."},
            }
            )
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


@router.get("/api/businesses/{business_id}/sales/{sale_id}",
            response_model=Sale,
            summary="Get a sale",
            description="Retrieves a specific sale under a specific business.",
            responses={
                200: {"description": "Sale successfully retrieved."},
                403: {"description": "User is not authorized to access this business."},
                404: {"description": "Business or location profile not found."},
            }
            )
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


@router.put("/api/businesses/{business_id}/sales/{sale_id}",
            response_model=Sale,
            summary="Update a sale",
            description="Updates a specific sale under a specific business.",
            responses={
                200: {"description": "Sale successfully updated."},
                403: {"description": "User is not authorized to edit this business."},
                404: {"description": "Business or location profile not found."},
            }
            )
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
                            decrement_qty = (
                                item.quantity * ing.qty_used) / recipe.yield_qty

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


class SalesImportConfirm(SQLModel):
    filename: str
    file_size: str
    location_id: Optional[str] = None
    column_mapping: dict
    headers: List[str]
    rows: List[List[str]]


@router.get("/api/businesses/{business_id}/sales/imports")
def get_sales_imports(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    imports = session.exec(
        select(SalesImport)
        .where(SalesImport.business_id == business_id)
        .order_by(SalesImport.created_at.desc())
    ).all()

    out = []
    for imp in imports:
        out.append({
            "id": imp.id,
            "filename": imp.filename,
            "file_size": imp.file_size,
            "row_count": imp.row_count,
            "mapped_count": imp.mapped_count,
            "unmapped_count": imp.unmapped_count,
            "duplicates_count": imp.duplicates_count,
            "status": imp.status,
            "date_range": imp.date_range,
            "created_at": imp.created_at.isoformat()
        })
    return out


@router.post("/api/businesses/{business_id}/sales/imports/preview")
def preview_sales_import(
    business_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    contents = file.file.read()
    file_size_kb = f"{len(contents) / 1024:.1f} KB"

    decoded = contents.decode("utf-8-sig", errors="ignore")
    reader = csv.reader(io.StringIO(decoded))
    all_rows = list(reader)

    if not all_rows:
        raise HTTPException(status_code=400, detail="Empty CSV file")

    headers = [h.strip() for h in all_rows[0]]
    rows = [[col.strip() for col in row] for row in all_rows[1:] if row]

    auto_mapping = {}
    system_fields = {
        "date": ["date", "sale date", "transaction date"],
        "time": ["time", "sale time", "transaction time"],
        "item_name": ["item", "item name", "product", "product name", "recipe", "recipe name"],
        "category": ["category", "item category", "department"],
        "quantity": ["qty", "quantity", "count", "volume"],
        "unit_price": ["unit price", "price", "rate", "item price"],
        "discount": ["discount", "discount amount", "promo"],
        "net_sales": ["net sales", "net amount", "total", "total amount", "sales"]
    }

    for sys_key, search_terms in system_fields.items():
        matched = False
        for term in search_terms:
            for idx, h in enumerate(headers):
                if term == h.lower().strip():
                    auto_mapping[sys_key] = h
                    matched = True
                    break
            if matched:
                break
        if not matched:
            auto_mapping[sys_key] = ""

    return {
        "filename": file.filename,
        "file_size": file_size_kb,
        "headers": headers,
        "rows": rows[:100],
        "total_rows": len(rows),
        "auto_mapping": auto_mapping
    }


@router.post("/api/businesses/{business_id}/sales/imports")
def confirm_sales_import(
    business_id: str,
    data: SalesImportConfirm,
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

    recipes = session.exec(
        select(Recipe)
        .where(Recipe.business_id == business_id)
    ).all()
    recipe_map = {r.recipe_name.lower().strip(): r for r in recipes}

    col_map = data.column_mapping
    col_idx = {}
    for key, header_name in col_map.items():
        if header_name and header_name in data.headers:
            col_idx[key] = data.headers.index(header_name)

    def parse_float(val):
        if not val:
            return 0.0
        cleaned = val.replace("$", "").replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def format_date_str(d_str):
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y"):
            try:
                dt = datetime.strptime(d_str, fmt)
                return dt.strftime("%d %b %Y")
            except ValueError:
                pass
        return d_str

    mapped_count = 0
    unmapped_count = 0
    grouped_sales = {}
    dates_found = []

    for row in data.rows:
        date_idx = col_idx.get("date")
        time_idx = col_idx.get("time")
        item_idx = col_idx.get("item_name")
        qty_idx = col_idx.get("quantity")
        price_idx = col_idx.get("unit_price")
        disc_idx = col_idx.get("discount")
        net_idx = col_idx.get("net_sales")

        date_val = row[date_idx].strip(
        ) if date_idx is not None and date_idx < len(row) else ""
        time_val = row[time_idx].strip(
        ) if time_idx is not None and time_idx < len(row) else ""
        item_name = row[item_idx].strip(
        ) if item_idx is not None and item_idx < len(row) else ""
        qty_val = row[qty_idx].strip(
        ) if qty_idx is not None and qty_idx < len(row) else ""
        price_val = row[price_idx].strip(
        ) if price_idx is not None and price_idx < len(row) else ""
        disc_val = row[disc_idx].strip(
        ) if disc_idx is not None and disc_idx < len(row) else ""
        net_val = row[net_idx].strip(
        ) if net_idx is not None and net_idx < len(row) else ""

        if not item_name:
            continue

        if date_val:
            dates_found.append(date_val)

        qty = parse_float(qty_val)
        price = parse_float(price_val)
        disc = parse_float(disc_val)
        net = parse_float(net_val)

        if net == 0.0 and qty > 0 and price > 0:
            net = qty * price - disc

        matched_recipe = recipe_map.get(item_name.lower().strip())
        if matched_recipe:
            mapped_count += 1
            key = (date_val, time_val)
            if key not in grouped_sales:
                grouped_sales[key] = []
            grouped_sales[key].append({
                "recipe": matched_recipe,
                "quantity": qty,
                "unit_price": price,
                "discount_percentage": disc,
                "total_amount": net
            })
        else:
            unmapped_count += 1

    imported_sales_count = 0
    imported_items_count = 0

    for (date_str, time_str), items in grouped_sales.items():
        sale_count = len(session.exec(
            select(Sale)
            .where(Sale.business_id == business_id)
        ).all())
        sale_number = f"SALE-IMP-{datetime.utcnow().strftime('%y%m%d')}-{sale_count + 1:03d}"

        subtotal_amount = sum(
            item["quantity"] * item["unit_price"] for item in items)
        discount_amount = sum(item["quantity"] * item["unit_price"]
                              * (item["discount_percentage"] / 100.0) for item in items)
        total_amount = sum(item["total_amount"] for item in items)

        sale = Sale(
            business_id=business_id,
            location_id=data.location_id,
            sale_number=sale_number,
            sale_date=date_str,
            customer_name="Walk-in Customer",
            payment_method="Cash",
            status=SaleStatus.completed,
            tax_rate=0.0,
            subtotal_amount=subtotal_amount,
            tax_amount=0.0,
            discount_amount=discount_amount,
            total_amount=total_amount,
            created_by_id=current_user.id
        )

        session.add(sale)
        session.flush()

        for item in items:
            recipe = item["recipe"]
            qty = item["quantity"]
            price = item["unit_price"]
            disc = item["discount_percentage"]
            tot = item["total_amount"]

            for ing in recipe.ingredients:
                stock_item = session.get(StockItem, ing.item_id)
                if stock_item and stock_item.business_id == business_id:
                    decrement_qty = (qty * ing.qty_used) / recipe.yield_qty

                    if data.location_id:
                        sil = session.exec(
                            select(StockItemLocation)
                            .where(StockItemLocation.stock_item_id == ing.item_id)
                            .where(StockItemLocation.location_id == data.location_id)
                        ).first()
                        if sil:
                            sil.current_stock -= decrement_qty
                            session.add(sil)

            sale_item = SaleItem(
                sale_id=sale.id,
                recipe_id=recipe.id,
                quantity=qty,
                unit_price=price,
                discount_percentage=disc,
                total_amount=tot
            )
            session.add(sale_item)
            imported_items_count += 1

        imported_sales_count += 1

    date_range_str = "Unknown Date Range"
    if dates_found:
        formatted_dates = [format_date_str(d) for d in dates_found]
        min_date = min(formatted_dates)
        max_date = max(formatted_dates)
        if min_date == max_date:
            date_range_str = min_date
        else:
            date_range_str = f"{min_date} - {max_date}"

    import_log = SalesImport(
        business_id=business_id,
        filename=data.filename,
        file_size=data.file_size,
        row_count=len(data.rows),
        mapped_count=mapped_count,
        unmapped_count=unmapped_count,
        duplicates_count=0,
        status="Completed",
        date_range=date_range_str,
        created_by_id=current_user.id
    )

    session.add(import_log)
    session.commit()

    return {
        "status": "success",
        "imported_sales": imported_sales_count,
        "imported_items": imported_items_count,
        "mapped_count": mapped_count,
        "unmapped_count": unmapped_count,
        "date_range": date_range_str
    }
