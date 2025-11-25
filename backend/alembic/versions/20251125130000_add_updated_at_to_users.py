"""add_updated_at_to_users

Revision ID: 20251125130000
Revises: d06c0c3e4728
Create Date: 2025-11-25 13:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251125130000"
down_revision = "d06c0c3e4728"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "updated_at")
