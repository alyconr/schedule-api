"""add program topics to schedules

Revision ID: c7a91d4e2b3f
Revises: b2f4d8a91c30
Create Date: 2026-07-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7a91d4e2b3f"
down_revision: Union[str, None] = "b2f4d8a91c30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("learning_result_topics", sa.Column("training_program_id", sa.Integer(), nullable=True))
    op.add_column("learning_result_topics", sa.Column("training_program_code", sa.String(length=50), nullable=True))
    op.add_column("learning_result_topics", sa.Column("training_program_name", sa.String(length=300), nullable=True))
    op.create_foreign_key(
        "fk_learning_result_topics_training_program_id",
        "learning_result_topics",
        "training_programs",
        ["training_program_id"],
        ["id"],
    )
    op.create_unique_constraint(
        "uq_learning_result_topics_program_lr_topic_group",
        "learning_result_topics",
        ["training_program_id", "learning_result_id", "topic_id", "group_id"],
    )

    op.add_column("schedules", sa.Column("learning_result_topic_id", sa.Integer(), nullable=True))
    op.add_column("schedules", sa.Column("manual_topic_name", sa.String(length=500), nullable=True))
    op.create_foreign_key(
        "fk_schedules_learning_result_topic_id",
        "schedules",
        "learning_result_topics",
        ["learning_result_topic_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_schedules_learning_result_topic_id", "schedules", type_="foreignkey")
    op.drop_column("schedules", "manual_topic_name")
    op.drop_column("schedules", "learning_result_topic_id")

    op.drop_constraint("uq_learning_result_topics_program_lr_topic_group", "learning_result_topics", type_="unique")
    op.drop_constraint("fk_learning_result_topics_training_program_id", "learning_result_topics", type_="foreignkey")
    op.drop_column("learning_result_topics", "training_program_name")
    op.drop_column("learning_result_topics", "training_program_code")
    op.drop_column("learning_result_topics", "training_program_id")
