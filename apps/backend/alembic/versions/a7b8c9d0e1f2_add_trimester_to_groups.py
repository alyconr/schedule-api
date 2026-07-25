"""add trimester to groups and backfill from notes

Revision ID: a7b8c9d0e1f2
Revises: f6d9b3a5e0c2
"""
import re
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "f6d9b3a5e0c2"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("groups", sa.Column("trimester", sa.String(length=50), nullable=True))

    bind = op.get_bind()
    metadata = sa.MetaData()
    groups = sa.Table(
        "groups",
        metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("notes", sa.Text),
        sa.Column("trimester", sa.String(50)),
    )

    results = bind.execute(sa.select(groups.c.id, groups.c.notes).where(groups.c.notes.isnot(None))).fetchall()

    for group_id, notes in results:
        if not notes:
            continue
        match = re.search(r"trimestre:\s*([^|]+)", notes, re.IGNORECASE)
        if match:
            extracted = match.group(1).strip()
            if extracted:
                trimester_val = extracted[:50]
                bind.execute(
                    groups.update()
                    .where(groups.c.id == group_id)
                    .values(trimester=trimester_val)
                )


def downgrade() -> None:
    op.drop_column("groups", "trimester")
