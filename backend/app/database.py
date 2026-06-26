import os
from pathlib import Path
from dotenv import load_dotenv
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


from sqlalchemy import text, inspect

def init_db():
    SQLModel.metadata.create_all(engine)
    try:
        with Session(engine) as session:
            session.execute(text("ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS project VARCHAR"))
            session.commit()
            
            # Check and add new profile columns dynamically to the users table
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('users')]
            
            new_columns = {
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
                "is_internal": "BOOLEAN"
            }
            
            mutated = False
            for col_name, col_type in new_columns.items():
                if col_name not in columns:
                    session.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    mutated = True
            if mutated:
                session.commit()

            # Check and add new columns dynamically to the staff_invitations table
            inv_columns = [col['name'] for col in inspector.get_columns('staff_invitations')]
            new_inv_columns = {
                "email": "VARCHAR",
                "modules": "JSON"
            }
            inv_mutated = False
            for col_name, col_type in new_inv_columns.items():
                if col_name not in inv_columns:
                    session.execute(text(f"ALTER TABLE staff_invitations ADD COLUMN {col_name} {col_type}"))
                    inv_mutated = True
            if inv_mutated:
                session.commit()
    except Exception as e:
        print(f"Database migration note: {e}")


def get_session():
    with Session(engine) as session:
        yield session
