import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class CategoryStatus(str, Enum):
    active = "active"
    inactive = "inactive"


class Category(SQLModel, table=True):
    __tablename__ = "categories"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    status: CategoryStatus = Field(default=CategoryStatus.active)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    business: "Business" = Relationship(back_populates="categories")

    stock_items: List["StockItem"] = Relationship(back_populates="category")


class OrderingMethod(str, Enum):
    email = "email"
    phone = "phone"
    website = "website"
    manual = "manual"


class Supplier(SQLModel, table=True):
    __tablename__ = "suppliers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str
    website: Optional[str] = None
    notes: Optional[str] = None
    ordering_method: Optional[OrderingMethod] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    business: "Business" = Relationship(back_populates="suppliers")

    stock_items: List["StockItem"] = Relationship(back_populates="supplier")


class StockItem(SQLModel, table=True):
    __tablename__ = "stock_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    sku: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    base_unit: str = Field(default="pcs")
    cost_per_base_unit: Optional[float] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    business: "Business" = Relationship(back_populates="stock_items")

    category_id: Optional[str] = Field(
        default=None, foreign_key="categories.id", ondelete="SET NULL"
    )
    category: Optional[Category] = Relationship(back_populates="stock_items")

    supplier_id: Optional[str] = Field(
        default=None, foreign_key="suppliers.id", ondelete="SET NULL"
    )
    supplier: Optional[Supplier] = Relationship(back_populates="stock_items")

    counting_options: List["CountingOption"] = Relationship(
        back_populates="stock_item",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class StockItemLocation(SQLModel, table=True):
    __tablename__ = "stock_item_locations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    stock_item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    location_id: str = Field(foreign_key="locations.id", ondelete="CASCADE")
    storage_capacity: float = Field(default=0.0)
    storage_capacity_unit: Optional[str] = None
    reorder_level: float = Field(default=0.0)
    reorder_level_unit: Optional[str] = None
    current_stock: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CountingOption(SQLModel, table=True):
    __tablename__ = "counting_options"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    level_name: str
    display_name: str
    conversion_to_base_qty: float
    base_unit: str
    sort_order: int
    show_on_mobile: bool = Field(default=True)

    stock_item: StockItem = Relationship(back_populates="counting_options")
