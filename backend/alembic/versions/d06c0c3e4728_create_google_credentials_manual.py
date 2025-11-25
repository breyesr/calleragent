"""create_google_credentials_manual

Revision ID: d06c0c3e4728
Revises: 20251007192418
Create Date: 2025-11-25 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "d06c0c3e4728"
down_revision = "20251007192418"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "google_credentials",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("access_token", sa.String(length=512), nullable=True),
        sa.Column("refresh_token", sa.String(length=512), nullable=True),
        sa.Column("calendar_id", sa.String(length=255), nullable=True, server_default="primary"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("google_credentials")
