from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import User
from app.services.auth.utils import hash_password, verify_password, create_access_token

import os
import uuid
import random
import resend
import logging
from datetime import datetime, timedelta
from app.models import Verification, SessionTable

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])


class UserRegister(SQLModel):
    email: str
    password: str
    name: Optional[str] = None


class UserLogin(SQLModel):
    email: str
    password: str


class AuthResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    user: User


@router.post(
    "/api/auth/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user profile",
    description="Creates a new user profile with a hashed password in the system and returns a newly minted JWT access token.",
    responses={
        201: {"description": "User successfully registered and authenticated."},
        400: {"description": "Email address already registered with another account."},
    },
)
def register_user(user_data: UserRegister, session: Session = Depends(get_session)):
    """
    **Register a New User**

    - **email**: Valid email address to be used as username.
    - **password**: Secure raw password (will be automatically hashed before persistence).
    - **name**: Optional full name of the user.
    """
    statement = select(User).where(User.email == user_data.email)
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered",
        )

    hashed = hash_password(user_data.password)
    user = User(email=user_data.email, name=user_data.name, hashed_password=hashed)
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post(
    "/api/auth/login",
    response_model=AuthResponse,
    summary="Authenticate a user",
    description="Verifies the provided email and password credentials, and issues a JWT access token for subsequent authorized API calls.",
    responses={
        200: {"description": "User successfully authenticated and token issued."},
        401: {"description": "Invalid email or password credentials provided."},
    },
)
def login_user(credentials: UserLogin, session: Session = Depends(get_session)):
    """
    **User Login**

    - **email**: User's registered email address.
    - **password**: Secure plain text password.
    """
    statement = select(User).where(User.email == credentials.email)
    user = session.exec(statement).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials",
        )

    token = create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/api/auth/roles-permissions")
def get_roles_permissions():
    from app.services.auth.dependencies import permissions_loader

    # Ensure it's populated
    permissions_loader.get_role_permissions("admin")
    return permissions_loader.cached_permissions


class OTPSendRequest(SQLModel):
    email: str


class OTPVerifyRequest(SQLModel):
    email: str
    otp: str


@router.post("/api/auth/send-otp")
def send_otp(data: OTPSendRequest, session: Session = Depends(get_session)):
    email = data.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email address is required")

    # Store in verifications table
    stmt = select(Verification).where(Verification.identifier == email)
    ver = session.exec(stmt).first()

    if ver:
        # Rate limiting: 1 request per 60 seconds
        last_sent = ver.updated_at or ver.created_at or datetime.utcnow()
        if datetime.utcnow() - last_sent < timedelta(seconds=60):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait 60 seconds before requesting another verification code."
            )

    otp = str(random.randint(100000, 999999))
    hashed_otp = hash_password(otp)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    if ver:
        ver.value = hashed_otp
        ver.expires_at = expires_at
        ver.updated_at = datetime.utcnow()
        session.add(ver)
    else:
        ver = Verification(
            id=str(uuid.uuid4()), identifier=email, value=hashed_otp, expires_at=expires_at
        )
        session.add(ver)
    session.commit()

    # Send email
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="RESEND_API_KEY environment variable is not configured",
        )
    resend.api_key = api_key

    try:
        resend.Emails.send(
            {
                "from": "NexBrix <info@nexbrix.com.au>",
                "to": [email],
                "subject": "Staff Onboarding - Verification Code | NexBrix",
                "html": f"<p>Your verification code for Staff Onboarding is: <strong>{otp}</strong></p><p>This code will expire in 10 minutes.</p>",
            }
        )
    except Exception as e:
        logger.exception("Failed to send verification email via Resend")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please try again later."
        )

    return {"message": "Verification code sent successfully"}


@router.post("/api/auth/verify-otp")
def verify_otp(data: OTPVerifyRequest, session: Session = Depends(get_session)):
    email = data.email.strip().lower()
    otp = data.otp.strip()

    if not email or not otp:
        raise HTTPException(
            status_code=400, detail="Email and verification code are required"
        )

    stmt = select(Verification).where(Verification.identifier == email)
    ver = session.exec(stmt).first()
    if not ver or ver.expires_at < datetime.utcnow() or not verify_password(otp, ver.value):
        raise HTTPException(
            status_code=400, detail="Invalid or expired verification code"
        )

    # Delete verification record to prevent reuse
    session.delete(ver)
    session.commit()

    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()), email=email, email_verified=True, role="staff"
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    else:
        user.email_verified = True
        session.add(user)
        session.commit()
        session.refresh(user)

    # Create session
    session_token = str(uuid.uuid4()).replace("-", "")
    session_id = str(uuid.uuid4())
    db_session = SessionTable(
        id=session_id,
        token=session_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    session.add(db_session)
    session.commit()

    return {"token": session_token, "user": user}
