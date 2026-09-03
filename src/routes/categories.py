from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_user
from src.model import Category, User


router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
)


@router.get("/")
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    categories = (
        db.query(Category)
        .order_by(Category.type, Category.name)
        .all()
    )

    return categories
