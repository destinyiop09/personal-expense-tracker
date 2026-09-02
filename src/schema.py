from datetime import date as Date
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


class TransactionCreate(BaseModel):
    amount: Decimal
    type: TransactionType
    category: str
    description: str | None = None
    date: Date


class TransactionUpdate(BaseModel):
    amount: Decimal | None = None
    type: TransactionType | None = None
    category: str | None = None
    description: str | None = None
    date: Date | None = None
