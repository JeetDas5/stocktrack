from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel, func

from app.database import get_session
from app.models import User, Category, CategoryStatus
from app.services.auth.dependencies import get_current_user, verify_user_permission

router = APIRouter(tags=["Categories"])


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


@router.post("/api/businesses/{business_id}/categories", response_model=CategoryOut)
def create_business_category(
    business_id: str,
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):

    verify_user_permission(current_user, business_id, "stock_items.write", session=session)

    existing = session.exec(
        select(Category).where(
            Category.business_id == business_id,
            func.lower(Category.name) == data.category_name.strip().lower()
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409, detail=f"A category with the name '{data.category_name.strip()}' already exists in this business")

    category = Category(
        name=data.category_name.strip(),
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


@router.get("/api/businesses/{business_id}/categories", response_model=List[CategoryOut])
def get_business_categories(
    business_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):

    verify_user_permission(current_user, business_id, "stock_items.read", session=session)

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


@router.put("/api/businesses/{business_id}/categories/{category_id}", response_model=CategoryOut)
def update_business_category(
    business_id: str,
    category_id: str,
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):

    verify_user_permission(current_user, business_id, "stock_items.write", session=session)

    category = session.get(Category, category_id)
    if not category or category.business_id != business_id:
        raise HTTPException(status_code=404, detail="Category not found")

    existing = session.exec(
        select(Category).where(
            Category.business_id == business_id,
            Category.id != category_id,
            func.lower(Category.name) == data.category_name.strip().lower()
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409, detail=f"A category with the name '{data.category_name.strip()}' already exists in this business")

    category.name = data.category_name.strip()
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


@router.delete("/api/businesses/{business_id}/categories/{category_id}")
def delete_business_category(
    business_id: str,
    category_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):

    verify_user_permission(current_user, business_id, "stock_items.write", session=session)

    category = session.get(Category, category_id)
    if not category or category.business_id != business_id:
        raise HTTPException(status_code=404, detail="Category not found")

    session.delete(category)
    session.commit()
    return {"message": "Category deleted successfully"}
