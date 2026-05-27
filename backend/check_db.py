import os
from pathlib import Path
from dotenv import load_dotenv
from sqlmodel import create_engine, text

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env"
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

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        # Check if hashed_password exists
        query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='hashed_password';
        """)
        res = conn.execute(query).fetchone()
        
        if not res:
            print("hashed_password column is missing! Executing ALTER TABLE...")
            conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255) DEFAULT NULL;"))
            conn.commit()
            print("Migration complete: Column 'hashed_password' added successfully!")
        else:
            print("Database check successful: column 'hashed_password' already exists in 'users' table.")
except Exception as e:
    print(f"Error during database check/migration: {str(e)}")
