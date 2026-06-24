import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.middleware import RateLimitMiddleware

from app.services.auth.router import router as auth_router
from app.services.users.router import router as users_router
from app.services.businesses.router import router as businesses_router
from app.services.categories.router import router as categories_router
from app.services.locations.router import router as locations_router
from app.services.suppliers.router import router as suppliers_router
from app.services.stock_items.router import router as stock_items_router
from app.services.recipes.router import router as recipes_router
from app.services.dashboard.router import router as dashboard_router
from app.services.stock_counts.router import router as stock_counts_router
from app.services.purchase_orders.router import router as purchase_orders_router
from app.services.deliveries.router import router as deliveries_router
from app.services.sales.router import router as sales_router
from app.services.consumption.router import router as consumption_router
from app.services.reconciliation.router import router as reconciliation_router
from app.services.staff.router import router as staff_router
from app.services.timesheets.router import router as timesheets_router
from app.services.availability.router import router as availability_router
from app.services.roster_settings.router import router as roster_settings_router
from app.services.roster.router import router as roster_router
from app.services.contact.router import router as contact_router
from app.services.timesheet_settings.router import router as timesheet_settings_router

app = FastAPI(
    title="NexBrix API",
    description="Python FastAPI + SQLModel + Neon PostgreSQL backend"
)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if allowed_origins_env:
    origins.extend([o.strip()
                   for o in allowed_origins_env.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)



@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Welcome to StockTrack"}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(businesses_router)
app.include_router(categories_router)
app.include_router(locations_router)
app.include_router(suppliers_router)
app.include_router(stock_items_router)
app.include_router(recipes_router)
app.include_router(dashboard_router)
app.include_router(stock_counts_router)
app.include_router(purchase_orders_router)
app.include_router(deliveries_router)
app.include_router(sales_router)
app.include_router(consumption_router)
app.include_router(reconciliation_router)
app.include_router(staff_router)
app.include_router(timesheets_router)
app.include_router(availability_router)
app.include_router(roster_settings_router)
app.include_router(roster_router)
app.include_router(contact_router)
app.include_router(timesheet_settings_router)


