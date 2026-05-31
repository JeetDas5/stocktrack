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
    recipes: List["Recipe"] = Relationship(back_populates="business")

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
    cost_per_base_unit: Optional[float] = None
    current_stock: float = Field(default=0.0)
    delivery_packaging: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    business: Business = Relationship(back_populates="stock_items")
    
    category_id: Optional[str] = Field(default=None, foreign_key="categories.id", ondelete="SET NULL")
    category: Optional[Category] = Relationship(back_populates="stock_items")
    
    supplier_id: Optional[str] = Field(default=None, foreign_key="suppliers.id", ondelete="SET NULL")
    supplier: Optional["Supplier"] = Relationship(back_populates="stock_items")
    
    counting_options: List["CountingOption"] = Relationship(back_populates="stock_item", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

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

class RecipeStatus(str, Enum):
    active = "active"
    inactive = "inactive"

class Recipe(SQLModel, table=True):
    __tablename__ = "recipes"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    recipe_name: str
    recipe_code: Optional[str] = None
    category_id: Optional[str] = Field(default=None, foreign_key="categories.id", ondelete="SET NULL")
    yield_qty: float = Field(default=1.0)
    yield_unit: str = Field(default="serving")
    description: Optional[str] = None
    status: RecipeStatus = Field(default=RecipeStatus.active)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    business: Business = Relationship(back_populates="recipes")
    category: Optional[Category] = Relationship()
    ingredients: List["RecipeIngredient"] = Relationship(back_populates="recipe", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class RecipeIngredient(SQLModel, table=True):
    __tablename__ = "recipe_ingredients"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    recipe_id: str = Field(foreign_key="recipes.id", ondelete="CASCADE")
    item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    qty_used: float
    unit: str
    cost_per_unit: float
    total_cost: float
    
    recipe: "Recipe" = Relationship(back_populates="ingredients")
    item: StockItem = Relationship()

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

class StockCountStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"

class StockCountSession(SQLModel, table=True):
    __tablename__ = "stock_count_sessions"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: Optional[str] = Field(default=None, foreign_key="locations.id", ondelete="SET NULL")
    count_type: str = Field(default="General Count")
    count_date: str
    counted_by_name: str
    status: StockCountStatus = Field(default=StockCountStatus.in_progress)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    items: List["StockCountItem"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

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
    
    session: "StockCountSession" = Relationship(back_populates="items")
    item: StockItem = Relationship()

class PurchaseOrderStatus(str, Enum):
    draft = "draft"
    sent = "sent"
    completed = "completed"

class PurchaseOrder(SQLModel, table=True):
    __tablename__ = "purchase_orders"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    supplier_id: str = Field(foreign_key="suppliers.id", ondelete="CASCADE")
    location_id: Optional[str] = Field(default=None, foreign_key="locations.id", ondelete="SET NULL")
    po_number: str
    status: PurchaseOrderStatus = Field(default=PurchaseOrderStatus.draft)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by_id: Optional[str] = Field(default=None, foreign_key="users.id", ondelete="SET NULL")
    total_amount: float = Field(default=0.0)
    notes: Optional[str] = None

    business: Business = Relationship()
    supplier: Supplier = Relationship()
    location: Optional[Location] = Relationship()
    items: List["PurchaseOrderItem"] = Relationship(back_populates="purchase_order", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class PurchaseOrderItem(SQLModel, table=True):
    __tablename__ = "purchase_order_items"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    purchase_order_id: str = Field(foreign_key="purchase_orders.id", ondelete="CASCADE")
    stock_item_id: str = Field(foreign_key="stock_items.id", ondelete="CASCADE")
    quantity: float
    unit_cost: float
    total_cost: float
    
    purchase_order: PurchaseOrder = Relationship(back_populates="items")
    stock_item: StockItem = Relationship()


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
    delivery_number: str
    status: DeliveryStatus = Field(default=DeliveryStatus.received)
    delivery_date: datetime = Field(default_factory=datetime.utcnow)
    received_by_id: Optional[str] = Field(default=None, foreign_key="users.id", ondelete="SET NULL")
    total_amount: float = Field(default=0.0)
    notes: Optional[str] = None

    business: Business = Relationship()
    supplier: Supplier = Relationship()
    purchase_order: PurchaseOrder = Relationship()
    items: List["DeliveryItem"] = Relationship(
        back_populates="delivery",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
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
    stock_item: StockItem = Relationship()


class SaleStatus(str, Enum):
    draft = "draft"
    completed = "completed"


class Sale(SQLModel, table=True):
    __tablename__ = "sales"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: Optional[str] = Field(default=None, foreign_key="locations.id", ondelete="SET NULL")
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
    created_by_id: Optional[str] = Field(default=None, foreign_key="users.id", ondelete="SET NULL")


    business: Business = Relationship()
    location: Optional[Location] = Relationship()
    items: List["SaleItem"] = Relationship(back_populates="sale", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


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
    recipe: Recipe = Relationship()





