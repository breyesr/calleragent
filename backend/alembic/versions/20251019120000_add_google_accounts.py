"""add google_accounts table"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20251019120000"
down_revision: Union[str, None] = "20251007192418"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "google_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=50), server_default="google", nullable=False),
        sa.Column("google_account_email", sa.String(length=255), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=False),
        sa.Column("scope", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            server_onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_google_accounts_user_id"), "google_accounts", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_google_accounts_google_account_email"), "google_accounts", ["google_account_email"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_google_accounts_google_account_email"), table_name="google_accounts")
    op.drop_index(op.f("ix_google_accounts_user_id"), table_name="google_accounts")
    op.drop_table("google_accounts")
