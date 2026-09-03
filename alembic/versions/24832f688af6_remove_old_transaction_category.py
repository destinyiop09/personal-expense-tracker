"""remove old transaction category

Revision ID: 24832f688af6
Revises: 8afdc7418d40
Create Date: 2026-09-02 21:45:26.286641

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "24832f688af6"
down_revision: Union[str, Sequence[str], None] = "8afdc7418d40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("transactions", "category")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "transactions",
        sa.Column(
            "category",
            sa.String(length=100),
            nullable=True,
        ),
    )
