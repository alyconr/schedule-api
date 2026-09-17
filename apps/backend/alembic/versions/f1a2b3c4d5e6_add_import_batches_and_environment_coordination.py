"""add import batches and environment coordination

Revision ID: f1a2b3c4d5e6
Revises: e1f2a3b4c5d6
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "environment_coordinations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("environment_id", sa.Integer(), sa.ForeignKey("environments.id"), nullable=False),
        sa.Column("coordination_id", sa.Integer(), sa.ForeignKey("coordinations.id"), nullable=False),
        sa.UniqueConstraint("environment_id", "coordination_id", name="uq_environment_coordination"),
    )

    op.create_table(
        "import_batches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("import_type", sa.String(length=50), nullable=False),
        sa.Column("coordination_id", sa.Integer(), sa.ForeignKey("coordinations.id"), nullable=True),
        sa.Column("uploaded_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_sha256", sa.String(length=64), nullable=False),
        sa.Column("profile_version", sa.String(length=50), nullable=True),
        sa.Column("mode", sa.String(length=50), nullable=False, server_default="safe_merge"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="previewed"),
        sa.Column("created_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unchanged_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("conflict_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rejected_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("warning_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("summary_data", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("committed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_import_batches_file_sha256", "import_batches", ["file_sha256"])
    op.create_index("ix_import_batches_coordination_id", "import_batches", ["coordination_id"])

    op.create_table(
        "import_batch_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("import_batches.id"), nullable=False),
        sa.Column("coordination_id", sa.Integer(), sa.ForeignKey("coordinations.id"), nullable=True),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("natural_key", sa.String(length=150), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("before_hash", sa.String(length=64), nullable=True),
        sa.Column("after_hash", sa.String(length=64), nullable=True),
        sa.Column("source_sheet", sa.String(length=100), nullable=True),
        sa.Column("source_row", sa.Integer(), nullable=True),
        sa.Column("conflict_reason", sa.String(length=500), nullable=True),
        sa.Column("changes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_import_batch_records_batch_id", "import_batch_records", ["batch_id"])
    op.create_index("ix_import_batch_records_entity_type", "import_batch_records", ["entity_type"])


def downgrade() -> None:
    op.drop_index("ix_import_batch_records_entity_type", table_name="import_batch_records")
    op.drop_index("ix_import_batch_records_batch_id", table_name="import_batch_records")
    op.drop_table("import_batch_records")

    op.drop_index("ix_import_batches_coordination_id", table_name="import_batches")
    op.drop_index("ix_import_batches_file_sha256", table_name="import_batches")
    op.drop_table("import_batches")

    op.drop_table("environment_coordinations")
