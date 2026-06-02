from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session

from app.database import get_session
from app.models import User
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

    from datetime import datetime
    from sqlmodel import select
    from app.models import SessionTable

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
