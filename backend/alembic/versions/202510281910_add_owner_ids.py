"""add owner scoping to clients and appointments

Revision ID: 202510281910
Revises: 20251007192418
Create Date: 2025-10-28 13:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "202510281910"
down_revision = "20251007192418"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("owner_id", sa.Integer(), nullable=True))
    op.create_index("ix_clients_owner_id", "clients", ["owner_id"], unique=False)
    op.create_foreign_key("clients_owner_id_fkey", "clients", "users", ["owner_id"], ["id"], ondelete="CASCADE")

    op.add_column("appointments", sa.Column("owner_id", sa.Integer(), nullable=True))
    op.create_index("ix_appointments_owner_id", "appointments", ["owner_id"], unique=False)
    op.create_foreign_key("appointments_owner_id_fkey", "appointments", "users", ["owner_id"], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    op.drop_constraint("appointments_owner_id_fkey", "appointments", type_="foreignkey")
    op.drop_index("ix_appointments_owner_id", table_name="appointments")
    op.drop_column("appointments", "owner_id")

    op.drop_constraint("clients_owner_id_fkey", "clients", type_="foreignkey")
    op.drop_index("ix_clients_owner_id", table_name="clients")
    op.drop_column("clients", "owner_id")
