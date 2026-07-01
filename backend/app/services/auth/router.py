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
    print("otp: ",otp)
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

    base_url = os.environ.get("BETTER_AUTH_URL") or "http://localhost:3000"
    if base_url.endswith("/"):
        base_url = base_url[:-1]
    
    logo_url = "https://nexbrix.com.au/logos/logo.png"
    dashboard_url = f"{base_url}/dashboard"
    privacy_url = f"{base_url}/privacy-policy"
    terms_url = f"{base_url}/terms"
    current_year = datetime.utcnow().year

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff;">
      <!-- Logo Header -->
      <div style="margin-bottom: 24px; text-align: left;">
        <img src="{logo_url}" alt="NexBrix Logo" style="height: 32px; max-width: 150px; display: block; object-fit: contain;" />
      </div>

      <!-- Content -->
      <h2 style="font-size: 20px; font-weight: 700; color: #09090b; margin-top: 0; margin-bottom: 12px; tracking-tight: -0.02em;">OTP for Login</h2>
      <p style="color: #52525b; font-size: 14px; line-height: 1.5; margin-top: 0; margin-bottom: 24px;">
        Hello,<br/><br/>
        You are receiving this email because a request was made to log in to your NexBrix account. Please use the following One-Time Password (OTP) to securely complete your login:
      </p>

      <!-- OTP Display -->
      <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <div style="font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 700; color: #09090b; letter-spacing: 6px; line-height: 1;">
          {otp}
        </div>
      </div>

      <!-- Notice -->
      <p style="color: #71717a; font-size: 12px; line-height: 1.6; margin-top: 0; margin-bottom: 32px;">
        This verification code is valid for <strong>10 minutes</strong>. If you did not request this login, you can safely ignore this email or contact support if you have security concerns.
      </p>

      <!-- Divider -->
      <div style="border-top: 1px solid #e4e4e7; margin-bottom: 20px;"></div>

      <!-- Footer -->
      <div style="text-align: center;">
        <p style="color: #a1a1aa; font-size: 11px; margin-top: 0; margin-bottom: 12px; font-weight: 500;">
          <a href="{dashboard_url}" style="color: #71717a; text-decoration: underline; margin-right: 12px;">Dashboard</a>
          <a href="{privacy_url}" style="color: #71717a; text-decoration: underline; margin-right: 12px;">Privacy Policy</a>
          <a href="{terms_url}" style="color: #71717a; text-decoration: underline;">Terms of Service</a>
        </p>
        <p style="color: #a1a1aa; font-size: 11px; line-height: 1.4; margin: 0;">
          © {current_year} NexBrix. All rights reserved.
        </p>
      </div>
    </div>
    """

    try:
        resend.Emails.send(
            {
                "from": "NexBrix <info@nexbrix.com.au>",
                "to": [email],
                "subject": "OTP for Login | NexBrix",
                "html": html_content,
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
        expires_at=datetime.utcnow() + timedelta(days=30),
    )
    session.add(db_session)
    session.commit()

    return {"token": session_token, "user": user}
