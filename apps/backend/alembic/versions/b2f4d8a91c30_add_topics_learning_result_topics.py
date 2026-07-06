"""add topics learning result topics

Revision ID: b2f4d8a91c30
Revises: 681fab9aaec9
Create Date: 2026-07-06 00:00:00.000000

"""
from typing import Sequence, Union

import sqlmodel

from alembic import op
import sqlalchemy as sa


revision: str = "b2f4d8a91c30"
down_revision: Union[str, Sequence[str], None] = "681fab9aaec9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "topics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column("program_scope", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("trimester", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("trimester_number", sa.Integer(), nullable=True),
        sa.Column("estimated_hours", sa.Numeric(precision=6, scale=1), nullable=True),
        sa.Column("source_sheet", sqlmodel.sql.sqltypes.AutoString(length=150), nullable=True),
        sa.Column("source_address", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("source_row", sa.Integer(), nullable=True),
        sa.Column("source_col", sa.Integer(), nullable=True),
        sa.Column("color_key", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("color_hex", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "learning_result_topics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("relation_id", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=False),
        sa.Column("learning_result_id", sa.Integer(), nullable=False),
        sa.Column("topic_id", sa.Integer(), nullable=False),
        sa.Column("group_id", sqlmodel.sql.sqltypes.AutoString(length=80), nullable=False),
        sa.Column("program_scope", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("trimester_number", sa.Integer(), nullable=True),
        sa.Column("color_key", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("color_hex", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("relation_method", sqlmodel.sql.sqltypes.AutoString(length=80), nullable=False),
        sa.Column("relation_status", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column("confidence", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("needs_manual_review", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["learning_result_id"], ["learning_results.id"]),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("learning_result_id", "topic_id", "group_id"),
        sa.UniqueConstraint("relation_id"),
    )


def downgrade() -> None:
    op.drop_table("learning_result_topics")
    op.drop_table("topics")
