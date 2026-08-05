import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class SaleStatus(str, Enum):
    draft = "draft"
    completed = "completed"


class Sale(SQLModel, table=True):
    __tablename__ = "sales"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: Optional[str] = Field(
        default=None, foreign_key="locations.id", ondelete="SET NULL"
    )
    sale_number: str
    sale_date: str
    customer_name: Optional[str] = Field(default="Walk-in Customer")
    payment_method: Optional[str] = Field(default="Cash")
    reference: Optional[str] = None
    remarks: Optional[str] = None
    status: SaleStatus = Field(default=SaleStatus.draft)
    tax_rate: float = Field(default=5.0)
    subtotal_amount: float = Field(default=0.0)
    tax_amount: float = Field(default=0.0)
    discount_amount: float = Field(default=0.0)
    total_amount: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by_id: Optional[str] = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )

    business: "Business" = Relationship()
    location: Optional["Location"] = Relationship()
    items: List["SaleItem"] = Relationship(
        back_populates="sale", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class SaleItem(SQLModel, table=True):
    __tablename__ = "sale_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    sale_id: str = Field(foreign_key="sales.id", ondelete="CASCADE")
    recipe_id: str = Field(foreign_key="recipes.id", ondelete="CASCADE")
    quantity: float
    unit_price: float
    discount_percentage: float = Field(default=0.0)
    total_amount: float

    sale: Sale = Relationship(back_populates="items")
    recipe: "Recipe" = Relationship()


class SalesImport(SQLModel, table=True):
    __tablename__ = "sales_imports"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    filename: str
    file_size: str
    row_count: int
    mapped_count: int
    unmapped_count: int
    duplicates_count: int = Field(default=0)
    status: str = Field(default="Ready")
    date_range: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by_id: Optional[str] = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )
