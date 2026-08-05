import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class PurchaseOrderStatus(str, Enum):
    draft = "draft"
    sent = "sent"
    completed = "completed"


class PurchaseOrder(SQLModel, table=True):
    __tablename__ = "purchase_orders"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    supplier_id: str = Field(foreign_key="suppliers.id", ondelete="CASCADE")
    location_id: Optional[str] = Field(
        default=None, foreign_key="locations.id", ondelete="SET NULL"
    )
    po_number: str
    status: PurchaseOrderStatus = Field(default=PurchaseOrderStatus.draft)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by_id: Optional[str] = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )
    total_amount: float = Field(default=0.0)
    notes: Optional[str] = None

    business: "Business" = Relationship()
    supplier: "Supplier" = Relationship()
    location: Optional["Location"] = Relationship()
    items: List["PurchaseOrderItem"] = Relationship(
        back_populates="purchase_order",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class PurchaseOrderItem(SQLModel, table=True):
    __tablename__ = "purchase_order_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    purchase_order_id: str = Field(foreign_key="purchase_orders.id", ondelete="CASCADE")
    stock_item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    quantity: float
    unit_cost: float
    total_cost: float

    purchase_order: PurchaseOrder = Relationship(back_populates="items")
    stock_item: "StockItem" = Relationship()
