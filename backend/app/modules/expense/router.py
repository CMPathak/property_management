import uuid
from datetime import date
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.modules.expense.model import Expense
from app.modules.expense.schema import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.modules.users.model import User
from app.permissions.rbac import PermissionChecker, PermissionAction

router = APIRouter()


@router.get("/", response_model=list[ExpenseResponse])
async def list_expenses(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(PermissionChecker("expense", PermissionAction.READ)),
) -> Any:
    """
    Get list of all expenses from database.
    """
    stmt = (
        select(Expense)
        .where(Expense.deleted_at.is_(None))
        .order_by(Expense.expense_date.desc(), Expense.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    res = await db.execute(stmt)
    expenses = res.scalars().all()

    items = []
    for e in expenses:
        items.append({
            "id": e.id,
            "title": e.description or f"{e.category} Expense",
            "description": e.description,
            "category": e.category,
            "amount": float(e.amount or 0.0),
            "expense_date": e.expense_date,
            "payment_mode": e.payment_mode or "ONLINE",
            "status": "PAID",
            "property_id": e.property_id,
            "created_at": e.created_at,
            "updated_at": e.updated_at,
        })
    return items


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: ExpenseCreate,
    current_user: User = Depends(PermissionChecker("expense", PermissionAction.CREATE)),
) -> Any:
    """
    Record a new expense.
    """
    if not obj_in.property_id:
        from app.modules.properties.model import Property
        p_res = await db.execute(select(Property.id).where(Property.deleted_at.is_(None)).limit(1))
        p_id = p_res.scalar_one_or_none()
        obj_in.property_id = p_id

    desc = obj_in.title or obj_in.description or "General Expense"
    exp_date = obj_in.expense_date or date.today()

    exp = Expense(
        property_id=obj_in.property_id,
        category=obj_in.category,
        amount=obj_in.amount,
        expense_date=exp_date,
        description=desc,
        payment_mode=obj_in.payment_mode,
        created_by=current_user.id,
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)

    return {
        "id": exp.id,
        "title": exp.description,
        "description": exp.description,
        "category": exp.category,
        "amount": float(exp.amount),
        "expense_date": exp.expense_date,
        "payment_mode": exp.payment_mode or "ONLINE",
        "status": "PAID",
        "property_id": exp.property_id,
        "created_at": exp.created_at,
        "updated_at": exp.updated_at,
    }
