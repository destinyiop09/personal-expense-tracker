"""seed predefined categories

Revision ID: 8afdc7418d40
Revises: d0a33a7f1c66
Create Date: 2026-09-02 21:29:05.004998

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8afdc7418d40"
down_revision: Union[str, Sequence[str], None] = "d0a33a7f1c66"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM categories
        WHERE
            (name, type) IN (
                ('Food', 'expense'),
                ('Transport', 'expense'),
                ('Housing', 'expense'),
                ('Bills & Utilities', 'expense'),
                ('Shopping', 'expense'),
                ('Health', 'expense'),
                ('Entertainment', 'expense'),
                ('Education', 'expense'),
                ('Travel', 'expense'),
                ('Other', 'expense'),
                ('Salary', 'income'),
                ('Freelance', 'income'),
                ('Business', 'income'),
                ('Investment', 'income'),
                ('Bonus', 'income'),
                ('Gift', 'income'),
                ('Other', 'income')
            )
        """
    )
