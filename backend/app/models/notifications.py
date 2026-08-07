import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, Relationship, SQLModel


class PushSubscription(SQLModel, table=True):
    __tablename__ = "push_subscriptions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    endpoint: str = Field(unique=True, index=True)
    p256dh: str
    auth: str
    user_agent: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional["User"] = Relationship()


class NotificationPreference(SQLModel, table=True):
    __tablename__ = "notification_preferences"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE", unique=True, index=True)
    timesheet_reminder_enabled: bool = Field(default=True)
    reminder_time: str = Field(default="17:00")  # HH:MM format
    timezone: str = Field(default="UTC")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional["User"] = Relationship()


class NotificationLog(SQLModel, table=True):
    __tablename__ = "notification_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    notification_type: str = Field(index=True)  # e.g., "TIMESHEET_REMINDER"
    status: str = Field(default="sent")  # sent, failed, expired
    details: Optional[str] = None
    sent_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional["User"] = Relationship()
