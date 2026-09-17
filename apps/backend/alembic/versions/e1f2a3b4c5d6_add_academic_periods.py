"""add academic periods

Revision ID: e1f2a3b4c5d6
Revises: d9e2f4a6b7c8
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d9e2f4a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "academic_periods",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("quarter_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("year", "quarter_number", name="uq_academic_periods_year_quarter"),
    )
    op.create_index("ix_academic_periods_year", "academic_periods", ["year"])
    op.create_index("ix_academic_periods_quarter_number", "academic_periods", ["quarter_number"])


def downgrade() -> None:
    op.drop_index("ix_academic_periods_quarter_number", table_name="academic_periods")
    op.drop_index("ix_academic_periods_year", table_name="academic_periods")
    op.drop_table("academic_periods")
