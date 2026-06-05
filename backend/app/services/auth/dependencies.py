from datetime import datetime
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, SessionTable, Business, UserAssignment
from app.services.auth.utils import decode_access_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = credentials.credentials
    decoded = decode_access_token(token)
    uid = None
    if decoded:
        uid = decoded.get("sub")
    else:
        db_session = session.exec(
            select(SessionTable).where(SessionTable.token == token)
        ).first()
        if db_session and db_session.expires_at > datetime.utcnow():
            uid = db_session.user_id

    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed, session expired, or token invalid"
        )

    user = session.get(User, uid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User profile not found in database"
        )

    return user


def verify_user_permission(
    user: User,
    business_id: str,
    permission: str,
    location_id: Optional[str] = None,
    session: Session = None,
):
    """
    Verifies that the user has the given permission for a business and location.
    If unauthorized, raises HTTPException(403).
    """
    if user.role == "super_admin":
        return

    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )

    if business.created_by_id == user.id:
        return

    stmt = select(UserAssignment).where(
        UserAssignment.user_id == user.id,
        UserAssignment.business_id == business_id,
        UserAssignment.is_active == True
    )
    assignments = session.exec(stmt).all()
    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this business"
        )

    for assignment in assignments:
        if assignment.role in ("super_admin", "admin"):
            if assignment.location_id is None or assignment.location_id == location_id:
                return

        if permission == "view_business" or permission in assignment.permissions or "admin" in assignment.permissions:
            if location_id is None or assignment.location_id is None or assignment.location_id == location_id:
                return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Not authorized. Missing permission: '{permission}'"
    )


def get_allowed_locations(
    user: User,
    business_id: str,
    permission: str,
    session: Session,
) -> Optional[List[Optional[str]]]:
    """
    Returns a list of location IDs the user has access to for the given permission.
    If the user has full access to the business (admin/creator/super_admin), returns None (which indicates all locations).
    Otherwise, returns a list of allowed location_ids (which can include None/Null if they have a business-wide assignment).
    """
    if user.role == "super_admin":
        return None

    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )

    if business.created_by_id == user.id:
        return None

    stmt = select(UserAssignment).where(
        UserAssignment.user_id == user.id,
        UserAssignment.business_id == business_id,
        UserAssignment.is_active == True
    )
    assignments = session.exec(stmt).all()
    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this business"
        )

    allowed_locs = []
    for ass in assignments:
        if ass.role in ("super_admin", "admin"):
            if ass.location_id is None:
                return None
            else:
                allowed_locs.append(ass.location_id)
        elif permission in ass.permissions or "admin" in ass.permissions:
            if ass.location_id is None:
                return None
            else:
                allowed_locs.append(ass.location_id)

    return allowed_locs

