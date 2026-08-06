from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, SquareToken, SquareImportHistory
from app.services.auth.dependencies import get_current_user
from app.services.square.service import (
    get_square_authorize_url,
    exchange_code_for_tokens,
    refresh_square_tokens,
    fetch_square_catalog,
    fetch_square_locations,
    get_square_environment,
)
from app.services.square.importer import (
    preview_square_location_import,
    execute_square_location_import,
)

router = APIRouter(prefix="/api/square", tags=["Square Integration"])


class CallbackRequest(BaseModel):
    business_id: str
    code: str


class ExecuteLocationImportRequest(BaseModel):
    business_id: str
    items: List[Dict[str, Any]]



@router.get("/authorize-url")
def get_authorize_url(
    business_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the Square OAuth Authorization URL for the user to grant permissions.
    """
    if not business_id:
        raise HTTPException(status_code=400, detail="business_id is required")
    try:
        state = f"{business_id}:{current_user.id}"
        url = get_square_authorize_url(state)
        return {"authorize_url": url}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/callback")
def handle_callback(
    payload: CallbackRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Exchanges the OAuth authorization code for access and refresh tokens, saving them to the database.
    """
    if not payload.code or not payload.business_id:
        raise HTTPException(status_code=400, detail="code and business_id are required")

    try:
        data = exchange_code_for_tokens(payload.code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    access_token = data.get("access_token")
    refresh_token = data.get("refresh_token")
    merchant_id = data.get("merchant_id")
    token_type = data.get("token_type", "bearer")
    expires_at_raw = data.get("expires_at")

    expires_at = None
    if expires_at_raw:
        try:
            expires_at = datetime.fromisoformat(expires_at_raw.replace("Z", "+00:00"))
        except Exception:
            expires_at = None

    # Check if a token record already exists for this business
    statement = select(SquareToken).where(SquareToken.business_id == payload.business_id)
    token_record = session.exec(statement).first()

    if not token_record:
        token_record = SquareToken(
            business_id=payload.business_id,
            user_id=current_user.id,
            merchant_id=merchant_id,
            access_token=access_token,
            refresh_token=refresh_token,
            token_type=token_type,
            expires_at=expires_at,
            environment=get_square_environment(),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(token_record)
    else:
        token_record.user_id = current_user.id
        token_record.merchant_id = merchant_id
        token_record.access_token = access_token
        if refresh_token:
            token_record.refresh_token = refresh_token
        token_record.token_type = token_type
        token_record.expires_at = expires_at
        token_record.environment = get_square_environment()
        token_record.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(token_record)

    return {
        "status": "success",
        "message": "Square account connected successfully!",
        "merchant_id": merchant_id,
        "environment": get_square_environment(),
    }


@router.get("/status")
def get_connection_status(
    business_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Returns connection status for Square for the specified business.
    """
    statement = select(SquareToken).where(SquareToken.business_id == business_id)
    token_record = session.exec(statement).first()

    if not token_record or not token_record.access_token:
        return {"connected": False}

    return {
        "connected": True,
        "merchant_id": token_record.merchant_id,
        "environment": token_record.environment,
        "expires_at": token_record.expires_at,
        "updated_at": token_record.updated_at,
    }


@router.post("/disconnect")
def disconnect_square(
    business_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Disconnects Square integration for the specified business by removing stored tokens.
    """
    statement = select(SquareToken).where(SquareToken.business_id == business_id)
    token_records = session.exec(statement).all()

    for rec in token_records:
        session.delete(rec)

    session.commit()
    return {"status": "success", "message": "Square account disconnected successfully."}


@router.get("/catalog")
def get_catalog_list(
    business_id: str = Query(...),
    types: Optional[str] = Query(None, description="Comma-separated catalog object types, e.g., category,tax,ITEM"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Lists catalog objects from Square API for the connected merchant account.
    Auto-refreshes access token if expired and refresh_token is available.
    """
    statement = select(SquareToken).where(SquareToken.business_id == business_id)
    token_record = session.exec(statement).first()

    if not token_record or not token_record.access_token:
        raise HTTPException(
            status_code=400,
            detail="Square account is not connected. Please connect your Square account first.",
        )

    # Check if token is expired or near expiration (within 5 mins)
    now_utc = datetime.now(timezone.utc)
    if token_record.expires_at:
        exp_time = token_record.expires_at
        if exp_time.tzinfo is None:
            exp_time = exp_time.replace(tzinfo=timezone.utc)
        
        if (exp_time - now_utc).total_seconds() < 300:
            if token_record.refresh_token:
                try:
                    refreshed = refresh_square_tokens(token_record.refresh_token)
                    token_record.access_token = refreshed.get("access_token", token_record.access_token)
                    if refreshed.get("refresh_token"):
                        token_record.refresh_token = refreshed["refresh_token"]
                    new_exp = refreshed.get("expires_at")
                    if new_exp:
                        try:
                            token_record.expires_at = datetime.fromisoformat(new_exp.replace("Z", "+00:00"))
                        except Exception:
                            pass
                    token_record.updated_at = now_utc
                    session.commit()
                except Exception as e:
                    print(f"Warning: Failed to auto-refresh Square token: {e}")

    try:
        catalog_data = fetch_square_catalog(
            access_token=token_record.access_token,
            types=types,
            env=token_record.environment,
        )
        return catalog_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/locations")
def get_square_locations_endpoint(
    business_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Fetches raw location list from Square API for the connected merchant account.
    """
    statement = select(SquareToken).where(SquareToken.business_id == business_id)
    token_record = session.exec(statement).first()

    if not token_record or not token_record.access_token:
        raise HTTPException(
            status_code=400,
            detail="Square account is not connected. Please connect your Square account first.",
        )

    try:
        data = fetch_square_locations(
            access_token=token_record.access_token,
            env=token_record.environment,
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import/locations/preview")
def preview_locations_import_endpoint(
    business_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Fetches locations from Square and returns field mapping + duplicate detection analysis.
    """
    statement = select(SquareToken).where(SquareToken.business_id == business_id)
    token_record = session.exec(statement).first()

    if not token_record or not token_record.access_token:
        raise HTTPException(
            status_code=400,
            detail="Square account is not connected. Please connect your Square account first.",
        )

    try:
        raw = fetch_square_locations(
            access_token=token_record.access_token,
            env=token_record.environment,
        )
        sq_locations = raw.get("locations", [])
        analysis = preview_square_location_import(
            session=session,
            business_id=business_id,
            square_locations=sq_locations,
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import/locations")
def execute_locations_import_endpoint(
    payload: ExecuteLocationImportRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Executes location import/sync based on user's duplicate resolution rules.
    """
    if not payload.business_id or not payload.items:
        raise HTTPException(status_code=400, detail="business_id and items are required")

    try:
        res = execute_square_location_import(
            session=session,
            business_id=payload.business_id,
            user_id=current_user.id,
            items_to_import=payload.items,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/import/history")
def get_import_history_endpoint(
    business_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Returns audit history log for imports performed for the specified business.
    """
    stmt = (
        select(SquareImportHistory)
        .where(SquareImportHistory.business_id == business_id)
        .order_by(SquareImportHistory.created_at.desc())
    )
    records = session.exec(stmt).all()
    return {"history": records}

