import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class RecipeStatus(str, Enum):
    active = "active"
    inactive = "inactive"


class Recipe(SQLModel, table=True):
    __tablename__ = "recipes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    recipe_name: str
    recipe_code: Optional[str] = None
    category_id: Optional[str] = Field(
        default=None, foreign_key="categories.id", ondelete="SET NULL"
    )
    yield_qty: float = Field(default=1.0)
    yield_unit: str = Field(default="serving")
    description: Optional[str] = None
    status: RecipeStatus = Field(default=RecipeStatus.active)
    sales_amount: Optional[float] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    business: "Business" = Relationship(back_populates="recipes")
    category: Optional["Category"] = Relationship()
    ingredients: List["RecipeIngredient"] = Relationship(
        back_populates="recipe",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class RecipeIngredient(SQLModel, table=True):
    __tablename__ = "recipe_ingredients"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    recipe_id: str = Field(foreign_key="recipes.id", ondelete="CASCADE")
    item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    qty_used: float
    unit: str
    cost_per_unit: float
    total_cost: float

    recipe: Recipe = Relationship(back_populates="ingredients")
    item: "StockItem" = Relationship()
