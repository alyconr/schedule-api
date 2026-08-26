"""add coordination scoped access

Revision ID: d9e2f4a6b7c8
Revises: c8d1e2f3a4b5
Create Date: 2026-08-25
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d9e2f4a6b7c8"
down_revision: Union[str, None] = "c8d1e2f3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "coordinations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=80), nullable=False, unique=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "user_coordinations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("coordination_id", sa.Integer(), sa.ForeignKey("coordinations.id"), nullable=False),
        sa.UniqueConstraint("user_id", "coordination_id", name="uq_user_coordination"),
    )
    op.create_index("ix_user_coordinations_user_id", "user_coordinations", ["user_id"])
    op.create_index("ix_user_coordinations_coordination_id", "user_coordinations", ["coordination_id"])

    op.create_table(
        "instructor_coordinations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("instructor_id", sa.Integer(), sa.ForeignKey("instructors.id"), nullable=False),
        sa.Column("coordination_id", sa.Integer(), sa.ForeignKey("coordinations.id"), nullable=False),
        sa.UniqueConstraint("instructor_id", "coordination_id", name="uq_instructor_coordination"),
    )
    op.create_index("ix_instructor_coordinations_instructor_id", "instructor_coordinations", ["instructor_id"])
    op.create_index("ix_instructor_coordinations_coordination_id", "instructor_coordinations", ["coordination_id"])

    op.add_column("groups", sa.Column("coordination_id", sa.Integer(), sa.ForeignKey("coordinations.id"), nullable=True))
    op.create_index("ix_groups_coordination_id", "groups", ["coordination_id"])

    op.add_column("instructors", sa.Column("primary_coordination_id", sa.Integer(), sa.ForeignKey("coordinations.id"), nullable=True))
    op.create_index("ix_instructors_primary_coordination_id", "instructors", ["primary_coordination_id"])

    op.add_column("schedules", sa.Column("coordination_id", sa.Integer(), sa.ForeignKey("coordinations.id"), nullable=True))
    op.create_index("ix_schedules_coordination_id", "schedules", ["coordination_id"])

    # Backfill schedule coordination_id from group where determinista
    op.execute(
        "UPDATE schedules SET coordination_id = g.coordination_id "
        "FROM groups g WHERE schedules.group_id = g.id AND g.coordination_id IS NOT NULL"
    )

    # Seed initial coordinations
    op.execute(
        "INSERT INTO coordinations (code, name, description, is_active) VALUES "
        "('LOGISTICA', 'Logística', 'Coordinación de Logística', true), "
        "('MERCADEO', 'Mercadeo', 'Coordinación de Mercadeo', true), "
        "('TELEINFORMATICA_INDUSTRIAS_CREATIVAS', 'Teleinformática e Industrias Creativas', 'Coordinación de Teleinformática e Industrias Creativas', true), "
        "('ARTICULACION_MEDIA', 'Articulación con la Media', 'Coordinación de Articulación con la Media', true), "
        "('TRANSVERSALES', 'Transversales', 'Coordinación de Transversales', true) "
        "ON CONFLICT (code) DO NOTHING"
    )


def downgrade() -> None:
    op.drop_index("ix_schedules_coordination_id", table_name="schedules")
    op.drop_column("schedules", "coordination_id")

    op.drop_index("ix_instructors_primary_coordination_id", table_name="instructors")
    op.drop_column("instructors", "primary_coordination_id")

    op.drop_index("ix_groups_coordination_id", table_name="groups")
    op.drop_column("groups", "coordination_id")

    op.drop_index("ix_instructor_coordinations_coordination_id", table_name="instructor_coordinations")
    op.drop_index("ix_instructor_coordinations_instructor_id", table_name="instructor_coordinations")
    op.drop_table("instructor_coordinations")

    op.drop_index("ix_user_coordinations_coordination_id", table_name="user_coordinations")
    op.drop_index("ix_user_coordinations_user_id", table_name="user_coordinations")
    op.drop_table("user_coordinations")

    op.drop_table("coordinations")
