from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class ImportBatch(SQLModel, table=True):
    __tablename__ = "import_batches"

    id: Optional[int] = Field(default=None, primary_key=True)
    import_type: str = Field(max_length=50)
    coordination_id: Optional[int] = Field(default=None, foreign_key="coordinations.id")
    uploaded_by_user_id: int = Field(foreign_key="users.id")
    filename: str = Field(max_length=255)
    file_sha256: str = Field(max_length=64, index=True)
    profile_version: Optional[str] = Field(default=None, max_length=50)
    mode: str = Field(default="safe_merge", max_length=50)
    status: str = Field(default="previewed", max_length=50)  # previewed, completed, completed_with_warnings, failed
    created_count: int = Field(default=0)
    updated_count: int = Field(default=0)
    unchanged_count: int = Field(default=0)
    conflict_count: int = Field(default=0)
    rejected_count: int = Field(default=0)
    warning_count: int = Field(default=0)
    error_count: int = Field(default=0)
    summary_data: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    committed_at: Optional[datetime] = Field(default=None)


class ImportBatchRecord(SQLModel, table=True):
    __tablename__ = "import_batch_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    batch_id: int = Field(foreign_key="import_batches.id", index=True)
    coordination_id: Optional[int] = Field(default=None, foreign_key="coordinations.id")
    entity_type: str = Field(max_length=50, index=True)
    entity_id: Optional[int] = Field(default=None)
    natural_key: str = Field(max_length=150)
    action: str = Field(max_length=50)  # CREATE, UPDATE, UNCHANGED, CONFLICT, REJECTED
    before_hash: Optional[str] = Field(default=None, max_length=64)
    after_hash: Optional[str] = Field(default=None, max_length=64)
    source_sheet: Optional[str] = Field(default=None, max_length=100)
    source_row: Optional[int] = Field(default=None)
    conflict_reason: Optional[str] = Field(default=None, max_length=500)
    changes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
