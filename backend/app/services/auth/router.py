from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.models import User
from app.services.auth.utils import hash_password, verify_password, create_access_token

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
    }
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
            detail="Email address already registered"
        )

    hashed = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(data={"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post(
    "/api/auth/login",
    response_model=AuthResponse,
    summary="Authenticate a user",
    description="Verifies the provided email and password credentials, and issues a JWT access token for subsequent authorized API calls.",
    responses={
        200: {"description": "User successfully authenticated and token issued."},
        401: {"description": "Invalid email or password credentials provided."},
    }
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
            detail="Invalid email or password credentials"
        )

    token = create_access_token(data={"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

