from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def Home():
    return {
        "message":"Expense Tracker is running "
    }


@router.get("/")
def home():
    return {"message": "Expense running"}


@router.get("/expenses")
def get_expenses():
    return {"message": "All expenses"}


@router.post("/expenses")
def create_expense():
    return {"message": "Expense created"}


@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int):
    return {"message": f"Deleted {expense_id}"}