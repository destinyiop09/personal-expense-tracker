from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routes.expenses import router as expenses_route
from src.routes.auth import router as auth_route
from src.routes.summary import router as summary_route
from src.routes.categories import router as categories


app = FastAPI()

# Allow the frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
 allow_origins=[
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://personal-expense-tracker-pink-two.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories)
app.include_router(expenses_route)
app.include_router(auth_route)
app.include_router(summary_route)
