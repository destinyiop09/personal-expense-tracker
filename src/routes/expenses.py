from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_user
from src.model import Category, Transaction, User
from src.schema import TransactionCreate, TransactionUpdate, TransactionType


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)


@router.get("/")
def get_transactions(
    type: TransactionType | None = None,
    category_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
    )

    if type is not None:
        query = query.filter(Transaction.type == type.value)

    if category_id is not None:
        query = query.filter(Transaction.category_id == category_id)

    return query.all()


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
    category = (
        db.query(Category)
        .filter(Category.id == transaction_data.category_id)
        .first()
    )

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    if category.type != transaction_data.type.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category does not match transaction type",
        )

    transaction = Transaction(
        user_id=current_user.id,
        amount=transaction_data.amount,
        type=transaction_data.type.value,
        category_id=transaction_data.category_id,
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

    new_type = (
        transaction_data.type.value
        if transaction_data.type is not None
        else transaction.type
    )

    if transaction_data.category_id is not None:
        category = (
            db.query(Category)
            .filter(Category.id == transaction_data.category_id)
            .first()
        )

        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )

        if category.type != new_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not match transaction type",
            )

        transaction.category_id = transaction_data.category_id

    if transaction_data.amount is not None:
        transaction.amount = transaction_data.amount

    if transaction_data.type is not None:
        transaction.type = transaction_data.type.value

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
