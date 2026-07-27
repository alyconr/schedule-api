"""add additional hours to schedules

Revision ID: f7a0c1d2e3b4
Revises: f6d9b3a5e0c2
Create Date: 2026-07-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7a0c1d2e3b4"
down_revision: Union[str, None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("schedules", sa.Column("is_additional_hours", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("schedules", sa.Column("additional_hours_type", sa.String(length=120), nullable=True))
    op.alter_column("schedules", "group_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("schedules", "environment_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column("schedules", "environment_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("schedules", "group_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("schedules", "additional_hours_type")
    op.drop_column("schedules", "is_additional_hours")
