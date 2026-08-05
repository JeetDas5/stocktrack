import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class StockTransferStatus(str, Enum):
    in_transit = "in_transit"
    completed = "completed"
    cancelled = "cancelled"


class StockTransfer(SQLModel, table=True):
    __tablename__ = "stock_transfers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    transfer_number: str
    business_id: Optional[str] = Field(
        default=None, foreign_key="businesses.id", ondelete="CASCADE"
    )
    from_location_id: str = Field(foreign_key="locations.id", ondelete="CASCADE")
    to_location_id: str = Field(foreign_key="locations.id", ondelete="CASCADE")
    status: StockTransferStatus = Field(default=StockTransferStatus.in_transit)
    dispatched_by_id: Optional[str] = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )
    received_by_id: Optional[str] = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )
    dispatched_at: datetime = Field(default_factory=datetime.utcnow)
    received_at: Optional[datetime] = Field(default=None)
    notes: Optional[str] = None

    from_location: "Location" = Relationship(
        sa_relationship_kwargs={"primaryjoin": "StockTransfer.from_location_id == Location.id"}
    )
    to_location: "Location" = Relationship(
        sa_relationship_kwargs={"primaryjoin": "StockTransfer.to_location_id == Location.id"}
    )
    items: List["StockTransferItem"] = Relationship(
        back_populates="transfer",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class StockTransferItem(SQLModel, table=True):
    __tablename__ = "stock_transfer_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    transfer_id: str = Field(foreign_key="stock_transfers.id", ondelete="CASCADE")
    stock_item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    dispatched_qty: float
    received_qty: Optional[float] = None
    unit_cost: float = Field(default=0.0)

    transfer: StockTransfer = Relationship(back_populates="items")
    stock_item: "StockItem" = Relationship()
