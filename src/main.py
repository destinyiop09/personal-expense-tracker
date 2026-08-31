from fastapi import FastAPI
from src.routes.expenses import router as expenses_route

app = FastAPI()

app.include_router(expenses_route)
