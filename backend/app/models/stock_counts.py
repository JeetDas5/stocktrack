import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class StockCountStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"


class StockCountSession(SQLModel, table=True):
    __tablename__ = "stock_count_sessions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: Optional[str] = Field(
        default=None, foreign_key="locations.id", ondelete="SET NULL"
    )
    count_type: str = Field(default="General Count")
    count_date: str
    counted_by_name: str
    status: StockCountStatus = Field(default=StockCountStatus.in_progress)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    items: List["StockCountItem"] = Relationship(
        back_populates="session",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class StockCountItem(SQLModel, table=True):
    __tablename__ = "stock_count_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(foreign_key="stock_count_sessions.id", ondelete="CASCADE")
    item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    expected_qty: float = Field(default=0.0)
    counted_cartons: Optional[float] = None
    counted_pieces: Optional[float] = None
    counted_qty: Optional[float] = None
    variance: Optional[float] = None
    cost_variance: Optional[float] = None
    notes: Optional[str] = None

    session: StockCountSession = Relationship(back_populates="items")
    item: "StockItem" = Relationship()
