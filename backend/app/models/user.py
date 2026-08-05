import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, JSON


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = None
    phone: Optional[str] = Field(default=None)
    hashed_password: Optional[str] = Field(default=None)
    email_verified: bool = Field(default=False)
    image: Optional[str] = Field(default=None)
    role: str = Field(default="staff")
    accepted_terms_version: Optional[str] = Field(default=None)
    accepted_terms_at: Optional[datetime] = Field(default=None)
    ip_address: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    start_date: datetime = Field(default_factory=datetime.utcnow)
    is_internal: bool = Field(default=False)
    modules: List[str] = Field(default=[], sa_column=Column(JSON))

    # Profile Page Fields
    first_name: Optional[str] = Field(default=None)
    last_name: Optional[str] = Field(default=None)
    gender: Optional[str] = Field(default=None)
    date_of_birth: Optional[str] = Field(default=None)
    address_line1: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    suburb: Optional[str] = Field(default=None)
    state: Optional[str] = Field(default=None)
    post_code: Optional[str] = Field(default=None)
    driving_license_number: Optional[str] = Field(default=None)
    license_expiry_date: Optional[str] = Field(default=None)

    emergency_contact_name: Optional[str] = Field(default=None)
    emergency_contact_relationship: Optional[str] = Field(default=None)
    emergency_contact_phone: Optional[str] = Field(default=None)
    emergency_contact_email: Optional[str] = Field(default=None)

    tax_file_number: Optional[str] = Field(default=None)
    super_fund_name: Optional[str] = Field(default=None)
    super_fund_member_no: Optional[str] = Field(default=None)
    bank_account_name: Optional[str] = Field(default=None)
    bank_bsb: Optional[str] = Field(default=None)
    bank_account_number: Optional[str] = Field(default=None)
    weekly_work_hours: Optional[float] = Field(default=None)
    residency_status: Optional[str] = Field(default=None)
    visa_expiry_date: Optional[str] = Field(default=None)

    employee_id: Optional[str] = Field(default=None)
    position: Optional[str] = Field(default=None)
    reports_to: Optional[str] = Field(default=None)
    employment_type: Optional[str] = Field(default=None)

    businesses: List["Business"] = Relationship(back_populates="created_by")


class UserAssignment(SQLModel, table=True):
    __tablename__ = "user_assignments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: Optional[str] = Field(
        default=None, foreign_key="locations.id", ondelete="CASCADE"
    )
    role: str = Field(default="staff")  # manager or staff (or admin)
    permissions: List[str] = Field(default=[], sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    status: str = Field(default="active")  # active, inactive, pending_approval
    created_at: datetime = Field(default_factory=datetime.utcnow)
    priority: int = Field(default=5)
    position: Optional[str] = Field(default=None)
    max_working_hours: Optional[float] = Field(default=None)
    hourly_rate: Optional[float] = Field(default=None)
    reporting_to: Optional[str] = Field(default=None)
    start_date: Optional[str] = Field(default=None)

    # Relationships
    user: Optional[User] = Relationship()
    business: Optional["Business"] = Relationship()
    location: Optional["Location"] = Relationship()


class StaffInvitation(SQLModel, table=True):
    __tablename__ = "staff_invitations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_by_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    business_id: Optional[str] = Field(
        default=None, foreign_key="businesses.id", ondelete="CASCADE"
    )
    role: str = Field(default="staff")  # Default role for assignments
    assignments_json: List[dict] = Field(default=[], sa_column=Column(JSON))
    email: Optional[str] = Field(default=None)
    modules: List[str] = Field(default=[], sa_column=Column(JSON))
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(
        default="pending"
    )  # pending, waiting_approval, completed, expired
    registered_user_id: Optional[str] = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )


class SessionTable(SQLModel, table=True):
    __tablename__ = "sessions"

    id: str = Field(primary_key=True)
    expires_at: datetime
    token: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    ip_address: Optional[str] = Field(default=None)
    user_agent: Optional[str] = Field(default=None)


class Account(SQLModel, table=True):
    __tablename__ = "accounts"

    id: str = Field(primary_key=True)
    account_id: str
    provider_id: str
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    access_token: Optional[str] = Field(default=None)
    refresh_token: Optional[str] = Field(default=None)
    id_token: Optional[str] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)
    password: Optional[str] = Field(default=None)
    access_token_expires_at: Optional[datetime] = Field(default=None)
    refresh_token_expires_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    scope: Optional[str] = Field(default=None)


class Verification(SQLModel, table=True):
    __tablename__ = "verifications"

    id: str = Field(primary_key=True)
    identifier: str
    value: str
    expires_at: datetime
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
