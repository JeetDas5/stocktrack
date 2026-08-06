from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlmodel import Session, select

from app.models import Location, SquareImportHistory


def format_square_address(address_dict: Optional[Dict[str, Any]]) -> Optional[str]:
    if not address_dict or not isinstance(address_dict, dict):
        return None
    parts = [
        address_dict.get("address_line_1"),
        address_dict.get("address_line_2"),
        address_dict.get("locality"),
        address_dict.get("administrative_district_level_1"),
        address_dict.get("postal_code"),
        address_dict.get("country"),
    ]
    cleaned = [p.strip() for p in parts if p and isinstance(p, str) and p.strip()]
    return ", ".join(cleaned) if cleaned else None


def preview_square_location_import(
    session: Session, business_id: str, square_locations: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Performs field mapping and duplicate detection scan for Square locations against NexBrix DB.
    """
    # Fetch existing locations for this business
    stmt = select(Location).where(Location.business_id == business_id)
    existing_locations = session.exec(stmt).all()

    existing_by_square_id = {
        loc.square_location_id: loc for loc in existing_locations if loc.square_location_id
    }
    existing_by_name = {
        loc.name.strip().lower(): loc for loc in existing_locations if loc.name
    }

    items_preview = []
    new_count = 0
    duplicate_count = 0

    for sq_loc in square_locations:
        sq_id = sq_loc.get("id")
        sq_name = (sq_loc.get("name") or "Unnamed Location").strip()
        sq_address = format_square_address(sq_loc.get("address"))
        sq_status = sq_loc.get("status", "ACTIVE")
        is_active = sq_status.upper() == "ACTIVE"

        # Check for duplicates
        existing_match: Optional[Location] = None
        match_reason: Optional[str] = None

        if sq_id in existing_by_square_id:
            existing_match = existing_by_square_id[sq_id]
            match_reason = "Matched by Square Location ID"
        elif sq_name.lower() in existing_by_name:
            existing_match = existing_by_name[sq_name.lower()]
            match_reason = "Matched by Location Name"

        match_status = "duplicate" if existing_match else "new"
        if existing_match:
            duplicate_count += 1
        else:
            new_count += 1

        items_preview.append(
            {
                "square_id": sq_id,
                "square_name": sq_name,
                "square_address": sq_address,
                "square_status": sq_status,
                "square_type": sq_loc.get("type", "PHYSICAL"),
                "square_merchant_id": sq_loc.get("merchant_id"),
                "mapped_name": sq_name,
                "mapped_address": sq_address or "",
                "mapped_type": "store",
                "mapped_is_warehouse": False,  # Default, can be toggled by user in UI
                "mapped_is_active": is_active,
                "match_status": match_status,
                "match_reason": match_reason,
                "existing_location_id": existing_match.id if existing_match else None,
                "existing_location_name": existing_match.name if existing_match else None,
                "default_action": "update" if existing_match else "create",
            }
        )

    return {
        "entity_type": "location",
        "total_found": len(square_locations),
        "new_count": new_count,
        "duplicate_count": duplicate_count,
        "items": items_preview,
    }


def execute_square_location_import(
    session: Session,
    business_id: str,
    user_id: str,
    items_to_import: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Executes actual DB updates and creates an audit history record.
    """
    created_count = 0
    updated_count = 0
    skipped_count = 0

    log_details = []

    for item in items_to_import:
        action = item.get("action", "create")  # "create", "update", "skip"
        sq_id = item.get("square_id")
        name = item.get("mapped_name") or item.get("square_name") or "Unnamed Location"
        address = item.get("mapped_address")
        is_warehouse = bool(item.get("mapped_is_warehouse", False))
        is_active = bool(item.get("mapped_is_active", True))
        loc_type = item.get("mapped_type", "store")

        if action == "skip":
            skipped_count += 1
            log_details.append(
                {"square_id": sq_id, "name": name, "action": "skipped"}
            )
            continue

        existing_id = item.get("existing_location_id")
        existing_loc: Optional[Location] = None

        if existing_id:
            existing_loc = session.get(Location, existing_id)

        if not existing_loc and sq_id:
            stmt = select(Location).where(
                Location.business_id == business_id, Location.square_location_id == sq_id
            )
            existing_loc = session.exec(stmt).first()

        if action == "update" and existing_loc:
            existing_loc.square_location_id = sq_id
            existing_loc.name = name
            if address:
                existing_loc.address = address
            existing_loc.is_warehouse = is_warehouse
            existing_loc.is_active = is_active
            existing_loc.type = loc_type
            session.add(existing_loc)
            updated_count += 1
            log_details.append(
                {
                    "square_id": sq_id,
                    "location_id": existing_loc.id,
                    "name": name,
                    "action": "updated",
                }
            )
        else:
            # Create new location
            new_loc = Location(
                business_id=business_id,
                square_location_id=sq_id,
                name=name,
                address=address,
                type=loc_type,
                is_warehouse=is_warehouse,
                is_active=is_active,
                created_at=datetime.now(timezone.utc),
            )
            session.add(new_loc)
            created_count += 1
            log_details.append(
                {
                    "square_id": sq_id,
                    "name": name,
                    "action": "created",
                }
            )

    # Save Audit History Record
    history_record = SquareImportHistory(
        business_id=business_id,
        user_id=user_id,
        entity_type="location",
        status="success",
        created_count=created_count,
        updated_count=updated_count,
        skipped_count=skipped_count,
        field_mappings={"location_fields": ["name", "address", "type", "is_warehouse"]},
        summary_log={"items": log_details},
        created_at=datetime.now(timezone.utc),
    )
    session.add(history_record)

    session.commit()

    return {
        "status": "success",
        "entity_type": "location",
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "history_id": history_record.id,
    }
