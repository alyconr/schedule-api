"""add schedule year and quarter

Revision ID: c8d1e2f3a4b5
Revises: f7a0c1d2e3b4
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8d1e2f3a4b5"
down_revision: Union[str, None] = "f7a0c1d2e3b4"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("schedules", sa.Column("schedule_year", sa.SmallInteger(), nullable=True))
    op.add_column("schedules", sa.Column("schedule_quarter", sa.SmallInteger(), nullable=True))
    op.execute(
        """
        UPDATE schedules
        SET schedule_year = EXTRACT(YEAR FROM date)::smallint,
            schedule_quarter = (((EXTRACT(MONTH FROM date)::int - 1) / 3) + 1)::smallint
        """
    )
    op.alter_column("schedules", "schedule_year", nullable=False)
    op.alter_column("schedules", "schedule_quarter", nullable=False)
    op.create_check_constraint(
        "ck_schedules_schedule_quarter",
        "schedules",
        "schedule_quarter BETWEEN 1 AND 4",
    )
    op.create_check_constraint(
        "ck_schedules_schedule_year_matches_date",
        "schedules",
        "schedule_year = EXTRACT(YEAR FROM date)::smallint",
    )
    op.create_check_constraint(
        "ck_schedules_schedule_quarter_matches_date",
        "schedules",
        "schedule_quarter = (((EXTRACT(MONTH FROM date)::int - 1) / 3) + 1)::smallint",
    )
    op.create_index(
        "ix_schedules_instructor_period_date",
        "schedules",
        ["instructor_id", "schedule_year", "schedule_quarter", "date"],
    )
    op.create_index(
        "ix_schedules_group_period",
        "schedules",
        ["group_id", "schedule_year", "schedule_quarter"],
    )


def downgrade() -> None:
    op.drop_index("ix_schedules_group_period", table_name="schedules")
    op.drop_index("ix_schedules_instructor_period_date", table_name="schedules")
    op.drop_constraint("ck_schedules_schedule_quarter_matches_date", "schedules", type_="check")
    op.drop_constraint("ck_schedules_schedule_year_matches_date", "schedules", type_="check")
    op.drop_constraint("ck_schedules_schedule_quarter", "schedules", type_="check")
    op.drop_column("schedules", "schedule_quarter")
    op.drop_column("schedules", "schedule_year")
