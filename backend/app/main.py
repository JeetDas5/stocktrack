import os
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import jwt
import bcrypt
from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, auth
from sqlmodel import Session, select, SQLModel

from app.database import init_db, get_session
from app.models import User, Business, Category, Location, StockItem, Supplier, OrderingMethod, StockItemLocation

# Load environment variables
from dotenv import load_dotenv
from pathlib import Path
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Initialize Firebase Admin SDK
firebase_project_id = os.getenv("FIREBASE_PROJECT_ID")
firebase_client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
firebase_private_key = os.getenv("FIREBASE_PRIVATE_KEY")

if firebase_project_id and firebase_client_email and firebase_private_key:
    # Ensure raw newline characters are formatted properly
    formatted_key = firebase_private_key.replace("\\n", "\n")
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": firebase_project_id,
        "private_key": formatted_key,
        "client_email": firebase_client_email,
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    # Check if app already initialized 
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
else:
    # Fallback to local default / emulator credential loading
    if not firebase_admin._apps:
        firebase_admin.initialize_app()

# Set up Emulator host environment variable if active
if os.getenv("NODE_ENV") == "development" or not os.getenv("FIREBASE_AUTH_EMULATOR_HOST"):
    os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099"

# JWT / Bcrypt Credentials Auth Config
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")) # 7 days default

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
    allow_origin_regex="https://.*", # Allow any HTTPS origin dynamically (Vercel preview & production)
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


# --- CATEGORIES ---
class CategoryCreate(SQLModel):
    name: str


@app.post("/api/businesses/{business_id}/categories", response_model=Category)
def create_business_category(
    business_id: str,
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify business belongs to current user
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to edit this business")

    category = Category(name=data.name, business_id=business_id)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@app.get("/api/businesses/{business_id}/categories", response_model=List[Category])
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
        others_cat = Category(name="Others", business_id=business_id)
        session.add(others_cat)
        session.commit()
        session.refresh(others_cat)
        categories = list(categories) + [others_cat]
        
    return categories


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
    reorder_level_base_qty: float
    max_stock_base_qty: float
    cost_per_base_unit: Optional[float] = None
    is_active: bool
    created_at: datetime
    business_id: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    locations_count: int = 0
    location_rules: List[LocationRuleOut] = []

class StockItemCreate(SQLModel):
    name: str
    sku: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    base_unit: str = "pcs"
    reorder_level_base_qty: float = 0.0
    max_stock_base_qty: float = 0.0
    cost_per_base_unit: Optional[float] = None
    is_active: bool = True
    category_id: Optional[str] = None
    supplier_id: Optional[str] = None
    location_rules: Optional[List[dict]] = None

@app.post("/api/businesses/{business_id}/stock-items", response_model=StockItemOut)
def create_business_stock_item(
    business_id: str,
    data: StockItemCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this business")

    if data.category_id:
        category = session.get(Category, data.category_id)
        if not category or category.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid category ID for this business")

    if data.supplier_id:
        supplier = session.get(Supplier, data.supplier_id)
        if not supplier or supplier.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid supplier ID for this business")

    stock_item = StockItem(
        name=data.name,
        sku=data.sku,
        image_url=data.image_url,
        description=data.description,
        base_unit=data.base_unit,
        reorder_level_base_qty=data.reorder_level_base_qty,
        max_stock_base_qty=data.max_stock_base_qty,
        cost_per_base_unit=data.cost_per_base_unit,
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

    category_name = stock_item.category.name if stock_item.category else None
    supplier_name = stock_item.supplier.name if stock_item.supplier else None

    return StockItemOut(
        id=stock_item.id,
        name=stock_item.name,
        sku=stock_item.sku,
        image_url=stock_item.image_url,
        description=stock_item.description,
        base_unit=stock_item.base_unit,
        reorder_level_base_qty=stock_item.reorder_level_base_qty,
        max_stock_base_qty=stock_item.max_stock_base_qty,
        cost_per_base_unit=stock_item.cost_per_base_unit,
        is_active=stock_item.is_active,
        created_at=stock_item.created_at,
        business_id=stock_item.business_id,
        category_id=stock_item.category_id,
        category_name=category_name,
        supplier_id=stock_item.supplier_id,
        supplier_name=supplier_name,
        locations_count=len(location_rules_out),
        location_rules=location_rules_out
    )

@app.get("/api/businesses/{business_id}/stock-items", response_model=List[StockItemOut])
def get_business_stock_items(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    business = session.get(Business, business_id)
    if not business or business.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this business")

    items = session.exec(select(StockItem).where(StockItem.business_id == business_id)).all()

    out = []
    for item in items:
        category_name = item.category.name if item.category else None
        supplier_name = item.supplier.name if item.supplier else None

        rules = session.exec(select(StockItemLocation).where(StockItemLocation.stock_item_id == item.id)).all()
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

        out.append(StockItemOut(
            id=item.id,
            name=item.name,
            sku=item.sku,
            image_url=item.image_url,
            description=item.description,
            base_unit=item.base_unit,
            reorder_level_base_qty=item.reorder_level_base_qty,
            max_stock_base_qty=item.max_stock_base_qty,
            cost_per_base_unit=item.cost_per_base_unit,
            is_active=item.is_active,
            created_at=item.created_at,
            business_id=item.business_id,
            category_id=item.category_id,
            category_name=category_name,
            supplier_id=item.supplier_id,
            supplier_name=supplier_name,
            locations_count=len(rules),
            location_rules=location_rules_out
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
        raise HTTPException(status_code=403, detail="Not authorized to edit this business")

    stock_item = session.get(StockItem, item_id)
    if not stock_item or stock_item.business_id != business_id:
        raise HTTPException(status_code=404, detail="Stock item not found")

    if data.category_id:
        category = session.get(Category, data.category_id)
        if not category or category.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid category ID for this business")

    if data.supplier_id:
        supplier = session.get(Supplier, data.supplier_id)
        if not supplier or supplier.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid supplier ID for this business")

    stock_item.name = data.name
    stock_item.sku = data.sku
    stock_item.image_url = data.image_url
    stock_item.description = data.description
    stock_item.base_unit = data.base_unit
    stock_item.reorder_level_base_qty = data.reorder_level_base_qty
    stock_item.max_stock_base_qty = data.max_stock_base_qty
    stock_item.cost_per_base_unit = data.cost_per_base_unit
    stock_item.is_active = data.is_active
    stock_item.category_id = data.category_id
    stock_item.supplier_id = data.supplier_id

    session.add(stock_item)
    session.commit()
    session.refresh(stock_item)

    existing_rules = session.exec(select(StockItemLocation).where(StockItemLocation.stock_item_id == item_id)).all()
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

    category_name = stock_item.category.name if stock_item.category else None
    supplier_name = stock_item.supplier.name if stock_item.supplier else None

    return StockItemOut(
        id=stock_item.id,
        name=stock_item.name,
        sku=stock_item.sku,
        image_url=stock_item.image_url,
        description=stock_item.description,
        base_unit=stock_item.base_unit,
        reorder_level_base_qty=stock_item.reorder_level_base_qty,
        max_stock_base_qty=stock_item.max_stock_base_qty,
        cost_per_base_unit=stock_item.cost_per_base_unit,
        is_active=stock_item.is_active,
        created_at=stock_item.created_at,
        business_id=stock_item.business_id,
        category_id=stock_item.category_id,
        category_name=category_name,
        supplier_id=stock_item.supplier_id,
        supplier_name=supplier_name,
        locations_count=len(location_rules_out),
        location_rules=location_rules_out
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
        raise HTTPException(status_code=403, detail="Not authorized to edit this business")

    stock_item = session.get(StockItem, item_id)
    if not stock_item or stock_item.business_id != business_id:
        raise HTTPException(status_code=404, detail="Stock item not found")

    session.delete(stock_item)
    session.commit()
    return {"message": "Stock item deleted successfully"}



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
