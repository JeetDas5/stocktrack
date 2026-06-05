import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import (
    User, Business, Location, StockItem, StockCountSession, StockCountItem,
    StockCountStatus, StockItemLocation, Delivery, DeliveryItem, Sale, SaleItem,
    Recipe, RecipeIngredient, Category, PurchaseOrder
)
from app.services.auth.dependencies import get_current_user, verify_user_permission, get_allowed_locations

router = APIRouter(tags=["Consumption"])

def parse_date_str(d_str: str) -> datetime:
    try:
        return datetime.strptime(d_str, "%Y-%m-%d")
    except ValueError:
        return datetime.utcnow()

@router.get("/api/businesses/{business_id}/consumption")
def get_consumption_analysis(
    business_id: str,
    period: str = "daily",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location_id: Optional[str] = None,
    category_id: Optional[str] = None,
    stock_item_id: Optional[str] = None,
    group_by: Optional[str] = "none",
    show: Optional[str] = "all",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if location_id:
        verify_user_permission(current_user, business_id, "view_sales", location_id=location_id, session=session)
    else:
        verify_user_permission(current_user, business_id, "view_sales", session=session)

    target_dt = datetime.utcnow()
    if start_date:
        target_dt = parse_date_str(start_date)

    if period == "daily":
        start_dt = datetime(target_dt.year, target_dt.month, target_dt.day, 0, 0, 0)
        end_dt = datetime(target_dt.year, target_dt.month, target_dt.day, 23, 59, 59)
        prev_start_dt = start_dt - timedelta(days=1)
        prev_end_dt = end_dt - timedelta(days=1)
    elif period == "weekly":
        start_dt = target_dt - timedelta(days=target_dt.weekday())
        start_dt = datetime(start_dt.year, start_dt.month, start_dt.day, 0, 0, 0)
        end_dt = start_dt + timedelta(days=6, hours=23, minutes=59, seconds=59)
        prev_start_dt = start_dt - timedelta(days=7)
        prev_end_dt = end_dt - timedelta(days=7)
    elif period == "monthly":
        start_dt = datetime(target_dt.year, target_dt.month, 1, 0, 0, 0)
        if target_dt.month == 12:
            next_month = datetime(target_dt.year + 1, 1, 1, 0, 0, 0)
        else:
            next_month = datetime(target_dt.year, target_dt.month + 1, 1, 0, 0, 0)
        end_dt = next_month - timedelta(seconds=1)
        prev_start_dt = (start_dt - timedelta(days=15)).replace(day=1)
        prev_end_dt = start_dt - timedelta(seconds=1)
    else:
        start_dt = parse_date_str(start_date) if start_date else datetime.utcnow() - timedelta(days=30)
        start_dt = datetime(start_dt.year, start_dt.month, start_dt.day, 0, 0, 0)
        end_dt = parse_date_str(end_date) if end_date else datetime.utcnow()
        end_dt = datetime(end_dt.year, end_dt.month, end_dt.day, 23, 59, 59)
        delta = end_dt - start_dt
        prev_start_dt = start_dt - delta
        prev_end_dt = start_dt - timedelta(seconds=1)

    items_query = select(StockItem).where(StockItem.business_id == business_id, StockItem.is_active == True)
    if category_id:
        items_query = items_query.where(StockItem.category_id == category_id)
    if stock_item_id:
        items_query = items_query.where(StockItem.id == stock_item_id)
    items = session.exec(items_query).all()

    locations_query = select(Location).where(Location.business_id == business_id)
    locations = session.exec(locations_query).all()
    location_ids = [l.id for l in locations]


    if location_id:
        verify_user_permission(current_user, business_id, "view_sales", location_id=location_id, session=session)
        locations_to_process = [location_id]
    else:
        allowed_locs = get_allowed_locations(current_user, business_id, "view_sales", session)
        if allowed_locs is not None:
            locations_to_process = [l for l in allowed_locs if l is not None]
        else:
            locations_to_process = location_ids + [None]

    items_metrics = []
    total_val_curr = 0.0
    total_val_prev = 0.0
    total_units_curr = 0.0
    total_units_prev = 0.0

    timeline_granularity = []
    if period == "daily":
        timeline_granularity = [
            (start_dt + timedelta(hours=i), start_dt + timedelta(hours=i+4))
            for i in range(0, 24, 4)
        ]
    elif period == "weekly":
        timeline_granularity = [
            (start_dt + timedelta(days=i), start_dt + timedelta(days=i, hours=23, minutes=59, seconds=59))
            # 7 days of the week
            for i in range(7)
        ]
    elif period == "monthly":
        days_in_month = (end_dt - start_dt).days + 1
        timeline_granularity = [
            (start_dt + timedelta(days=i), start_dt + timedelta(days=i, hours=23, minutes=59, seconds=59))
            for i in range(days_in_month)
        ]
    else:
        days_total = (end_dt - start_dt).days + 1
        if days_total <= 30:
            timeline_granularity = [
                (start_dt + timedelta(days=i), start_dt + timedelta(days=i, hours=23, minutes=59, seconds=59))
                for i in range(days_total)
            ]
        elif days_total <= 90:
            timeline_granularity = [
                (start_dt + timedelta(weeks=i), start_dt + timedelta(weeks=i, days=6, hours=23, minutes=59, seconds=59))
                for i in range((days_total // 7) + 1)
            ]
        else:
            timeline_granularity = []
            curr_month_start = start_dt
            while curr_month_start < end_dt:
                if curr_month_start.month == 12:
                    next_m = datetime(curr_month_start.year + 1, 1, 1)
                else:
                    next_m = datetime(curr_month_start.year, curr_month_start.month + 1, 1)
                curr_month_end = next_m - timedelta(seconds=1)
                timeline_granularity.append((curr_month_start, curr_month_end))
                curr_month_start = next_m

    timeline_points = [{"label": "", "consumed": 0.0, "value": 0.0} for _ in timeline_granularity]
    for idx, (s_g, e_g) in enumerate(timeline_granularity):
        if period == "daily":
            timeline_points[idx]["label"] = s_g.strftime("%I %p").lstrip("0")
        elif period == "weekly":
            timeline_points[idx]["label"] = s_g.strftime("%a")
        elif period == "monthly":
            timeline_points[idx]["label"] = s_g.strftime("%d %b")
        else:
            days_total = (end_dt - start_dt).days + 1
            if days_total <= 30:
                timeline_points[idx]["label"] = s_g.strftime("%d %b")
            elif days_total <= 90:
                timeline_points[idx]["label"] = f"W{idx+1}"
            else:
                timeline_points[idx]["label"] = s_g.strftime("%b %y")

    for item in items:
        item_consumed_curr = 0.0
        item_consumed_prev = 0.0
        item_delivered_curr = 0.0
        item_delivered_prev = 0.0
        item_opening_curr = 0.0
        item_closing_curr = 0.0

        item_timeline_consumed = [0.0] * len(timeline_granularity)
        item_timeline_value = [0.0] * len(timeline_granularity)

        for loc_id in locations_to_process:
            sc_query = select(StockCountItem, StockCountSession).join(StockCountSession).where(
                StockCountItem.item_id == item.id,
                StockCountSession.status == StockCountStatus.completed,
                StockCountSession.business_id == business_id
            )
            if loc_id:
                sc_query = sc_query.where(StockCountSession.location_id == loc_id)
            else:
                sc_query = sc_query.where(StockCountSession.location_id == None)
            sc_results = session.exec(sc_query).all()

            del_query = select(DeliveryItem, Delivery).join(Delivery).where(
                DeliveryItem.stock_item_id == item.id,
                Delivery.business_id == business_id
            )
            del_query = del_query.join(PurchaseOrder, Delivery.purchase_order_id == PurchaseOrder.id)
            if loc_id:
                del_query = del_query.where(PurchaseOrder.location_id == loc_id)
            else:
                del_query = del_query.where(PurchaseOrder.location_id == None)
            del_results = session.exec(del_query).all()

            ing_query = select(RecipeIngredient).where(RecipeIngredient.item_id == item.id)
            ingredients = session.exec(ing_query).all()
            recipe_yield_map = {}
            for ing in ingredients:
                recipe = session.get(Recipe, ing.recipe_id)
                if recipe and recipe.business_id == business_id:
                    recipe_yield_map[ing.recipe_id] = (ing.qty_used, recipe.yield_qty)

            sale_items = []
            if recipe_yield_map:
                sale_query = select(SaleItem, Sale).join(Sale).where(
                    SaleItem.recipe_id.in_(list(recipe_yield_map.keys())),
                    Sale.status == "completed",
                    Sale.business_id == business_id
                )
                if loc_id:
                    sale_query = sale_query.where(Sale.location_id == loc_id)
                else:
                    sale_query = sale_query.where(Sale.location_id == None)
                sale_items = session.exec(sale_query).all()

            current_stock = 0.0
            if loc_id:
                sil = session.exec(select(StockItemLocation).where(
                    StockItemLocation.stock_item_id == item.id,
                    StockItemLocation.location_id == loc_id
                )).first()
                if sil:
                    current_stock = sil.current_stock
            else:
                sil_list = session.exec(select(StockItemLocation).where(
                    StockItemLocation.stock_item_id == item.id
                )).all()
                current_stock = sum(s.current_stock for s in sil_list)

            timestamps = [item.created_at]
            for _, d_rec in del_results:
                timestamps.append(d_rec.delivery_date)
            for _, s_rec in sale_items:
                timestamps.append(s_rec.created_at)
            for _, s_sess in sc_results:
                try:
                    count_dt = datetime.strptime(s_sess.count_date, "%Y-%m-%d")
                    timestamps.append(datetime(count_dt.year, count_dt.month, count_dt.day, 23, 59, 59))
                except Exception:
                    timestamps.append(s_sess.completed_at or s_sess.created_at)

            t_start = min(timestamps) - timedelta(days=1) if timestamps else datetime.utcnow() - timedelta(days=365)

            events = [(t_start, 0.0)]
            for ci, s_sess in sc_results:
                try:
                    ts = datetime.strptime(s_sess.count_date, "%Y-%m-%d")
                    ts = datetime(ts.year, ts.month, ts.day, 23, 59, 59)
                except Exception:
                    ts = s_sess.completed_at or s_sess.created_at
                if ci.counted_qty is not None:
                    events.append((ts, ci.counted_qty))

            events.sort(key=lambda x: x[0])
            events.append((datetime.utcnow(), current_stock))

            cleaned_events = []
            for ts, qty in events:
                if cleaned_events and cleaned_events[-1][0] == ts:
                    cleaned_events[-1] = (ts, qty)
                else:
                    cleaned_events.append((ts, qty))

            daily_consumption = {}
            daily_deliveries = {}

            for k in range(len(cleaned_events) - 1):
                t_curr, q_curr = cleaned_events[k]
                t_next, q_next = cleaned_events[k+1]

                del_in_int = sum(di.received_quantity for di, d_rec in del_results if t_curr < d_rec.delivery_date <= t_next)
                c_total = max(0.0, q_curr + del_in_int - q_next)

                start_day = t_curr.date()
                end_day = t_next.date()
                days_list = []
                curr_day = start_day
                while curr_day <= end_day:
                    days_list.append(curr_day)
                    curr_day += timedelta(days=1)

                u_total = 0.0
                daily_usage = {}
                for si, s_rec in sale_items:
                    if t_curr < s_rec.created_at <= t_next:
                        qty_used, yield_qty = recipe_yield_map[si.recipe_id]
                        used = (si.quantity * qty_used) / yield_qty
                        u_total += used
                        sale_day = s_rec.created_at.date()
                        daily_usage[sale_day] = daily_usage.get(sale_day, 0.0) + used

                for d in days_list:
                    if u_total > 0.0:
                        c_d = c_total * (daily_usage.get(d, 0.0) / u_total)
                    else:
                        c_d = c_total / len(days_list)
                    daily_consumption[d] = daily_consumption.get(d, 0.0) + c_d

            for di, d_rec in del_results:
                d_date = d_rec.delivery_date.date()
                daily_deliveries[d_date] = daily_deliveries.get(d_date, 0.0) + di.received_quantity

            all_days_sorted = sorted(list(set(list(daily_consumption.keys()) + list(daily_deliveries.keys()))))
            
            cumulative_stock = 0.0
            stock_by_day = {}
            for d in all_days_sorted:
                opening = cumulative_stock
                deliveries = daily_deliveries.get(d, 0.0)
                consumed = daily_consumption.get(d, 0.0)
                closing = opening + deliveries - consumed
                stock_by_day[d] = closing
                cumulative_stock = closing

            def get_stock_at_day_end(target_day: date) -> float:
                if target_day in stock_by_day:
                    return stock_by_day[target_day]
                past_days = [d for d in all_days_sorted if d < target_day]
                if past_days:
                    return stock_by_day[max(past_days)]
                return 0.0

            calc_start_date = min(prev_start_dt, start_dt).date()
            calc_end_date = end_dt.date()
            loop_date = calc_start_date
            while loop_date <= calc_end_date:
                daily_consumed_qty = daily_consumption.get(loop_date, 0.0)
                daily_delivered_qty = daily_deliveries.get(loop_date, 0.0)

                if start_dt.date() <= loop_date <= end_dt.date():
                    item_consumed_curr += daily_consumed_qty
                    item_delivered_curr += daily_delivered_qty

                    for g_idx, (s_g, e_g) in enumerate(timeline_granularity):
                        if period == "daily":
                            hourly_usage_total = 0.0
                            hourly_usage_g = 0.0
                            for si, s_rec in sale_items:
                                if s_rec.created_at.date() == loop_date:
                                    qty_used, yield_qty = recipe_yield_map[si.recipe_id]
                                    used = (si.quantity * qty_used) / yield_qty
                                    hourly_usage_total += used
                                    if s_g <= s_rec.created_at < e_g:
                                        hourly_usage_g += used
                            if hourly_usage_total > 0.0:
                                g_consumed = daily_consumed_qty * (hourly_usage_g / hourly_usage_total)
                            else:
                                g_consumed = daily_consumed_qty / len(timeline_granularity)
                            item_timeline_consumed[g_idx] += g_consumed
                        else:
                            if s_g.date() <= loop_date <= e_g.date():
                                item_timeline_consumed[g_idx] += daily_consumed_qty

                if prev_start_dt.date() <= loop_date <= prev_end_dt.date():
                    item_consumed_prev += daily_consumed_qty
                    item_delivered_prev += daily_delivered_qty

                loop_date += timedelta(days=1)

            item_opening_curr += get_stock_at_day_end(start_dt.date() - timedelta(days=1))
            item_closing_curr += get_stock_at_day_end(end_dt.date())

        item_consumed_curr = max(0.0, item_consumed_curr)
        item_consumed_prev = max(0.0, item_consumed_prev)
        for g_idx in range(len(item_timeline_consumed)):
            item_timeline_consumed[g_idx] = max(0.0, item_timeline_consumed[g_idx])
            item_timeline_value[g_idx] = item_timeline_consumed[g_idx] * (item.cost_per_base_unit or 0.0)

        item_value_curr = item_consumed_curr * (item.cost_per_base_unit or 0.0)
        item_value_prev = item_consumed_prev * (item.cost_per_base_unit or 0.0)

        total_val_curr += item_value_curr
        total_val_prev += item_value_prev
        total_units_curr += item_consumed_curr
        total_units_prev += item_consumed_prev

        for g_idx in range(len(timeline_points)):
            timeline_points[g_idx]["consumed"] += item_timeline_consumed[g_idx]
            timeline_points[g_idx]["value"] += item_timeline_value[g_idx]

        items_metrics.append({
            "id": item.id,
            "name": item.name,
            "sku": item.sku or "",
            "category": item.category.name if item.category else "Uncategorized",
            "category_icon": item.category.icon if item.category else "",
            "base_unit": item.base_unit,
            "consumed_qty": item_consumed_curr,
            "value": item_value_curr,
            "opening_stock": item_opening_curr,
            "deliveries": item_delivered_curr,
            "closing_stock": item_closing_curr,
            "image_url": item.image_url or ""
        })

    active_items_consumed = [im for im in items_metrics if im["consumed_qty"] > 0.0]
    items_consumed_count = len(active_items_consumed)

    for im in items_metrics:
        im["pct_of_total"] = (im["value"] / total_val_curr * 100.0) if total_val_curr > 0.0 else 0.0

    items_metrics.sort(key=lambda x: x["value"], reverse=True)
    if show == "top_consumed":
        items_metrics = items_metrics[:10]

    vs_yesterday_pct = 0.0
    if total_units_prev > 0.0:
        vs_yesterday_pct = ((total_units_curr - total_units_prev) / total_units_prev) * 100.0
    else:
        vs_yesterday_pct = 100.0 if total_units_curr > 0.0 else 0.0

    vs_yesterday_units = total_units_curr - total_units_prev

    return {
        "summary": {
            "total_consumption": total_units_curr,
            "total_value": total_val_curr,
            "items_consumed_count": items_consumed_count,
            "vs_yesterday_pct": vs_yesterday_pct,
            "vs_yesterday_units": vs_yesterday_units
        },
        "timeline": timeline_points,
        "items": items_metrics
    }
