from fastapi import APIRouter, Depends

from src.dependencies import get_current_user
from src.model import User


router = APIRouter()


@router.get("/")
def home(current_user: User = Depends(get_current_user)):
    return {
        "message": "You are authenticated",
        "user_id": current_user.id,
        "email": current_user.email,
    }