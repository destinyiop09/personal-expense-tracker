from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_user
from src.model import Transaction, User
from src.schema import TransactionCreate, TransactionUpdate, TransactionType


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)


@router.get("/")
def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .all()
    )

    return transactions


@router.get("/{transaction_id}")
def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    return transaction


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = Transaction(
        user_id=current_user.id,
        amount=transaction_data.amount,
        type=transaction_data.type,
        category=transaction_data.category,
        description=transaction_data.description,
        date=transaction_data.date,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.put("/{transaction_id}")
def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    if transaction_data.amount is not None:
        transaction.amount = transaction_data.amount

    if transaction_data.type is not None:
        transaction.type = transaction_data.type.value

    if transaction_data.category is not None:
        transaction.category = transaction_data.category

    if transaction_data.description is not None:
        transaction.description = transaction_data.description

    if transaction_data.date is not None:
        transaction.date = transaction_data.date

    db.commit()
    db.refresh(transaction)

    return transaction


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    db.delete(transaction)
    db.commit()

    return {"message": "Transaction deleted successfully"}


@router.get("/")
def get_transactions(
    type: TransactionType | None = None,
    category: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
    )

    if type is not None:
        query = query.filter(Transaction.type == type.value)

    if category is not None:
        query = query.filter(Transaction.category == category)

    return query.all()
