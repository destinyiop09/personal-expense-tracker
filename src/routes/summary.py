from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from src.database import get_db
from src.dependencies import get_current_user
from src.model import Category, Transaction, User


router = APIRouter(
    prefix="/summary",
    tags=["Summary"],
)


@router.get("/")
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_income = (
        db.query(Transaction.amount)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
        )
        .all()
    )

    total_expenses = (
        db.query(Transaction.amount)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
        )
        .all()
    )

    income = sum(
        (amount for (amount,) in total_income),
        Decimal("0"),
    )

    expenses = sum(
        (amount for (amount,) in total_expenses),
        Decimal("0"),
    )

    balance = income - expenses

    return {
        "total_income": income,
        "total_expenses": expenses,
        "balance": balance,
    }


@router.get("/categories")
def get_category_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = (
        db.query(
            Category.name,
            Transaction.amount,
        )
        .join(
            Transaction,
            Transaction.category_id == Category.id,
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
        )
        .all()
    )

    category_totals = {}

    for category_name, amount in results:
        if category_name not in category_totals:
            category_totals[category_name] = Decimal("0")

        category_totals[category_name] += amount

    return [
        {
            "category": category,
            "total": total,
        }
        for category, total in category_totals.items()
    ]


@router.get("/monthly")
def get_monthly_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = (
        db.query(
            extract("year", Transaction.date).label("year"),
            extract("month", Transaction.date).label("month"),
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
        )
        .group_by(
            extract("year", Transaction.date),
            extract("month", Transaction.date),
        )
        .order_by(
            extract("year", Transaction.date),
            extract("month", Transaction.date),
        )
        .all()
    )

    return [
        {
            "year": int(year),
            "month": int(month),
            "total": total,
        }
        for year, month, total in results
    ]
