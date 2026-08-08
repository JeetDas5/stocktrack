import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, JSON


class Timesheet(SQLModel, table=True):
    __tablename__ = "timesheets"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: str = Field(foreign_key="locations.id", ondelete="CASCADE")
    staff_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    work_date: str = Field(index=True)
    start_time: str
    end_time: str
    unpaid_break: int = Field(default=0)
    notes: Optional[str] = Field(default=None)
    project: Optional[str] = Field(default=None)
    total_hours: float = Field(default=0.0)
    status: str = Field(default="submitted")
    is_paid: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    business: "Business" = Relationship()
    location: "Location" = Relationship()
    staff: "User" = Relationship()


class StaffAvailability(SQLModel, table=True):
    __tablename__ = "staff_availabilities"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    start_date: str = Field(index=True)
    end_date: str
    period_type: str = Field(default="weekly")
    general_note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    business: "Business" = Relationship()
    user: "User" = Relationship()
    days: List["StaffAvailabilityDay"] = Relationship(
        back_populates="availability",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class StaffAvailabilityDay(SQLModel, table=True):
    __tablename__ = "staff_availability_days"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    availability_id: str = Field(
        foreign_key="staff_availabilities.id", ondelete="CASCADE"
    )
    date: str = Field(index=True)
    is_available: bool = Field(default=True)

    availability: StaffAvailability = Relationship(back_populates="days")
    slots: List["StaffAvailabilitySlot"] = Relationship(
        back_populates="day",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class StaffAvailabilitySlot(SQLModel, table=True):
    __tablename__ = "staff_availability_slots"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    availability_day_id: str = Field(
        foreign_key="staff_availability_days.id", ondelete="CASCADE"
    )
    time_from: str
    time_to: str
    location_id: Optional[str] = Field(
        default=None, foreign_key="locations.id", ondelete="SET NULL"
    )
    note: Optional[str] = None

    day: StaffAvailabilityDay = Relationship(back_populates="slots")
    location: Optional["Location"] = Relationship()


class RosterSettings(SQLModel, table=True):
    __tablename__ = "roster_settings"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(
        foreign_key="businesses.id", ondelete="CASCADE", unique=True
    )
    roster_period: str = Field(default="Weekly")
    availability_deadline_day: str = Field(default="Sunday")
    availability_deadline_time: str = Field(default="06:00 PM")
    default_shift_types: List[dict] = Field(default=[], sa_column=Column(JSON))
    required_roles: List[dict] = Field(default=[], sa_column=Column(JSON))
    default_priority: int = Field(default=5)
    allow_admin_override: bool = Field(default=True)
    notify_staff_approved: bool = Field(default=True)
    positions: List[str] = Field(default=[], sa_column=Column(JSON))


class TimesheetSettings(SQLModel, table=True):
    __tablename__ = "timesheet_settings"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(
        foreign_key="businesses.id", ondelete="CASCADE", unique=True
    )

    # 1. Approval Workflow
    require_approval: bool = Field(default=True)
    approval_roles: List[str] = Field(default=["Admin", "Manager"], sa_column=Column(JSON))
    auto_approve_after_days: Optional[int] = Field(default=None)  # None = Disabled

    # 2. Timesheet Entry Rules
    allow_past_entry: bool = Field(default=True)
    max_past_days: int = Field(default=1)
    lock_submitted: bool = Field(default=True)
    allow_staff_edit_pending: bool = Field(default=False)
    allow_managers_edit_approved: bool = Field(default=True)

    # 3. Break Rules
    require_break_entry: bool = Field(default=True)
    default_break_minutes: int = Field(default=30)
    require_reason_no_break: bool = Field(default=True)

    # 4. Overtime Rules
    show_overtime_warnings: bool = Field(default=True)
    weekly_hours_warning: int = Field(default=38)
    daily_hours_warning: int = Field(default=10)

    # 5. Notifications
    notify_manager_on_submission: bool = Field(default=True)
    notify_staff_on_approval: bool = Field(default=True)
    notify_staff_on_rejection: bool = Field(default=True)

    # 6. Payroll Settings
    week_starts_on: str = Field(default="Monday")
    payroll_export_format: str = Field(default="CSV")
    lock_payroll_period_date: Optional[str] = Field(default=None)
    lock_timesheets_before_date: bool = Field(default=True)

    # 7. Project Settings
    projects: List[str] = Field(default=[], sa_column=Column(JSON))
    enable_projects: bool = Field(default=True)


class RosterShift(SQLModel, table=True):
    __tablename__ = "roster_shifts"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: str = Field(foreign_key="locations.id", ondelete="CASCADE")
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", ondelete="SET NULL")
    date: str = Field(index=True)  # YYYY-MM-DD
    shift_name: str  # Morning, Afternoon, Evening, etc.
    time_from: str  # e.g., "06:00"
    time_to: str  # e.g., "11:00"
    required_count: int = Field(default=2)
    status: str = Field(default="draft")  # draft or published
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional["User"] = Relationship()
    location: Optional["Location"] = Relationship()
