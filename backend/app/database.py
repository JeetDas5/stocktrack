import os
from pathlib import Path
from dotenv import load_dotenv
from sqlmodel import create_engine, SQLModel, Session
from sqlalchemy import text

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


def init_db():
    SQLModel.metadata.create_all(engine)
    
    # Check if role column exists in users table and add it if missing
    with Session(engine) as session:
        try:
            session.exec(text("SELECT role FROM users LIMIT 1"))
        except Exception:
            session.rollback()
            try:
                session.exec(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'admin'"))
                session.commit()
                print("Added 'role' column to 'users' table.")
            except Exception as e:
                print(f"Error adding 'role' column: {e}")
                session.rollback()


def get_session():
    with Session(engine) as session:
        yield session
