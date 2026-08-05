import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class Business(SQLModel, table=True):
    __tablename__ = "businesses"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    is_active: bool = Field(default=True)
    terms_url: Optional[str] = Field(default=None)
    terms_name: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    created_by_id: str = Field(foreign_key="users.id")
    created_by: "User" = Relationship(back_populates="businesses")

    categories: List["Category"] = Relationship(back_populates="business")
    locations: List["Location"] = Relationship(back_populates="business")
    stock_items: List["StockItem"] = Relationship(back_populates="business")
    suppliers: List["Supplier"] = Relationship(back_populates="business")
    recipes: List["Recipe"] = Relationship(back_populates="business")


class Location(SQLModel, table=True):
    __tablename__ = "locations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    description: Optional[str] = None
    type: str = Field(default="store")
    address: Optional[str] = None
    is_warehouse: bool = Field(default=False)
    is_global: bool = Field(default=False)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    business_id: Optional[str] = Field(
        default=None, foreign_key="businesses.id", ondelete="CASCADE"
    )
    business: Optional[Business] = Relationship(back_populates="locations")
