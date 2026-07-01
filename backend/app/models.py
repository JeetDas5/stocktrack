import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, JSON


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = None
    phone: Optional[str] = Field(default=None)
    hashed_password: Optional[str] = Field(default=None)
    email_verified: bool = Field(default=False)
    image: Optional[str] = Field(default=None)
    role: str = Field(default="admin")
    accepted_terms_version: Optional[str] = Field(default=None)
    accepted_terms_at: Optional[datetime] = Field(default=None)
    ip_address: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    start_date: datetime = Field(default_factory=datetime.utcnow)
    is_internal: bool = Field(default=False)
    modules: List[str] = Field(default=[], sa_column=Column(JSON))

    # Profile Page Fields
    first_name: Optional[str] = Field(default=None)
    last_name: Optional[str] = Field(default=None)
    gender: Optional[str] = Field(default=None)
    date_of_birth: Optional[str] = Field(default=None)
    address_line1: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    suburb: Optional[str] = Field(default=None)
    state: Optional[str] = Field(default=None)
    post_code: Optional[str] = Field(default=None)
    driving_license_number: Optional[str] = Field(default=None)
    license_expiry_date: Optional[str] = Field(default=None)

    emergency_contact_name: Optional[str] = Field(default=None)
    emergency_contact_relationship: Optional[str] = Field(default=None)
    emergency_contact_phone: Optional[str] = Field(default=None)
    emergency_contact_email: Optional[str] = Field(default=None)

    tax_file_number: Optional[str] = Field(default=None)
    super_fund_name: Optional[str] = Field(default=None)
    super_fund_member_no: Optional[str] = Field(default=None)
    bank_account_name: Optional[str] = Field(default=None)
    bank_bsb: Optional[str] = Field(default=None)
    bank_account_number: Optional[str] = Field(default=None)
    weekly_work_hours: Optional[float] = Field(default=None)
    residency_status: Optional[str] = Field(default=None)
    visa_expiry_date: Optional[str] = Field(default=None)

    employee_id: Optional[str] = Field(default=None)
    position: Optional[str] = Field(default=None)
    reports_to: Optional[str] = Field(default=None)
    employment_type: Optional[str] = Field(default=None)

    businesses: List["Business"] = Relationship(back_populates="created_by")


class UserAssignment(SQLModel, table=True):
    __tablename__ = "user_assignments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: Optional[str] = Field(
        default=None, foreign_key="locations.id", ondelete="CASCADE"
    )
    role: str = Field(default="staff")  # manager or staff (or admin)
    permissions: List[str] = Field(default=[], sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    status: str = Field(default="active")  # active, inactive, pending_approval
    created_at: datetime = Field(default_factory=datetime.utcnow)
    priority: int = Field(default=5)
    position: Optional[str] = Field(default=None)
    max_working_hours: Optional[float] = Field(default=None)
    hourly_rate: Optional[float] = Field(default=None)
    reporting_to: Optional[str] = Field(default=None)
    start_date: Optional[str] = Field(default=None)

    # Relationships
    user: Optional[User] = Relationship()
    business: Optional["Business"] = Relationship()
    location: Optional["Location"] = Relationship()


class StaffInvitation(SQLModel, table=True):
    __tablename__ = "staff_invitations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_by_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    business_id: Optional[str] = Field(
        default=None, foreign_key="businesses.id", ondelete="CASCADE"
    )
    role: str = Field(default="staff")  # Default role for assignments
    assignments_json: List[dict] = Field(default=[], sa_column=Column(JSON))
    email: Optional[str] = Field(default=None)
    modules: List[str] = Field(default=[], sa_column=Column(JSON))
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(
        default="pending"
    )  # pending, waiting_approval, completed, expired
    registered_user_id: Optional[str] = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )


class SessionTable(SQLModel, table=True):
    __tablename__ = "sessions"

    id: str = Field(primary_key=True)
    expires_at: datetime
    token: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    ip_address: Optional[str] = Field(default=None)
    user_agent: Optional[str] = Field(default=None)


class Account(SQLModel, table=True):
    __tablename__ = "accounts"

    id: str = Field(primary_key=True)
    account_id: str
    provider_id: str
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    access_token: Optional[str] = Field(default=None)
    refresh_token: Optional[str] = Field(default=None)
    id_token: Optional[str] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)
    password: Optional[str] = Field(default=None)
    access_token_expires_at: Optional[datetime] = Field(default=None)
    refresh_token_expires_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    scope: Optional[str] = Field(default=None)


class Verification(SQLModel, table=True):
    __tablename__ = "verifications"

    id: str = Field(primary_key=True)
    identifier: str
    value: str
    expires_at: datetime
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


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
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    business: Business = Relationship(back_populates="stock_items")

    category_id: Optional[str] = Field(
        default=None, foreign_key="categories.id", ondelete="SET NULL"
    )
    category: Optional[Category] = Relationship(back_populates="stock_items")

    supplier_id: Optional[str] = Field(
        default=None, foreign_key="suppliers.id", ondelete="SET NULL"
    )
    supplier: Optional["Supplier"] = Relationship(back_populates="stock_items")

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
    category_id: Optional[str] = Field(
        default=None, foreign_key="categories.id", ondelete="SET NULL"
    )
    yield_qty: float = Field(default=1.0)
    yield_unit: str = Field(default="serving")
    description: Optional[str] = None
    status: RecipeStatus = Field(default=RecipeStatus.active)
    sales_amount: Optional[float] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    business: Business = Relationship(back_populates="recipes")
    category: Optional[Category] = Relationship()
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
    location_id: Optional[str] = Field(
        default=None, foreign_key="locations.id", ondelete="SET NULL"
    )
    count_type: str = Field(default="General Count")
    count_date: str
    counted_by_name: str
    status: StockCountStatus = Field(default=StockCountStatus.in_progress)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    items: List["StockCountItem"] = Relationship(
        back_populates="session",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


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

    business: Business = Relationship()
    supplier: Supplier = Relationship()
    location: Optional[Location] = Relationship()
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
    received_by_id: Optional[str] = Field(
        default=None, foreign_key="users.id", ondelete="SET NULL"
    )
    total_amount: float = Field(default=0.0)
    notes: Optional[str] = None

    business: Business = Relationship()
    supplier: Supplier = Relationship()
    purchase_order: PurchaseOrder = Relationship()
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
    stock_item: StockItem = Relationship()


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

    business: Business = Relationship()
    location: Optional[Location] = Relationship()
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
    recipe: Recipe = Relationship()


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
    item: StockItem = Relationship()


class Timesheet(SQLModel, table=True):
    __tablename__ = "timesheets"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: str = Field(foreign_key="locations.id", ondelete="CASCADE")
    staff_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    work_date: str = Field(index=True)
    start_time: str
    end_time: str
    unpaid_break: int = Field(default=0)
    notes: Optional[str] = Field(default=None)
    project: Optional[str] = Field(default=None)
    total_hours: float = Field(default=0.0)
    status: str = Field(default="submitted")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    business: Business = Relationship()
    location: Location = Relationship()
    staff: User = Relationship()


class StaffAvailability(SQLModel, table=True):
    __tablename__ = "staff_availabilities"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    user_id: str = Field(foreign_key="users.id", ondelete="CASCADE")
    start_date: str = Field(index=True)
    end_date: str
    period_type: str = Field(default="weekly")
    general_note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    business: Business = Relationship()
    user: User = Relationship()
    days: List["StaffAvailabilityDay"] = Relationship(
        back_populates="availability",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class StaffAvailabilityDay(SQLModel, table=True):
    __tablename__ = "staff_availability_days"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    availability_id: str = Field(
        foreign_key="staff_availabilities.id", ondelete="CASCADE"
    )
    date: str = Field(index=True)
    is_available: bool = Field(default=True)

    availability: StaffAvailability = Relationship(back_populates="days")
    slots: List["StaffAvailabilitySlot"] = Relationship(
        back_populates="day",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class StaffAvailabilitySlot(SQLModel, table=True):
    __tablename__ = "staff_availability_slots"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    availability_day_id: str = Field(
        foreign_key="staff_availability_days.id", ondelete="CASCADE"
    )
    time_from: str
    time_to: str
    location_id: Optional[str] = Field(
        default=None, foreign_key="locations.id", ondelete="SET NULL"
    )
    note: Optional[str] = None

    day: StaffAvailabilityDay = Relationship(back_populates="slots")
    location: Optional[Location] = Relationship()


class RosterSettings(SQLModel, table=True):
    __tablename__ = "roster_settings"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(
        foreign_key="businesses.id", ondelete="CASCADE", unique=True
    )
    roster_period: str = Field(default="Weekly")
    availability_deadline_day: str = Field(default="Sunday")
    availability_deadline_time: str = Field(default="06:00 PM")
    default_shift_types: List[dict] = Field(default=[], sa_column=Column(JSON))
    required_roles: List[dict] = Field(default=[], sa_column=Column(JSON))
    default_priority: int = Field(default=5)
    allow_admin_override: bool = Field(default=True)
    notify_staff_approved: bool = Field(default=True)
    positions: List[str] = Field(default=[], sa_column=Column(JSON))


class TimesheetSettings(SQLModel, table=True):
    __tablename__ = "timesheet_settings"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(
        foreign_key="businesses.id", ondelete="CASCADE", unique=True
    )
    
    # 1. Approval Workflow
    require_approval: bool = Field(default=True)
    approval_roles: List[str] = Field(default=["Admin", "Manager"], sa_column=Column(JSON))
    auto_approve_after_days: Optional[int] = Field(default=None) # None = Disabled

    # 2. Timesheet Entry Rules
    allow_past_entry: bool = Field(default=True)
    max_past_days: int = Field(default=1)
    lock_submitted: bool = Field(default=True)
    allow_staff_edit_pending: bool = Field(default=False)
    allow_managers_edit_approved: bool = Field(default=True)

    # 3. Break Rules
    require_break_entry: bool = Field(default=True)
    default_break_minutes: int = Field(default=30)
    require_reason_no_break: bool = Field(default=True)

    # 4. Overtime Rules
    show_overtime_warnings: bool = Field(default=True)
    weekly_hours_warning: int = Field(default=38)
    daily_hours_warning: int = Field(default=10)

    # 5. Notifications
    notify_manager_on_submission: bool = Field(default=True)
    notify_staff_on_approval: bool = Field(default=True)
    notify_staff_on_rejection: bool = Field(default=True)

    # 6. Payroll Settings
    week_starts_on: str = Field(default="Monday")
    payroll_export_format: str = Field(default="CSV")
    lock_payroll_period_date: Optional[str] = Field(default=None)
    lock_timesheets_before_date: bool = Field(default=True)



class RosterShift(SQLModel, table=True):
    __tablename__ = "roster_shifts"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    business_id: str = Field(foreign_key="businesses.id", ondelete="CASCADE")
    location_id: str = Field(foreign_key="locations.id", ondelete="CASCADE")
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", ondelete="SET NULL")
    date: str = Field(index=True)  # YYYY-MM-DD
    shift_name: str  # Morning, Afternoon, Evening, etc.
    time_from: str  # e.g., "06:00"
    time_to: str  # e.g., "11:00"
    required_count: int = Field(default=2)
    status: str = Field(default="draft")  # draft or published
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional[User] = Relationship()
    location: Optional[Location] = Relationship()


class ContactMessage(SQLModel, table=True):
    __tablename__ = "contact_messages"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    business: Optional[str] = Field(default=None)
    email: str
    phone: Optional[str] = Field(default=None)
    business_type: Optional[str] = Field(default=None)
    message: Optional[str] = Field(default=None)
    intent: str = Field(default="contact")
    created_at: datetime = Field(default_factory=datetime.utcnow)

