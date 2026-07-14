"""add productive stage end date to groups

Revision ID: e5c8a2f4d9b1
Revises: d4b7e1a9c8f2
"""

from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = "e5c8a2f4d9b1"
down_revision: Union[str, None] = "d4b7e1a9c8f2"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("groups", sa.Column("productive_stage_end_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("groups", "productive_stage_end_date")
