import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, JSON


class ContactMessage(SQLModel, table=True):
    __tablename__ = "contact_messages"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    business: Optional[str] = Field(default=None)
    email: str
    phone: Optional[str] = Field(default=None)
    business_type: Optional[str] = Field(default=None)
    message: Optional[str] = Field(default=None)
    intent: str = Field(default="contact")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExternalUserLead(SQLModel, table=True):
    __tablename__ = "external_user_leads"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SquareToken(SQLModel, table=True):
    __tablename__ = "square_tokens"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: Optional[str] = Field(
        default=None, foreign_key="businesses.id", ondelete="CASCADE", index=True
    )
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    merchant_id: Optional[str] = Field(default=None)
    access_token: str
    refresh_token: Optional[str] = Field(default=None)
    token_type: Optional[str] = Field(default="bearer")
    expires_at: Optional[datetime] = Field(default=None)
    environment: str = Field(default="sandbox")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SquareImportHistory(SQLModel, table=True):
    __tablename__ = "square_import_history"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE", index=True)
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    entity_type: str = Field(index=True)  # "location", "item", "sales"
    status: str = Field(default="success")  # "success", "partial", "failed"
    created_count: int = Field(default=0)
    updated_count: int = Field(default=0)
    skipped_count: int = Field(default=0)
    field_mappings: Optional[dict] = Field(default={}, sa_column=Column(JSON))
    summary_log: Optional[dict] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
