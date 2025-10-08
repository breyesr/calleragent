"""add created_at to users"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20251007192418"
down_revision: Union[str, None] = "20251007131310"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "created_at")
