"""add productive stage start date to groups

Revision ID: f6d9b3a5e0c2
Revises: e5c8a2f4d9b1
"""

from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = "f6d9b3a5e0c2"
down_revision: Union[str, None] = "e5c8a2f4d9b1"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("groups", sa.Column("productive_stage_start_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("groups", "productive_stage_start_date")
