"""add asgard roles and plannings

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-09-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create specialties table
    op.create_table(
        "specialties",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("coordination_id", sa.Integer(), nullable=False),
        sa.Column("code", sqlmodel.sql.sqltypes.AutoString(length=80), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["coordination_id"], ["coordinations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_specialties_coordination_id", "specialties", ["coordination_id"], unique=False)

    # 2. Add Asgard fields to users
    op.add_column("users", sa.Column("first_name", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column("users", sa.Column("last_name", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column("users", sa.Column("phone", sqlmodel.sql.sqltypes.AutoString(length=30), nullable=True))
    op.add_column("users", sa.Column("coordination_id", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("specialty_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_users_coordination_id", "users", "coordinations", ["coordination_id"], ["id"])
    op.create_foreign_key("fk_users_specialty_id", "users", "specialties", ["specialty_id"], ["id"])

    # 3. Create pedagogical_plannings table
    op.create_table(
        "pedagogical_plannings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("coordination_id", sa.Integer(), nullable=False),
        sa.Column("specialty_id", sa.Integer(), nullable=False),
        sa.Column("leader_id", sa.Integer(), nullable=False),
        sa.Column("program_code", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column("program_name", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("program_version", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False, server_default="1"),
        sa.Column("project_code", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column("project_name", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("project_version", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False, server_default="1"),
        sa.Column("executing_team", sqlmodel.sql.sqltypes.AutoString(length=150), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False, server_default="draft"),
        sa.Column("observations", sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["coordination_id"], ["coordinations.id"]),
        sa.ForeignKeyConstraint(["specialty_id"], ["specialties.id"]),
        sa.ForeignKeyConstraint(["leader_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pedagogical_plannings_coordination_id", "pedagogical_plannings", ["coordination_id"], unique=False)
    op.create_index("ix_pedagogical_plannings_specialty_id", "pedagogical_plannings", ["specialty_id"], unique=False)
    op.create_index("ix_pedagogical_plannings_leader_id", "pedagogical_plannings", ["leader_id"], unique=False)

    # 4. Create planning_matrices table
    op.create_table(
        "planning_matrices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("planning_id", sa.Integer(), nullable=False),
        sa.Column("matrix_type", sqlmodel.sql.sqltypes.AutoString(length=30), nullable=False),
        sa.Column("original_filename", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("file_url", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["planning_id"], ["pedagogical_plannings.id"]),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_planning_matrices_planning_id", "planning_matrices", ["planning_id"], unique=False)

    # 5. Seed Asgard roles
    op.execute(
        "INSERT INTO roles (name, description, is_active) VALUES "
        "('superadmin', 'Rol Superadministrador', true), "
        "('lider_equipo', 'Rol Líder de Equipo Ejecutor', true), "
        "('usuario_adicional', 'Rol Usuario Adicional de Apoyo', true) "
        "ON CONFLICT (name) DO NOTHING"
    )

    # 6. Seed coordinations if missing
    op.execute(
        "INSERT INTO coordinations (code, name, description, is_active) VALUES "
        "('TELEINFORMATICA', 'Teleinformática', 'Coordinación de Teleinformática', true), "
        "('INDUSTRIAS_CREATIVAS', 'Industrias Creativas', 'Coordinación de Industrias Creativas') "
        "ON CONFLICT (code) DO NOTHING"
    )


def downgrade() -> None:
    op.drop_table("planning_matrices")
    op.drop_table("pedagogical_plannings")
    op.drop_constraint("fk_users_specialty_id", "users", type_="foreignkey")
    op.drop_constraint("fk_users_coordination_id", "users", type_="foreignkey")
    op.drop_column("users", "specialty_id")
    op.drop_column("users", "coordination_id")
    op.drop_column("users", "phone")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_table("specialties")
