import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class DeliveryStatus(str, Enum):
    received = "Received"
    partially_received = "Partially Received"
    missing = "Missing"


class Delivery(SQLModel, table=True):
    __tablename__ = "deliveries"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    supplier_id: str = Field(foreign_key="suppliers.id", ondelete="CASCADE")
    purchase_order_id: str = Field(foreign_key="purchase_orders.id", ondelete="CASCADE")
    receiving_location_id: Optional[str] = Field(
        default=None, foreign_key="locations.id", ondelete="SET NULL"
    )
    delivery_number: str
    status: DeliveryStatus = Field(default=DeliveryStatus.received)
    delivery_date: datetime = Field(default_factory=datetime.utcnow)
    received_by_id: Optional[str] = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )
    total_amount: float = Field(default=0.0)
    notes: Optional[str] = None

    business: "Business" = Relationship()
    supplier: "Supplier" = Relationship()
    purchase_order: "PurchaseOrder" = Relationship()
    receiving_location: Optional["Location"] = Relationship()
    items: List["DeliveryItem"] = Relationship(
        back_populates="delivery",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class DeliveryItem(SQLModel, table=True):
    __tablename__ = "delivery_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    delivery_id: str = Field(foreign_key="deliveries.id", ondelete="CASCADE")
    stock_item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    ordered_quantity: float
    received_quantity: float
    unit_cost: float
    total_cost: float

    delivery: Delivery = Relationship(back_populates="items")
    stock_item: "StockItem" = Relationship()
