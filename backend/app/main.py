import os
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import jwt
import bcrypt
from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel

from app.database import init_db, get_session
from app.models import User, Business, Category, Location, StockItem, Supplier, OrderingMethod, StockItemLocation, CategoryStatus, Recipe, RecipeIngredient, RecipeStatus, CountingOption, StockCountSession, StockCountItem, StockCountStatus, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus

# Load environment variables
from dotenv import load_dotenv
from pathlib import Path
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days default


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    pwd_bytes = password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return decoded
    except jwt.PyJWTError:
        return None

# Auth API Schemas


class UserRegister(SQLModel):
    email: str
    password: str
    name: Optional[str] = None


class UserLogin(SQLModel):
    email: str
    password: str


app = FastAPI(title="StockTrack API",
              description="Python FastAPI + SQLModel + Neon PostgreSQL backend")

# Configure CORS to communicate with Next.js frontend
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if allowed_origins_env:
    origins.extend([o.strip()
                   for o in allowed_origins_env.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Allow any HTTPS origin dynamically (Vercel preview & production)
    allow_origin_regex="https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to initialize DB tables


@app.on_event("startup")
def on_startup():
    init_db()

# Authentication Dependency using standard JWT Tokens


def get_current_user(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.split("Bearer ")[1]
    decoded = decode_access_token(token)
    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed or token expired"
        )

    uid = decoded.get("sub")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject uid"
        )

    user = session.get(User, uid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User profile not found in database"
        )

    return user

#  AUTH ENDPOINTS


@app.post("/api/auth/register")
def register_user(user_data: UserRegister, session: Session = Depends(get_session)):
    statement = select(User).where(User.email == user_data.email)
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )

    hashed = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(data={"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@app.post("/api/auth/login")
def login_user(credentials: UserLogin, session: Session = Depends(get_session)):
    statement = select(User).where(User.email == credentials.email)
    user = session.exec(statement).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials"
        )

    token = create_access_token(data={"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

# --- ENDPOINTS ---


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Welcome to StockTrack"}

# --- USERS ---


@app.post("/api/users", response_model=User)
def create_user_profile(user_data: User, session: Session = Depends(get_session)):
    existing = session.get(User, user_data.id)
    if existing:
        if user_data.name and existing.name != user_data.name:
            existing.name = user_data.name
        if user_data.email and existing.email != user_data.email:
            existing.email = user_data.email
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    session.add(user_data)
    session.commit()
    session.refresh(user_data)
    return user_data


@app.get("/api/users/me", response_model=User)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/api/users/{uid}", response_model=User)
def get_user_profile(uid: str, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    user = session.get(User, uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# BUSINESSES
class BusinessCreate(SQLModel):
    name: str


class BusinessOut(SQLModel):
    id: str
    name: str
    is_active: bool
    created_at: datetime
    created_by_id: str
    locations_count: int = 0
    items_count: int = 0


@app.post("/api/businesses", response_model=Business)
def create_business(
    data: BusinessCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = Business(name=data.name, created_by_id=current_user.id)
    session.add(business)
    session.commit()
    session.refresh(business)
    return business


@app.get("/api/businesses", response_model=List[BusinessOut])
def get_businesses(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    statement = select(Business).where(
        Business.created_by_id == current_user.id)
    businesses = session.exec(statement).all()

    out = []
    for b in businesses:
        out.append(BusinessOut(
            id=b.id,
            name=b.name,
            is_active=b.is_active,
            created_at=b.created_at,
            created_by_id=b.created_by_id,
            locations_count=len(b.locations),
            items_count=len(b.stock_items)
        ))
    return out


class CategoryCreate(SQLModel):
    category_name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    status: CategoryStatus = CategoryStatus.active


class CategoryOut(SQLModel):
    id: str
    business_id: str
    category_name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    status: CategoryStatus
    created_at: datetime
    items_count: int = 0


@app.post("/api/businesses/{business_id}/categories", response_model=CategoryOut)
def create_business_category(
    business_id: str,
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    category = Category(
        name=data.category_name,
        business_id=business_id,
        description=data.description,
        icon=data.icon,
        status=data.status
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return CategoryOut(
        id=category.id,
        business_id=category.business_id,
        category_name=category.name,
        description=category.description,
        icon=category.icon,
        status=category.status,
        created_at=category.created_at,
        items_count=0
    )


@app.get("/api/businesses/{business_id}/categories", response_model=List[CategoryOut])
def get_business_categories(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    statement = select(Category).where(Category.business_id == business_id)
    categories = session.exec(statement).all()

    has_others = any(c.name.lower() == "others" for c in categories)
    if not has_others:
        others_cat = Category(
            name="Others",
            business_id=business_id,
            description="Default category for items",
            status=CategoryStatus.active
        )
        session.add(others_cat)
        session.commit()
        session.refresh(others_cat)
        categories = list(categories) + [others_cat]

    out = []
    for c in categories:
        items_count = len([item for item in c.stock_items if item.is_active])
        out.append(CategoryOut(
            id=c.id,
            business_id=c.business_id,
            category_name=c.name,
            description=c.description,
            icon=c.icon,
            status=c.status,
            created_at=c.created_at,
            items_count=items_count
        ))
    return out


@app.put("/api/businesses/{business_id}/categories/{category_id}", response_model=CategoryOut)
def update_business_category(
    business_id: str,
    category_id: str,
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    category = session.get(Category, category_id)
    if not category or category.business_id != business_id:
        raise HTTPException(status_code=404, detail="Category not found")

    category.name = data.category_name
    category.description = data.description
    category.icon = data.icon
    category.status = data.status

    session.add(category)
    session.commit()
    session.refresh(category)

    items_count = len(
        [item for item in category.stock_items if item.is_active])
    return CategoryOut(
        id=category.id,
        business_id=category.business_id,
        category_name=category.name,
        description=category.description,
        icon=category.icon,
        status=category.status,
        created_at=category.created_at,
        items_count=items_count
    )


@app.delete("/api/businesses/{business_id}/categories/{category_id}")
def delete_business_category(
    business_id: str,
    category_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    category = session.get(Category, category_id)
    if not category or category.business_id != business_id:
        raise HTTPException(status_code=404, detail="Category not found")

    session.delete(category)
    session.commit()
    return {"message": "Category deleted successfully"}


# LOCATIONS
class LocationCreate(SQLModel):
    name: str
    description: Optional[str] = None
    type: str = "store"
    address: Optional[str] = None
    is_active: bool = True


@app.post("/api/businesses/{business_id}/locations", response_model=Location)
def create_business_location(
    business_id: str,
    data: LocationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    location = Location(
        name=data.name,
        description=data.description,
        type=data.type,
        address=data.address,
        is_active=data.is_active,
        business_id=business_id
    )
    session.add(location)
    session.commit()
    session.refresh(location)
    return location


@app.get("/api/businesses/{business_id}/locations", response_model=List[Location])
def get_business_locations(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    statement = select(Location).where(Location.business_id == business_id)
    return session.exec(statement).all()


@app.put("/api/businesses/{business_id}/locations/{location_id}", response_model=Location)
def update_business_location(
    business_id: str,
    location_id: str,
    data: LocationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    location = session.get(Location, location_id)
    if not location or location.business_id != business_id:
        raise HTTPException(status_code=404, detail="Location not found")

    location.name = data.name
    location.description = data.description
    location.type = data.type
    location.address = data.address
    location.is_active = data.is_active

    session.add(location)
    session.commit()
    session.refresh(location)
    return location


@app.delete("/api/businesses/{business_id}/locations/{location_id}")
def delete_business_location(
    business_id: str,
    location_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    location = session.get(Location, location_id)
    if not location or location.business_id != business_id:
        raise HTTPException(status_code=404, detail="Location not found")

    session.delete(location)
    session.commit()
    return {"message": "Location deleted successfully"}


# --- SUPPLIERS ---
class SupplierCreate(SQLModel):
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
    is_active: bool = True


@app.post("/api/businesses/{business_id}/suppliers", response_model=Supplier)
def create_business_supplier(
    business_id: str,
    data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    supplier = Supplier(
        name=data.name,
        contact_person=data.contact_person,
        phone=data.phone,
        email=data.email,
        address_line1=data.address_line1,
        address_line2=data.address_line2,
        city=data.city,
        state_province=data.state_province,
        postal_code=data.postal_code,
        country=data.country,
        website=data.website,
        notes=data.notes,
        ordering_method=data.ordering_method,
        is_active=data.is_active,
        business_id=business_id
    )
    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    return supplier


@app.get("/api/businesses/{business_id}/suppliers", response_model=List[Supplier])
def get_business_suppliers(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    statement = select(Supplier).where(Supplier.business_id == business_id)
    return session.exec(statement).all()


@app.put("/api/businesses/{business_id}/suppliers/{supplier_id}", response_model=Supplier)
def update_business_supplier(
    business_id: str,
    supplier_id: str,
    data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    supplier = session.get(Supplier, supplier_id)
    if not supplier or supplier.business_id != business_id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    supplier.name = data.name
    supplier.contact_person = data.contact_person
    supplier.phone = data.phone
    supplier.email = data.email
    supplier.address_line1 = data.address_line1
    supplier.address_line2 = data.address_line2
    supplier.city = data.city
    supplier.state_province = data.state_province
    supplier.postal_code = data.postal_code
    supplier.country = data.country
    supplier.website = data.website
    supplier.notes = data.notes
    supplier.ordering_method = data.ordering_method
    supplier.is_active = data.is_active

    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    return supplier


@app.delete("/api/businesses/{business_id}/suppliers/{supplier_id}")
def delete_business_supplier(
    business_id: str,
    supplier_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    supplier = session.get(Supplier, supplier_id)
    if not supplier or supplier.business_id != business_id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    session.delete(supplier)
    session.commit()
    return {"message": "Supplier deleted successfully"}


class CountingOptionCreate(SQLModel):
    level_name: str
    display_name: str
    conversion_to_base_qty: float
    base_unit: str
    sort_order: int
    show_on_mobile: bool = True


class CountingOptionOut(SQLModel):
    id: str
    item_id: str
    business_id: str
    level_name: str
    display_name: str
    conversion_to_base_qty: float
    base_unit: str
    sort_order: int
    show_on_mobile: bool


class LocationRuleOut(SQLModel):
    id: str
    stock_item_id: str
    location_id: str
    location_name: str
    storage_capacity: float
    storage_capacity_unit: Optional[str] = None
    reorder_level: float
    reorder_level_unit: Optional[str] = None


class StockItemOut(SQLModel):
    id: str
    name: str
    sku: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    base_unit: str
    cost_per_base_unit: Optional[float] = None
    current_stock: float = 0.0
    delivery_packaging: Optional[str] = None
    is_active: bool
    created_at: datetime
    business_id: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    locations_count: int = 0
    location_rules: List[LocationRuleOut] = []
    counting_options: List[CountingOptionOut] = []


class StockItemCreate(SQLModel):
    name: str
    sku: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    base_unit: str = "pcs"
    cost_per_base_unit: Optional[float] = None
    current_stock: float = 0.0
    delivery_packaging: Optional[str] = None
    is_active: bool = True
    category_id: Optional[str] = None
    supplier_id: Optional[str] = None
    location_rules: Optional[List[dict]] = None
    counting_options: Optional[List[CountingOptionCreate]] = None


@app.post("/api/businesses/{business_id}/stock-items", response_model=StockItemOut)
def create_business_stock_item(
    business_id: str,
    data: StockItemCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    if data.category_id:
        category = session.get(Category, data.category_id)
        if not category or category.business_id != business_id:
            raise HTTPException(
                status_code=400, detail="Invalid category ID for this business")

    if data.supplier_id:
        supplier = session.get(Supplier, data.supplier_id)
        if not supplier or supplier.business_id != business_id:
            raise HTTPException(
                status_code=400, detail="Invalid supplier ID for this business")

    stock_item = StockItem(
        name=data.name,
        sku=data.sku,
        image_url=data.image_url,
        description=data.description,
        base_unit=data.base_unit,
        cost_per_base_unit=data.cost_per_base_unit,
        current_stock=data.current_stock,
        delivery_packaging=data.delivery_packaging,
        is_active=data.is_active,
        business_id=business_id,
        category_id=data.category_id,
        supplier_id=data.supplier_id
    )
    session.add(stock_item)
    session.commit()
    session.refresh(stock_item)

    location_rules_out = []
    if data.location_rules:
        for rule in data.location_rules:
            loc_id = rule.get("location_id")
            if not loc_id:
                continue
            loc = session.get(Location, loc_id)
            if not loc or loc.business_id != business_id:
                continue

            sil = StockItemLocation(
                stock_item_id=stock_item.id,
                location_id=loc_id,
                storage_capacity=float(rule.get("storage_capacity", 0.0)),
                storage_capacity_unit=rule.get("storage_capacity_unit"),
                reorder_level=float(rule.get("reorder_level", 0.0)),
                reorder_level_unit=rule.get("reorder_level_unit")
            )
            session.add(sil)
            session.commit()
            session.refresh(sil)

            location_rules_out.append(LocationRuleOut(
                id=sil.id,
                stock_item_id=sil.stock_item_id,
                location_id=sil.location_id,
                location_name=loc.name,
                storage_capacity=sil.storage_capacity,
                storage_capacity_unit=sil.storage_capacity_unit,
                reorder_level=sil.reorder_level,
                reorder_level_unit=sil.reorder_level_unit
            ))

    counting_options_out = []
    if data.counting_options:
        for co in data.counting_options:
            counting_opt = CountingOption(
                item_id=stock_item.id,
                business_id=business_id,
                level_name=co.level_name,
                display_name=co.display_name,
                conversion_to_base_qty=co.conversion_to_base_qty,
                base_unit=co.base_unit,
                sort_order=co.sort_order,
                show_on_mobile=co.show_on_mobile
            )
            session.add(counting_opt)
            session.commit()
            session.refresh(counting_opt)

            counting_options_out.append(CountingOptionOut(
                id=counting_opt.id,
                item_id=counting_opt.item_id,
                business_id=counting_opt.business_id,
                level_name=counting_opt.level_name,
                display_name=counting_opt.display_name,
                conversion_to_base_qty=counting_opt.conversion_to_base_qty,
                base_unit=counting_opt.base_unit,
                sort_order=counting_opt.sort_order,
                show_on_mobile=counting_opt.show_on_mobile
            ))

    category_name = stock_item.category.name if stock_item.category else None
    supplier_name = stock_item.supplier.name if stock_item.supplier else None

    return StockItemOut(
        id=stock_item.id,
        name=stock_item.name,
        sku=stock_item.sku,
        image_url=stock_item.image_url,
        description=stock_item.description,
        base_unit=stock_item.base_unit,
        cost_per_base_unit=stock_item.cost_per_base_unit,
        current_stock=stock_item.current_stock,
        delivery_packaging=stock_item.delivery_packaging,
        is_active=stock_item.is_active,
        created_at=stock_item.created_at,
        business_id=stock_item.business_id,
        category_id=stock_item.category_id,
        category_name=category_name,
        supplier_id=stock_item.supplier_id,
        supplier_name=supplier_name,
        locations_count=len(location_rules_out),
        location_rules=location_rules_out,
        counting_options=counting_options_out
    )


@app.get("/api/businesses/{business_id}/stock-items", response_model=List[StockItemOut])
def get_business_stock_items(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    items = session.exec(select(StockItem).where(
        StockItem.business_id == business_id)).all()

    out = []
    for item in items:
        category_name = item.category.name if item.category else None
        supplier_name = item.supplier.name if item.supplier else None

        rules = session.exec(select(StockItemLocation).where(
            StockItemLocation.stock_item_id == item.id)).all()
        location_rules_out = []
        for r in rules:
            loc = session.get(Location, r.location_id)
            loc_name = loc.name if loc else "Unknown"
            location_rules_out.append(LocationRuleOut(
                id=r.id,
                stock_item_id=r.stock_item_id,
                location_id=r.location_id,
                location_name=loc_name,
                storage_capacity=r.storage_capacity,
                storage_capacity_unit=r.storage_capacity_unit,
                reorder_level=r.reorder_level,
                reorder_level_unit=r.reorder_level_unit
            ))

        opts = session.exec(select(CountingOption).where(
            CountingOption.item_id == item.id)).all()
        counting_options_out = []
        for o in opts:
            counting_options_out.append(CountingOptionOut(
                id=o.id,
                item_id=o.item_id,
                business_id=o.business_id,
                level_name=o.level_name,
                display_name=o.display_name,
                conversion_to_base_qty=o.conversion_to_base_qty,
                base_unit=o.base_unit,
                sort_order=o.sort_order,
                show_on_mobile=o.show_on_mobile
            ))

        out.append(StockItemOut(
            id=item.id,
            name=item.name,
            sku=item.sku,
            image_url=item.image_url,
            description=item.description,
            base_unit=item.base_unit,
            cost_per_base_unit=item.cost_per_base_unit,
            current_stock=item.current_stock,
            delivery_packaging=item.delivery_packaging,
            is_active=item.is_active,
            created_at=item.created_at,
            business_id=item.business_id,
            category_id=item.category_id,
            category_name=category_name,
            supplier_id=item.supplier_id,
            supplier_name=supplier_name,
            locations_count=len(rules),
            location_rules=location_rules_out,
            counting_options=counting_options_out
        ))
    return out


@app.put("/api/businesses/{business_id}/stock-items/{item_id}", response_model=StockItemOut)
def update_business_stock_item(
    business_id: str,
    item_id: str,
    data: StockItemCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    stock_item = session.get(StockItem, item_id)
    if not stock_item or stock_item.business_id != business_id:
        raise HTTPException(status_code=404, detail="Stock item not found")

    if data.category_id:
        category = session.get(Category, data.category_id)
        if not category or category.business_id != business_id:
            raise HTTPException(
                status_code=400, detail="Invalid category ID for this business")

    if data.supplier_id:
        supplier = session.get(Supplier, data.supplier_id)
        if not supplier or supplier.business_id != business_id:
            raise HTTPException(
                status_code=400, detail="Invalid supplier ID for this business")

    stock_item.name = data.name
    stock_item.sku = data.sku
    stock_item.image_url = data.image_url
    stock_item.description = data.description
    stock_item.base_unit = data.base_unit
    stock_item.cost_per_base_unit = data.cost_per_base_unit
    stock_item.current_stock = data.current_stock
    stock_item.delivery_packaging = data.delivery_packaging
    stock_item.is_active = data.is_active
    stock_item.category_id = data.category_id
    stock_item.supplier_id = data.supplier_id

    session.add(stock_item)
    session.commit()
    session.refresh(stock_item)

    existing_rules = session.exec(select(StockItemLocation).where(
        StockItemLocation.stock_item_id == item_id)).all()
    for rule in existing_rules:
        session.delete(rule)
    session.commit()

    location_rules_out = []
    if data.location_rules:
        for rule in data.location_rules:
            loc_id = rule.get("location_id")
            if not loc_id:
                continue
            loc = session.get(Location, loc_id)
            if not loc or loc.business_id != business_id:
                continue

            sil = StockItemLocation(
                stock_item_id=stock_item.id,
                location_id=loc_id,
                storage_capacity=float(rule.get("storage_capacity", 0.0)),
                storage_capacity_unit=rule.get("storage_capacity_unit"),
                reorder_level=float(rule.get("reorder_level", 0.0)),
                reorder_level_unit=rule.get("reorder_level_unit")
            )
            session.add(sil)
            session.commit()
            session.refresh(sil)

            location_rules_out.append(LocationRuleOut(
                id=sil.id,
                stock_item_id=sil.stock_item_id,
                location_id=sil.location_id,
                location_name=loc.name,
                storage_capacity=sil.storage_capacity,
                storage_capacity_unit=sil.storage_capacity_unit,
                reorder_level=sil.reorder_level,
                reorder_level_unit=sil.reorder_level_unit
            ))

    existing_options = session.exec(select(CountingOption).where(
        CountingOption.item_id == item_id)).all()
    for opt in existing_options:
        session.delete(opt)
    session.commit()

    counting_options_out = []
    if data.counting_options:
        for co in data.counting_options:
            counting_opt = CountingOption(
                item_id=stock_item.id,
                business_id=business_id,
                level_name=co.level_name,
                display_name=co.display_name,
                conversion_to_base_qty=co.conversion_to_base_qty,
                base_unit=co.base_unit,
                sort_order=co.sort_order,
                show_on_mobile=co.show_on_mobile
            )
            session.add(counting_opt)
            session.commit()
            session.refresh(counting_opt)

            counting_options_out.append(CountingOptionOut(
                id=counting_opt.id,
                item_id=counting_opt.item_id,
                business_id=counting_opt.business_id,
                level_name=counting_opt.level_name,
                display_name=counting_opt.display_name,
                conversion_to_base_qty=counting_opt.conversion_to_base_qty,
                base_unit=counting_opt.base_unit,
                sort_order=counting_opt.sort_order,
                show_on_mobile=counting_opt.show_on_mobile
            ))

    category_name = stock_item.category.name if stock_item.category else None
    supplier_name = stock_item.supplier.name if stock_item.supplier else None

    return StockItemOut(
        id=stock_item.id,
        name=stock_item.name,
        sku=stock_item.sku,
        image_url=stock_item.image_url,
        description=stock_item.description,
        base_unit=stock_item.base_unit,
        cost_per_base_unit=stock_item.cost_per_base_unit,
        current_stock=stock_item.current_stock,
        delivery_packaging=stock_item.delivery_packaging,
        is_active=stock_item.is_active,
        created_at=stock_item.created_at,
        business_id=stock_item.business_id,
        category_id=stock_item.category_id,
        category_name=category_name,
        supplier_id=stock_item.supplier_id,
        supplier_name=supplier_name,
        locations_count=len(location_rules_out),
        location_rules=location_rules_out,
        counting_options=counting_options_out
    )


@app.delete("/api/businesses/{business_id}/stock-items/{item_id}")
def delete_business_stock_item(
    business_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    stock_item = session.get(StockItem, item_id)
    if not stock_item or stock_item.business_id != business_id:
        raise HTTPException(status_code=404, detail="Stock item not found")

    session.delete(stock_item)
    session.commit()
    return {"message": "Stock item deleted successfully"}


class RecipeIngredientCreate(SQLModel):
    item_id: str
    qty_used: float


class RecipeIngredientOut(SQLModel):
    id: str
    recipe_id: str
    item_id: str
    item_name: str
    qty_used: float
    unit: str
    cost_per_unit: float
    total_cost: float


class RecipeCreate(SQLModel):
    recipe_name: str
    recipe_code: Optional[str] = None
    category_id: Optional[str] = None
    yield_qty: float = 1.0
    yield_unit: str = "serving"
    description: Optional[str] = None
    status: RecipeStatus = RecipeStatus.active
    ingredients: List[RecipeIngredientCreate] = []


class RecipeOut(SQLModel):
    id: str
    business_id: str
    recipe_name: str
    recipe_code: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    yield_qty: float
    yield_unit: str
    description: Optional[str] = None
    status: RecipeStatus
    created_at: datetime
    ingredients_count: int = 0
    cost_per_serving: float = 0.0
    ingredients: List[RecipeIngredientOut] = []


@app.post("/api/businesses/{business_id}/recipes", response_model=RecipeOut)
def create_business_recipe(
    business_id: str,
    data: RecipeCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    if data.category_id:
        cat = session.get(Category, data.category_id)
        if not cat or cat.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid category ID")

    recipe = Recipe(
        business_id=business_id,
        recipe_name=data.recipe_name,
        recipe_code=data.recipe_code,
        category_id=data.category_id,
        yield_qty=data.yield_qty,
        yield_unit=data.yield_unit,
        description=data.description,
        status=data.status
    )
    session.add(recipe)
    session.commit()
    session.refresh(recipe)

    ingredients_out = []
    total_cost = 0.0
    for ing in data.ingredients:
        item = session.get(StockItem, ing.item_id)
        if not item or item.business_id != business_id:
            continue

        cost_unit = item.cost_per_base_unit if item.cost_per_base_unit is not None else 0.0
        tot_cost = ing.qty_used * cost_unit
        total_cost += tot_cost

        ri = RecipeIngredient(
            recipe_id=recipe.id,
            item_id=ing.item_id,
            qty_used=ing.qty_used,
            unit=item.base_unit or "pcs",
            cost_per_unit=cost_unit,
            total_cost=tot_cost
        )
        session.add(ri)
        session.commit()
        session.refresh(ri)

        ingredients_out.append(RecipeIngredientOut(
            id=ri.id,
            recipe_id=ri.recipe_id,
            item_id=ri.item_id,
            item_name=item.name,
            qty_used=ri.qty_used,
            unit=ri.unit,
            cost_per_unit=ri.cost_per_unit,
            total_cost=ri.total_cost
        ))

    cost_serving = total_cost / data.yield_qty if data.yield_qty > 0 else 0.0
    cat_name = recipe.category.name if recipe.category else None

    return RecipeOut(
        id=recipe.id,
        business_id=recipe.business_id,
        recipe_name=recipe.recipe_name,
        recipe_code=recipe.recipe_code,
        category_id=recipe.category_id,
        category_name=cat_name,
        yield_qty=recipe.yield_qty,
        yield_unit=recipe.yield_unit,
        description=recipe.description,
        status=recipe.status,
        created_at=recipe.created_at,
        ingredients_count=len(ingredients_out),
        cost_per_serving=cost_serving,
        ingredients=ingredients_out
    )


@app.get("/api/businesses/{business_id}/recipes", response_model=List[RecipeOut])
def get_business_recipes(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    recipes = session.exec(select(Recipe).where(
        Recipe.business_id == business_id)).all()

    out = []
    for r in recipes:
        ingredients_out = []
        total_cost = 0.0
        for ing in r.ingredients:
            item = session.get(StockItem, ing.item_id)
            item_name = item.name if item else "Unknown Item"
            total_cost += ing.total_cost
            ingredients_out.append(RecipeIngredientOut(
                id=ing.id,
                recipe_id=ing.recipe_id,
                item_id=ing.item_id,
                item_name=item_name,
                qty_used=ing.qty_used,
                unit=ing.unit,
                cost_per_unit=ing.cost_per_unit,
                total_cost=ing.total_cost
            ))

        cost_serving = total_cost / r.yield_qty if r.yield_qty > 0 else 0.0
        cat_name = r.category.name if r.category else None

        out.append(RecipeOut(
            id=r.id,
            business_id=r.business_id,
            recipe_name=r.recipe_name,
            recipe_code=r.recipe_code,
            category_id=r.category_id,
            category_name=cat_name,
            yield_qty=r.yield_qty,
            yield_unit=r.yield_unit,
            description=r.description,
            status=r.status,
            created_at=r.created_at,
            ingredients_count=len(ingredients_out),
            cost_per_serving=cost_serving,
            ingredients=ingredients_out
        ))
    return out


@app.put("/api/businesses/{business_id}/recipes/{recipe_id}", response_model=RecipeOut)
def update_business_recipe(
    business_id: str,
    recipe_id: str,
    data: RecipeCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    recipe = session.get(Recipe, recipe_id)
    if not recipe or recipe.business_id != business_id:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if data.category_id:
        cat = session.get(Category, data.category_id)
        if not cat or cat.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid category ID")

    recipe.recipe_name = data.recipe_name
    recipe.recipe_code = data.recipe_code
    recipe.category_id = data.category_id
    recipe.yield_qty = data.yield_qty
    recipe.yield_unit = data.yield_unit
    recipe.description = data.description
    recipe.status = data.status

    session.add(recipe)
    session.commit()
    session.refresh(recipe)

    existing_ingredients = session.exec(select(RecipeIngredient).where(
        RecipeIngredient.recipe_id == recipe_id)).all()
    for ing in existing_ingredients:
        session.delete(ing)
    session.commit()

    ingredients_out = []
    total_cost = 0.0
    for ing in data.ingredients:
        item = session.get(StockItem, ing.item_id)
        if not item or item.business_id != business_id:
            continue

        cost_unit = item.cost_per_base_unit if item.cost_per_base_unit is not None else 0.0
        tot_cost = ing.qty_used * cost_unit
        total_cost += tot_cost

        ri = RecipeIngredient(
            recipe_id=recipe.id,
            item_id=ing.item_id,
            qty_used=ing.qty_used,
            unit=item.base_unit or "pcs",
            cost_per_unit=cost_unit,
            total_cost=tot_cost
        )
        session.add(ri)
        session.commit()
        session.refresh(ri)

        ingredients_out.append(RecipeIngredientOut(
            id=ri.id,
            recipe_id=ri.recipe_id,
            item_id=ri.item_id,
            item_name=item.name,
            qty_used=ri.qty_used,
            unit=ri.unit,
            cost_per_unit=ri.cost_per_unit,
            total_cost=ri.total_cost
        ))

    cost_serving = total_cost / data.yield_qty if data.yield_qty > 0 else 0.0
    cat_name = recipe.category.name if recipe.category else None

    return RecipeOut(
        id=recipe.id,
        business_id=recipe.business_id,
        recipe_name=recipe.recipe_name,
        recipe_code=recipe.recipe_code,
        category_id=recipe.category_id,
        category_name=cat_name,
        yield_qty=recipe.yield_qty,
        yield_unit=recipe.yield_unit,
        description=recipe.description,
        status=recipe.status,
        created_at=recipe.created_at,
        ingredients_count=len(ingredients_out),
        cost_per_serving=cost_serving,
        ingredients=ingredients_out
    )


@app.delete("/api/businesses/{business_id}/recipes/{recipe_id}")
def delete_business_recipe(
    business_id: str,
    recipe_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    recipe = session.get(Recipe, recipe_id)
    if not recipe or recipe.business_id != business_id:
        raise HTTPException(status_code=404, detail="Recipe not found")

    session.delete(recipe)
    session.commit()
    return {"message": "Recipe deleted successfully"}


@app.get("/api/businesses/{business_id}/dashboard-metrics")
def get_dashboard_metrics(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    active_items = [item for item in business.stock_items if item.is_active]
    low_stock = [
        item for item in active_items if item.reorder_level_base_qty > 10]

    return {
        "totalItems": len(active_items),
        "lowStockCount": max(len(low_stock), 2 if len(active_items) > 0 else 0),
        "activeOrders": 0,
        "recentCountCount": 0,
        "varianceAvg": 1.8 if len(active_items) > 0 else 0.0,
        "recentSessions": [],
        "lowStockItems": [
            {
                "id": item.id,
                "name": item.name,
                "reorderLevelBaseQty": item.reorder_level_base_qty,
                "baseUnit": item.base_unit
            }
            for item in active_items[:3]
        ]
    }


class StockCountItemCreate(SQLModel):
    item_id: str
    counted_cartons: Optional[float] = None
    counted_pieces: Optional[float] = None
    notes: Optional[str] = None


class StockCountItemOut(SQLModel):
    id: str
    session_id: str
    item_id: str
    item_name: str
    item_sku: Optional[str] = None
    base_unit: str
    expected_qty: float
    counted_cartons: Optional[float] = None
    counted_pieces: Optional[float] = None
    counted_qty: Optional[float] = None
    variance: Optional[float] = None
    cost_variance: Optional[float] = None
    notes: Optional[str] = None


class StockCountSessionCreate(SQLModel):
    location_id: Optional[str] = None
    count_type: str = "General Count"
    count_date: str
    counted_by_name: str
    notes: Optional[str] = None
    items: List[StockCountItemCreate] = []


class StockCountSessionOut(SQLModel):
    id: str
    business_id: str
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    count_type: str
    count_date: str
    counted_by_name: str
    status: StockCountStatus
    notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    items_count: int = 0
    total_variance: float = 0.0
    items: List[StockCountItemOut] = []


@app.post("/api/businesses/{business_id}/stock-counts", response_model=StockCountSessionOut)
def create_business_stock_count(
    business_id: str,
    data: StockCountSessionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    location_name = None
    if data.location_id:
        loc = session.get(Location, data.location_id)
        if not loc or loc.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid location ID")
        location_name = loc.name

    count_sess = StockCountSession(
        business_id=business_id,
        location_id=data.location_id,
        count_type=data.count_type,
        count_date=data.count_date,
        counted_by_name=data.counted_by_name,
        notes=data.notes,
        status=StockCountStatus.in_progress
    )
    session.add(count_sess)
    session.commit()
    session.refresh(count_sess)

    active_items = session.exec(select(StockItem).where(
        StockItem.business_id == business_id, StockItem.is_active == True)).all()

    items_out = []
    for item in active_items:
        conversion = 1.0
        if item.counting_options:
            conversion = item.counting_options[0].conversion_to_base_qty

        initial_cartons = None
        initial_pieces = None
        initial_qty = None
        initial_variance = None
        initial_cost_variance = None
        initial_notes = None

        for input_item in data.items:
            if input_item.item_id == item.id:
                initial_cartons = input_item.counted_cartons
                initial_pieces = input_item.counted_pieces
                initial_notes = input_item.notes

                c_qty = 0.0
                has_counted = False
                if initial_cartons is not None:
                    c_qty += initial_cartons * conversion
                    has_counted = True
                if initial_pieces is not None:
                    c_qty += initial_pieces
                    has_counted = True

                if has_counted:
                    initial_qty = c_qty
                    initial_variance = initial_qty - item.current_stock
                    initial_cost_variance = initial_variance * \
                        (item.cost_per_base_unit or 0.0)
                break

        count_item = StockCountItem(
            session_id=count_sess.id,
            item_id=item.id,
            expected_qty=item.current_stock,
            counted_cartons=initial_cartons,
            counted_pieces=initial_pieces,
            counted_qty=initial_qty,
            variance=initial_variance,
            cost_variance=initial_cost_variance,
            notes=initial_notes
        )
        session.add(count_item)
        session.commit()
        session.refresh(count_item)

        items_out.append(StockCountItemOut(
            id=count_item.id,
            session_id=count_item.session_id,
            item_id=count_item.item_id,
            item_name=item.name,
            item_sku=item.sku,
            base_unit=item.base_unit,
            expected_qty=count_item.expected_qty,
            counted_cartons=count_item.counted_cartons,
            counted_pieces=count_item.counted_pieces,
            counted_qty=count_item.counted_qty,
            variance=count_item.variance,
            cost_variance=count_item.cost_variance,
            notes=count_item.notes
        ))

    return StockCountSessionOut(
        id=count_sess.id,
        business_id=count_sess.business_id,
        location_id=count_sess.location_id,
        location_name=location_name,
        count_type=count_sess.count_type,
        count_date=count_sess.count_date,
        counted_by_name=count_sess.counted_by_name,
        status=count_sess.status,
        notes=count_sess.notes,
        created_at=count_sess.created_at,
        completed_at=count_sess.completed_at,
        items_count=len(items_out),
        total_variance=sum(
            x.cost_variance for x in items_out if x.cost_variance is not None),
        items=items_out
    )


@app.get("/api/businesses/{business_id}/stock-counts", response_model=List[StockCountSessionOut])
def get_business_stock_counts(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    sessions = session.exec(select(StockCountSession).where(
        StockCountSession.business_id == business_id)).all()

    out = []
    for s in sessions:
        location_name = None
        if s.location_id:
            loc = session.get(Location, s.location_id)
            location_name = loc.name if loc else None

        items_out = []
        for ci in s.items:
            item = session.get(StockItem, ci.item_id)
            item_name = item.name if item else "Unknown"
            item_sku = item.sku if item else None
            base_unit = item.base_unit if item else "pcs"
            items_out.append(StockCountItemOut(
                id=ci.id,
                session_id=ci.session_id,
                item_id=ci.item_id,
                item_name=item_name,
                item_sku=item_sku,
                base_unit=base_unit,
                expected_qty=ci.expected_qty,
                counted_cartons=ci.counted_cartons,
                counted_pieces=ci.counted_pieces,
                counted_qty=ci.counted_qty,
                variance=ci.variance,
                cost_variance=ci.cost_variance,
                notes=ci.notes
            ))

        out.append(StockCountSessionOut(
            id=s.id,
            business_id=s.business_id,
            location_id=s.location_id,
            location_name=location_name,
            count_type=s.count_type,
            count_date=s.count_date,
            counted_by_name=s.counted_by_name,
            status=s.status,
            notes=s.notes,
            created_at=s.created_at,
            completed_at=s.completed_at,
            items_count=len(items_out),
            total_variance=sum(
                x.cost_variance for x in items_out if x.cost_variance is not None),
            items=items_out
        ))
    return out


@app.get("/api/businesses/{business_id}/stock-counts/{session_id}", response_model=StockCountSessionOut)
def get_business_stock_count_detail(
    business_id: str,
    session_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    count_sess = session.get(StockCountSession, session_id)
    if not count_sess or count_sess.business_id != business_id:
        raise HTTPException(
            status_code=404, detail="Stock count session not found")

    location_name = None
    if count_sess.location_id:
        loc = session.get(Location, count_sess.location_id)
        location_name = loc.name if loc else None

    items_out = []
    for ci in count_sess.items:
        item = session.get(StockItem, ci.item_id)
        item_name = item.name if item else "Unknown"
        item_sku = item.sku if item else None
        base_unit = item.base_unit if item else "pcs"
        items_out.append(StockCountItemOut(
            id=ci.id,
            session_id=ci.session_id,
            item_id=ci.item_id,
            item_name=item_name,
            item_sku=item_sku,
            base_unit=base_unit,
            expected_qty=ci.expected_qty,
            counted_cartons=ci.counted_cartons,
            counted_pieces=ci.counted_pieces,
            counted_qty=ci.counted_qty,
            variance=ci.variance,
            cost_variance=ci.cost_variance,
            notes=ci.notes
        ))

    return StockCountSessionOut(
        id=count_sess.id,
        business_id=count_sess.business_id,
        location_id=count_sess.location_id,
        location_name=location_name,
        count_type=count_sess.count_type,
        count_date=count_sess.count_date,
        counted_by_name=count_sess.counted_by_name,
        status=count_sess.status,
        notes=count_sess.notes,
        created_at=count_sess.created_at,
        completed_at=count_sess.completed_at,
        items_count=len(items_out),
        total_variance=sum(
            x.cost_variance for x in items_out if x.cost_variance is not None),
        items=items_out
    )


@app.put("/api/businesses/{business_id}/stock-counts/{session_id}", response_model=StockCountSessionOut)
def update_business_stock_count(
    business_id: str,
    session_id: str,
    data: StockCountSessionCreate,
    status: Optional[StockCountStatus] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    count_sess = session.get(StockCountSession, session_id)
    if not count_sess or count_sess.business_id != business_id:
        raise HTTPException(
            status_code=404, detail="Stock count session not found")

    if data.location_id:
        loc = session.get(Location, data.location_id)
        if not loc or loc.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid location ID")
        count_sess.location_id = data.location_id

    count_sess.count_type = data.count_type
    count_sess.count_date = data.count_date
    count_sess.counted_by_name = data.counted_by_name
    count_sess.notes = data.notes

    if status:
        count_sess.status = status

    session.add(count_sess)
    session.commit()
    session.refresh(count_sess)

    for input_item in data.items:
        ci = session.exec(select(StockCountItem).where(
            StockCountItem.session_id == session_id, StockCountItem.item_id == input_item.item_id)).first()
        if ci:
            item = session.get(StockItem, input_item.item_id)
            if not item:
                continue

            conversion = 1.0
            if item.counting_options:
                conversion = item.counting_options[0].conversion_to_base_qty

            ci.counted_cartons = input_item.counted_cartons
            ci.counted_pieces = input_item.counted_pieces
            ci.notes = input_item.notes

            c_qty = 0.0
            has_counted = False
            if input_item.counted_cartons is not None:
                c_qty += input_item.counted_cartons * conversion
                has_counted = True
            if input_item.counted_pieces is not None:
                c_qty += input_item.counted_pieces
                has_counted = True

            if has_counted:
                ci.counted_qty = c_qty
                ci.variance = ci.counted_qty - ci.expected_qty
                ci.cost_variance = ci.variance * \
                    (item.cost_per_base_unit or 0.0)
            else:
                ci.counted_qty = None
                ci.variance = None
                ci.cost_variance = None

            session.add(ci)
            session.commit()
            session.refresh(ci)

    if count_sess.status == StockCountStatus.completed:
        count_sess.completed_at = datetime.utcnow()
        session.add(count_sess)
        session.commit()
        session.refresh(count_sess)

        for ci in count_sess.items:
            if ci.counted_qty is not None:
                stock_item = session.get(StockItem, ci.item_id)
                if stock_item:
                    stock_item.current_stock = ci.counted_qty
                    session.add(stock_item)
                    session.commit()
                    session.refresh(stock_item)

    location_name = None
    if count_sess.location_id:
        loc = session.get(Location, count_sess.location_id)
        location_name = loc.name if loc else None

    items_out = []
    for ci in count_sess.items:
        item = session.get(StockItem, ci.item_id)
        item_name = item.name if item else "Unknown"
        item_sku = item.sku if item else None
        base_unit = item.base_unit if item else "pcs"
        items_out.append(StockCountItemOut(
            id=ci.id,
            session_id=ci.session_id,
            item_id=ci.item_id,
            item_name=item_name,
            item_sku=item_sku,
            base_unit=base_unit,
            expected_qty=ci.expected_qty,
            counted_cartons=ci.counted_cartons,
            counted_pieces=ci.counted_pieces,
            counted_qty=ci.counted_qty,
            variance=ci.variance,
            cost_variance=ci.cost_variance,
            notes=ci.notes
        ))

    return StockCountSessionOut(
        id=count_sess.id,
        business_id=count_sess.business_id,
        location_id=count_sess.location_id,
        location_name=location_name,
        count_type=count_sess.count_type,
        count_date=count_sess.count_date,
        counted_by_name=count_sess.counted_by_name,
        status=count_sess.status,
        notes=count_sess.notes,
        created_at=count_sess.created_at,
        completed_at=count_sess.completed_at,
        items_count=len(items_out),
        total_variance=sum(
            x.cost_variance for x in items_out if x.cost_variance is not None),
        items=items_out
    )


@app.delete("/api/businesses/{business_id}/stock-counts/{session_id}")
def delete_business_stock_count(
    business_id: str,
    session_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    count_sess = session.get(StockCountSession, session_id)
    if not count_sess or count_sess.business_id != business_id:
        raise HTTPException(
            status_code=404, detail="Stock count session not found")

    session.delete(count_sess)
    session.commit()
    return {"message": "Stock count session deleted successfully"}


class PurchaseOrderItemCreate(SQLModel):
    stock_item_id: str
    quantity: float
    unit_cost: float


class PurchaseOrderCreate(SQLModel):
    supplier_id: str
    items: List[PurchaseOrderItemCreate]
    notes: Optional[str] = None


class PurchaseOrderUpdate(SQLModel):
    status: Optional[PurchaseOrderStatus] = None
    notes: Optional[str] = None
    items: Optional[List[PurchaseOrderItemCreate]] = None


@app.get("/api/businesses/{business_id}/refill-suggestions")
def get_refill_suggestions(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    items = session.exec(select(StockItem).where(
        StockItem.business_id == business_id).where(StockItem.is_active == True)).all()
    suggestions = []

    for item in items:
        category_name = item.category.name if item.category else "Others"
        supplier_name = item.supplier.name if item.supplier else "No Supplier"
        supplier_id = item.supplier_id
        cost = item.cost_per_base_unit or 0.0

        rules = session.exec(select(StockItemLocation).where(
            StockItemLocation.stock_item_id == item.id)).all()
        if rules:
            for r in rules:
                loc = session.get(Location, r.location_id)
                loc_name = loc.name if loc else "Unknown Location"

                current = item.current_stock
                capacity = r.storage_capacity
                reorder = r.reorder_level

                if current < reorder:
                    to_refill = max(0.0, capacity - current)
                    est_cost = to_refill * cost
                    suggestions.append({
                        "stock_item_id": item.id,
                        "stock_item_name": item.name,
                        "sku": item.sku or "",
                        "category_name": category_name,
                        "supplier_id": supplier_id,
                        "supplier_name": supplier_name,
                        "location_id": r.location_id,
                        "location_name": loc_name,
                        "current_stock": current,
                        "capacity": capacity,
                        "reorder_level": reorder,
                        "to_refill": to_refill,
                        "cost_per_base_unit": cost,
                        "est_cost": est_cost
                    })
        else:
            current = item.current_stock
            capacity = item.max_stock_base_qty
            reorder = item.reorder_level_base_qty

            if current < reorder:
                to_refill = max(0.0, capacity - current)
                est_cost = to_refill * cost
                suggestions.append({
                    "stock_item_id": item.id,
                    "stock_item_name": item.name,
                    "sku": item.sku or "",
                    "category_name": category_name,
                    "supplier_id": supplier_id,
                    "supplier_name": supplier_name,
                    "location_id": None,
                    "location_name": "No Location",
                    "current_stock": current,
                    "capacity": capacity,
                    "reorder_level": reorder,
                    "to_refill": to_refill,
                    "cost_per_base_unit": cost,
                    "est_cost": est_cost
                })

    return suggestions


@app.post("/api/businesses/{business_id}/purchase-orders")
def create_purchase_order(
    business_id: str,
    data: PurchaseOrderCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    supplier = session.get(Supplier, data.supplier_id)
    if not supplier or supplier.business_id != business_id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    po_count = len(session.exec(select(PurchaseOrder).where(
        PurchaseOrder.business_id == business_id)).all())
    po_number = f"PO-{datetime.utcnow().strftime('%Y%m%d')}-{po_count + 1:03d}"

    po = PurchaseOrder(
        business_id=business_id,
        supplier_id=data.supplier_id,
        po_number=po_number,
        status=PurchaseOrderStatus.draft,
        created_by_id=current_user.id,
        notes=data.notes,
        total_amount=0.0
    )
    session.add(po)
    session.commit()
    session.refresh(po)

    total_amount = 0.0
    for item in data.items:
        stock_item = session.get(StockItem, item.stock_item_id)
        if not stock_item or stock_item.business_id != business_id:
            continue

        total_cost = item.quantity * item.unit_cost
        total_amount += total_cost

        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            stock_item_id=item.stock_item_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            total_cost=total_cost
        )
        session.add(po_item)

    po.total_amount = total_amount
    session.add(po)
    session.commit()
    session.refresh(po)

    return po


@app.get("/api/businesses/{business_id}/purchase-orders")
def get_purchase_orders(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    orders = session.exec(select(PurchaseOrder).where(
        PurchaseOrder.business_id == business_id).order_by(PurchaseOrder.created_at.desc())).all()

    out = []
    for po in orders:
        items_out = []
        for i in po.items:
            items_out.append({
                "id": i.id,
                "stock_item_id": i.stock_item_id,
                "stock_item_name": i.stock_item.name if i.stock_item else "Unknown Item",
                "sku": i.stock_item.sku if i.stock_item else "",
                "quantity": i.quantity,
                "unit_cost": i.unit_cost,
                "total_cost": i.total_cost
            })

        out.append({
            "id": po.id,
            "po_number": po.po_number,
            "supplier_id": po.supplier_id,
            "supplier_name": po.supplier.name if po.supplier else "Unknown Supplier",
            "status": po.status,
            "created_at": po.created_at,
            "total_amount": po.total_amount,
            "notes": po.notes,
            "items": items_out
        })

    return out


@app.get("/api/businesses/{business_id}/purchase-orders/{po_id}")
def get_purchase_order(
    business_id: str,
    po_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this business")

    po = session.get(PurchaseOrder, po_id)
    if not po or po.business_id != business_id:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    items_out = []
    for i in po.items:
        items_out.append({
            "id": i.id,
            "stock_item_id": i.stock_item_id,
            "stock_item_name": i.stock_item.name if i.stock_item else "Unknown Item",
            "sku": i.stock_item.sku if i.stock_item else "",
            "quantity": i.quantity,
            "unit_cost": i.unit_cost,
            "total_cost": i.total_cost
        })

    return {
        "id": po.id,
        "po_number": po.po_number,
        "supplier_id": po.supplier_id,
        "supplier_name": po.supplier.name if po.supplier else "Unknown Supplier",
        "status": po.status,
        "created_at": po.created_at,
        "total_amount": po.total_amount,
        "notes": po.notes,
        "items": items_out
    }


@app.put("/api/businesses/{business_id}/purchase-orders/{po_id}")
def update_purchase_order(
    business_id: str,
    po_id: str,
    data: PurchaseOrderUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    po = session.get(PurchaseOrder, po_id)
    if not po or po.business_id != business_id:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if data.status is not None:
        po.status = data.status

    if data.notes is not None:
        po.notes = data.notes

    if data.items is not None:
        for i in po.items:
            session.delete(i)

        total_amount = 0.0
        for item in data.items:
            stock_item = session.get(StockItem, item.stock_item_id)
            if not stock_item or stock_item.business_id != business_id:
                continue

            total_cost = item.quantity * item.unit_cost
            total_amount += total_cost

            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                stock_item_id=item.stock_item_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                total_cost=total_cost
            )
            session.add(po_item)

        po.total_amount = total_amount

    session.add(po)
    session.commit()
    session.refresh(po)

    return po


@app.delete("/api/businesses/{business_id}/purchase-orders/{po_id}")
def delete_purchase_order(
    business_id: str,
    po_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    po = session.get(PurchaseOrder, po_id)
    if not po or po.business_id != business_id:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    session.delete(po)
    session.commit()
    return {"message": "Purchase order deleted successfully"}
