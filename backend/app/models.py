import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = None
    hashed_password: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    businesses: List["Business"] = Relationship(back_populates="created_by")

class Business(SQLModel, table=True):
    __tablename__ = "businesses"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    created_by_id: str = Field(foreign_key="users.id")
    created_by: User = Relationship(back_populates="businesses")
    
    categories: List["Category"] = Relationship(back_populates="business")
    locations: List["Location"] = Relationship(back_populates="business")
    stock_items: List["StockItem"] = Relationship(back_populates="business")
    suppliers: List["Supplier"] = Relationship(back_populates="business")

class Category(SQLModel, table=True):
    __tablename__ = "categories"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    business: Business = Relationship(back_populates="categories")
    
    stock_items: List["StockItem"] = Relationship(back_populates="category")

class Location(SQLModel, table=True):
    __tablename__ = "locations"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    description: Optional[str] = None
    type: str = Field(default="store")
    address: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    business: Business = Relationship(back_populates="locations")

class StockItem(SQLModel, table=True):
    __tablename__ = "stock_items"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    sku: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    base_unit: str = Field(default="pcs")
    reorder_level_base_qty: float = Field(default=0.0)
    max_stock_base_qty: float = Field(default=0.0)
    cost_per_base_unit: Optional[float] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    business: Business = Relationship(back_populates="stock_items")
    
    category_id: Optional[str] = Field(default=None, foreign_key="categories.id", ondelete="SET NULL")
    category: Optional[Category] = Relationship(back_populates="stock_items")
    
    supplier_id: Optional[str] = Field(default=None, foreign_key="suppliers.id", ondelete="SET NULL")
    supplier: Optional["Supplier"] = Relationship(back_populates="stock_items")

class StockItemLocation(SQLModel, table=True):
    __tablename__ = "stock_item_locations"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    stock_item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    location_id: str = Field(foreign_key="locations.id", ondelete="CASCADE")
    storage_capacity: float = Field(default=0.0)
    storage_capacity_unit: Optional[str] = None
    reorder_level: float = Field(default=0.0)
    reorder_level_unit: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
    business: Business = Relationship(back_populates="suppliers")
    
    stock_items: List["StockItem"] = Relationship(back_populates="supplier")

