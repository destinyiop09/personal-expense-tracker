from sqlalchemy import Date, Numeric, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column 
from decimal import Decimal 
from datetime import date


from src.database import Base

class User(Base):
    __tablename__ = "Users"

    id : Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )
    Name: Mapped[str] = mapped_column(
        Sring(100),
        nullable=False
    )
    Email: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True
        
    )

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )
    
    amount: Mapped[Decimal] = mapped_column(
    Numeric(10, 2),
    nullable=False
)
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )