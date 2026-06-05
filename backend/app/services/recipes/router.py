from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel, func

from app.database import get_session
from app.models import (
    User, Business, Category, StockItem, Recipe, RecipeIngredient, RecipeStatus
)
from app.services.auth.dependencies import get_current_user

router = APIRouter(tags=["Recipes"])


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
    sales_amount: float
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
    sales_amount: Optional[float] = None
    created_at: datetime
    ingredients_count: int = 0
    cost_per_serving: float = 0.0
    ingredients: List[RecipeIngredientOut] = []


@router.post("/api/businesses/{business_id}/recipes", response_model=RecipeOut)
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

    existing = session.exec(
        select(Recipe).where(
            Recipe.business_id == business_id,
            func.lower(Recipe.recipe_name) == data.recipe_name.strip().lower()
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409, detail=f"A recipe with the name '{data.recipe_name.strip()}' already exists in this business")

    if data.category_id:
        cat = session.get(Category, data.category_id)
        if not cat or cat.business_id != business_id:
            raise HTTPException(status_code=400, detail="Invalid category ID")

    recipe = Recipe(
        business_id=business_id,
        recipe_name=data.recipe_name.strip(),
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

    recipe.sales_amount = data.sales_amount if data.sales_amount is not None else cost_serving
    session.add(recipe)
    session.commit()
    session.refresh(recipe)

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
        sales_amount=recipe.sales_amount,
        created_at=recipe.created_at,
        ingredients_count=len(ingredients_out),
        cost_per_serving=cost_serving,
        ingredients=ingredients_out
    )


@router.get("/api/businesses/{business_id}/recipes", response_model=List[RecipeOut])
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
            sales_amount=r.sales_amount,
            created_at=r.created_at,
            ingredients_count=len(ingredients_out),
            cost_per_serving=cost_serving,
            ingredients=ingredients_out
        ))
    return out


@router.put("/api/businesses/{business_id}/recipes/{recipe_id}", response_model=RecipeOut)
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

    existing = session.exec(
        select(Recipe).where(
            Recipe.business_id == business_id,
            Recipe.id != recipe_id,
            func.lower(Recipe.recipe_name) == data.recipe_name.strip().lower()
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409, detail=f"A recipe with the name '{data.recipe_name.strip()}' already exists in this business")

    recipe.recipe_name = data.recipe_name.strip()
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

    recipe.sales_amount = data.sales_amount if data.sales_amount is not None else cost_serving
    session.add(recipe)
    session.commit()
    session.refresh(recipe)

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
        sales_amount=recipe.sales_amount,
        created_at=recipe.created_at,
        ingredients_count=len(ingredients_out),
        cost_per_serving=cost_serving,
        ingredients=ingredients_out
    )


@router.delete("/api/businesses/{business_id}/recipes/{recipe_id}")
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
