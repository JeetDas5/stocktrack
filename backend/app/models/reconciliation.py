import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class Reconciliation(SQLModel, table=True):
    __tablename__ = "reconciliations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: Optional[str] = Field(
        default=None, foreign_key="locations.id", ondelete="SET NULL"
    )
    reconciliation_date: str
    compare_with: str = Field(default="System (Expected)")
    status: str = Field(default="Completed")
    total_items: int = Field(default=0)
    matched_items: int = Field(default=0)
    variance_items: int = Field(default=0)
    total_variance_usd: float = Field(default=0.0)
    total_value_expected: float = Field(default=0.0)
    total_value_actual: float = Field(default=0.0)
    positive_variance_usd: float = Field(default=0.0)
    negative_variance_usd: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    items: List["ReconciliationItem"] = Relationship(
        back_populates="reconciliation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class ReconciliationItem(SQLModel, table=True):
    __tablename__ = "reconciliation_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    reconciliation_id: str = Field(foreign_key="reconciliations.id", ondelete="CASCADE")
    item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    expected_qty: float = Field(default=0.0)
    actual_qty: float = Field(default=0.0)
    variance_qty: float = Field(default=0.0)
    variance_percent: float = Field(default=0.0)
    variance_value: float = Field(default=0.0)
    status: str = Field(default="Matched")

    reconciliation: Reconciliation = Relationship(back_populates="items")
    item: "StockItem" = Relationship()
