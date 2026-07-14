"""add vinculation fields

Revision ID: d4b7e1a9c8f2
Revises: c7a91d4e2b3f
Create Date: 2026-07-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4b7e1a9c8f2"
down_revision: Union[str, None] = "c7a91d4e2b3f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("contract_types", sa.Column("category", sa.String(length=50), nullable=True))
    op.add_column(
        "contract_types",
        sa.Column("monthly_training_hours", sa.Numeric(precision=7, scale=1), nullable=False, server_default="0"),
    )
    op.add_column(
        "contract_types",
        sa.Column("monthly_additional_hours", sa.Numeric(precision=7, scale=1), nullable=False, server_default="0"),
    )
    op.add_column("contract_types", sa.Column("source_label", sa.String(length=100), nullable=True))
    op.add_column(
        "instructors",
        sa.Column("monthly_training_hours", sa.Numeric(precision=7, scale=1), nullable=False, server_default="0"),
    )
    op.add_column(
        "instructors",
        sa.Column("monthly_additional_hours", sa.Numeric(precision=7, scale=1), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("instructors", "monthly_additional_hours")
    op.drop_column("instructors", "monthly_training_hours")
    op.drop_column("contract_types", "source_label")
    op.drop_column("contract_types", "monthly_additional_hours")
    op.drop_column("contract_types", "monthly_training_hours")
    op.drop_column("contract_types", "category")
