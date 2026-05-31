# StockTrack

## Project Overview

StockTrack is a backend service built with FastAPI and SQLModel that provides inventory management capabilities such as user authentication, business management, stock items, recipes, stock counts, purchase orders, deliveries, and dashboard metrics. The API follows a modular service architecture where each functional area lives in its own router.

## Tech Stack

- **Frontend**: Next.js (React + TypeScript), Tailwind CSS
- **Backend Language**: Python 3.13
- **Web Framework**: FastAPI
- **ORM / Data Modeling**: SQLModel (SQLAlchemy based)
- **Database**: PostgreSQL (Neon managed instance)
- **Authentication**: JWT with bcrypt password hashing
- **Environment Management**: python‑venv, dotenv
- **Version Control**: Git

## Project Structure

```
stocktrack/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # Slim orchestrator that mounts all routers
│   │   ├── database.py              # Engine and session handling
│   │   ├── models.py                # SQLModel schema definitions
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── utils.py         # Password hashing, JWT utilities
│   │   │   │   ├── dependencies.py  # get_current_user dependency
│   │   │   │   └── router.py        # /api/auth endpoints
│   │   │   ├── users/
│   │   │   │   ├── __init__.py
│   │   │   │   └── router.py
│   │   │   ├── businesses/
│   │   │   │   ├── __init__.py
│   │   │   │   └── router.py
│   │   │   ├── categories/
│   │   │   │   ├── __init__.py
│   │   │   │   └── router.py
│   │   │   ├── locations/
│   │   │   │   ├── __init__.py
│   │   │   │   └── router.py
│   │   │   ├── suppliers/
│   │   │   │   ├── __init__.py
│   │   │   │   └── router.py
│   │   │   ├── stock_items/
│   │   │   │   ├── __init__.py
│   │   │   │   └── router.py
│   │   │   ├── recipes/
│   │   │   │   ├── __init__.py
│   │   │   │   └── router.py
│   │   │   ├── dashboard/
│   │   │   │   ├── __init__.py
│   │   │   │   └── router.py
│   │   │   ├── stock_counts/
│   │   │   │   ├── __init__.py
│   │   │   │   └── router.py
│   │   │   ├── purchase_orders/
│   │   │   │   ├── __init__.py
│   │   │   │   └── router.py
│   │   │   └── deliveries/
│   │   │       ├── __init__.py
│   │   │       └── router.py
│   ├── requirements.txt
│   └── Dockerfile (if containerised)
├── src/                            # Frontend Next.js app
├── .env                            # Environment variables (JWT secret, DB URL, etc.)
└── README.md                       # This file
```

## Getting Started

1. **Create a virtual environment**
   ```bash
   python -m venv venv
   .\\venv\\Scripts\\activate   # Windows
   ```
2. **Install backend dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```
3. **Configure environment variables** by copying `.env.example` to `.env` and setting `DATABASE_URL`, `JWT_SECRET_KEY`, etc.
4. **Run the backend**

   ```bash
   uvicorn backend/app/main:app --reload
   ```

   The API will be available at `http://localhost:8000`.

5. **Frontend (Next.js)**

   Install dependencies and run the development server:

   ```bash
   npm install
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`.
