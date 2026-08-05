import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import text, inspect
from sqlmodel import create_engine, SQLModel, Session


env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if "sslmode" not in DATABASE_URL:
    if "?" in DATABASE_URL:
        DATABASE_URL += "&sslmode=require"
    else:
        DATABASE_URL += "?sslmode=require"

engine = create_engine(
    DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
    pool_recycle=300,
)


def _add_columns_if_missing(session, inspector, table: str, columns: dict[str, str]) -> None:
    """Add columns to *table* only if they don't already exist.

    Args:
        session:   Active SQLModel session.
        inspector: SQLAlchemy Inspector bound to the engine.
        table:     Table name to alter.
        columns:   Mapping of {column_name: SQL_type}.
    """
    existing = {col["name"] for col in inspector.get_columns(table)}
    mutated = False
    for col_name, col_type in columns.items():
        if col_name not in existing:
            session.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
            mutated = True
    if mutated:
        session.commit()


def init_db():
    SQLModel.metadata.create_all(engine)
    try:
        with Session(engine) as session:
            inspector = inspect(engine)

            # One-off DDL tweaks
            session.execute(text("ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS project VARCHAR"))
            session.execute(text("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff'"))
            session.commit()

            # ── users ────────────────────────────────────────────────────────
            _add_columns_if_missing(session, inspector, "users", {
                "first_name": "VARCHAR",
                "last_name": "VARCHAR",
                "gender": "VARCHAR",
                "date_of_birth": "VARCHAR",
                "address_line1": "VARCHAR",
                "country": "VARCHAR",
                "suburb": "VARCHAR",
                "state": "VARCHAR",
                "post_code": "VARCHAR",
                "driving_license_number": "VARCHAR",
                "license_expiry_date": "VARCHAR",
                "emergency_contact_name": "VARCHAR",
                "emergency_contact_relationship": "VARCHAR",
                "emergency_contact_phone": "VARCHAR",
                "emergency_contact_email": "VARCHAR",
                "tax_file_number": "VARCHAR",
                "super_fund_name": "VARCHAR",
                "super_fund_member_no": "VARCHAR",
                "bank_account_name": "VARCHAR",
                "bank_bsb": "VARCHAR",
                "bank_account_number": "VARCHAR",
                "weekly_work_hours": "FLOAT",
                "residency_status": "VARCHAR",
                "visa_expiry_date": "VARCHAR",
                "employee_id": "VARCHAR",
                "position": "VARCHAR",
                "reports_to": "VARCHAR",
                "employment_type": "VARCHAR",
                "modules": "JSON",
                "start_date": "TIMESTAMP",
                "is_internal": "BOOLEAN",
            })

            # ── staff_invitations ─────────────────────────────────────────────
            _add_columns_if_missing(session, inspector, "staff_invitations", {
                "email": "VARCHAR",
                "modules": "JSON",
            })

            # ── user_assignments ──────────────────────────────────────────────
            _add_columns_if_missing(session, inspector, "user_assignments", {
                "hourly_rate": "FLOAT",
                "reporting_to": "VARCHAR",
                "start_date": "VARCHAR",
            })

            # ── businesses ────────────────────────────────────────────────────
            _add_columns_if_missing(session, inspector, "businesses", {
                "terms_url": "VARCHAR",
                "terms_name": "VARCHAR",
            })

            # ── timesheet_settings ────────────────────────────────────────────
            _add_columns_if_missing(session, inspector, "timesheet_settings", {
                "projects": "JSON DEFAULT '[]'",
                "enable_projects": "BOOLEAN DEFAULT TRUE",
            })

            # ── locations ─────────────────────────────────────────────────────
            _add_columns_if_missing(session, inspector, "locations", {
                "is_warehouse": "BOOLEAN DEFAULT FALSE",
                "is_global": "BOOLEAN DEFAULT FALSE",
            })
            try:
                session.execute(text("ALTER TABLE locations ALTER COLUMN business_id DROP NOT NULL"))
                session.commit()
            except Exception:
                pass  # Column is already nullable — nothing to do.

            # ── deliveries ────────────────────────────────────────────────────
            _add_columns_if_missing(session, inspector, "deliveries", {
                "receiving_location_id": "VARCHAR",
            })

    except Exception as e:
        print(f"Database migration note: {e}")


def get_session():
    with Session(engine) as session:
        yield session
