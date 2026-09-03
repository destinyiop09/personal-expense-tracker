"""add categories and link transactions

Revision ID: d0a33a7f1c66
Revises: 2dc44403e156
Create Date: 2026-09-02 21:18:32.464944

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d0a33a7f1c66"
down_revision: Union[str, Sequence[str], None] = "2dc44403e156"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the categories table
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "name",
            "type",
            name="uq_category_name_type",
        ),
    )

    # 2. Add category_id temporarily as nullable
    op.add_column(
        "transactions",
        sa.Column("category_id", sa.Integer(), nullable=True),
    )

    # 3. Connect transactions to categories
    op.create_foreign_key(
        "fk_transactions_category_id",
        "transactions",
        "categories",
        ["category_id"],
        ["id"],
    )

    # 4. Insert predefined categories
    categories_table = sa.table(
        "categories",
        sa.column("name", sa.String),
        sa.column("type", sa.String),
    )

    op.bulk_insert(
        categories_table,
        [
            # Expense categories
            {"name": "Food", "type": "expense"},
            {"name": "Transport", "type": "expense"},
            {"name": "Housing", "type": "expense"},
            {"name": "Bills & Utilities", "type": "expense"},
            {"name": "Shopping", "type": "expense"},
            {"name": "Health", "type": "expense"},
            {"name": "Entertainment", "type": "expense"},
            {"name": "Education", "type": "expense"},
            {"name": "Travel", "type": "expense"},
            {"name": "Other", "type": "expense"},

            # Income categories
            {"name": "Salary", "type": "income"},
            {"name": "Freelance", "type": "income"},
            {"name": "Business", "type": "income"},
            {"name": "Investment", "type": "income"},
            {"name": "Bonus", "type": "income"},
            {"name": "Gift", "type": "income"},
            {"name": "Other", "type": "income"},
        ],
    )

    # 5. Link existing transactions to their categories
    op.execute(
        """
        UPDATE transactions AS t
        SET category_id = c.id
        FROM categories AS c
        WHERE LOWER(TRIM(t.category)) = LOWER(c.name)
          AND t.type = c.type
        """
    )


def downgrade() -> None:
    # 1. Restore the old category column
    op.add_column(
        "transactions",
        sa.Column(
            "category",
            sa.VARCHAR(length=100),
            nullable=True,
        ),
    )

    # 2. Restore category names from the categories table
    op.execute(
        """
        UPDATE transactions AS t
        SET category = c.name
        FROM categories AS c
        WHERE t.category_id = c.id
        """
    )

    # 3. Remove the foreign key
    op.drop_constraint(
        "fk_transactions_category_id",
        "transactions",
        type_="foreignkey",
    )

    # 4. Remove category_id
    op.drop_column(
        "transactions",
        "category_id",
    )

    # 5. Remove categories table
    op.drop_table("categories")
