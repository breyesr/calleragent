"""add google integration table

Revision ID: 20251120170000
Revises: 20251007192418_add_created_at_to_users
Create Date: 2025-11-20 17:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20251120170000"
down_revision: Union[str, None] = "20251007192418"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "google_integrations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("account_email", sa.String(length=255), nullable=True),
        sa.Column("access_token_encrypted", sa.String(length=4096), nullable=True),
        sa.Column("refresh_token_encrypted", sa.String(length=4096), nullable=True),
        sa.Column("token_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="disconnected"),
        sa.Column("state_token", sa.String(length=255), nullable=True),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="stub"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_google_integrations_user_id", "google_integrations", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_google_integrations_user_id", table_name="google_integrations")
    op.drop_table("google_integrations")
