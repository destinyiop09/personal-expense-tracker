from fastapi import FastAPI


from src.routes.expenses import router as expenses_route
from src.routes.auth import router as auth_route

app = FastAPI()

app.include_router(expenses_route)
app.include_router(auth_route)
