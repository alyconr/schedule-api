from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel


class ImportIssue(BaseModel):
    sheet: str
    row: Optional[int] = None
    entity: Optional[str] = None
    severity: Literal["warning", "error"]
    message: str
    raw_value: Optional[str] = None


class ImportEntitySummary(BaseModel):
    valid: int
    warnings: int
    rejected: int
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    conflicts: int = 0


class ImportConflictItem(BaseModel):
    entity: str
    natural_key: str
    sheet: Optional[str] = None
    row: Optional[int] = None
    message: str


class ImportFieldChange(BaseModel):
    before: Any
    after: Any


class ImportChangeItem(BaseModel):
    entity: str
    natural_key: str
    changes: dict[str, ImportFieldChange]


class ImportPreviewResponse(BaseModel):
    import_type: str
    filename: str
    sheets_detected: list[str]
    summary: dict[str, ImportEntitySummary]
    items: Optional[dict[str, list[Any]]] = None
    warnings: list[ImportIssue]
    errors: list[ImportIssue]
    file_sha256: Optional[str] = None
    coordination_id: Optional[int] = None
    mode: str = "safe_merge"
    is_reimport: bool = False
    conflicts_detail: list[ImportConflictItem] = []
    changes_detail: list[ImportChangeItem] = []


class ImportCommitResponse(BaseModel):
    status: str
    batch_id: Optional[int] = None
    created: dict[str, int]
    updated: dict[str, int]
    unchanged: dict[str, int] = {}
    conflicts: dict[str, int] = {}
    rejected: int
    warnings: list[ImportIssue]
    errors: list[ImportIssue]
    file_sha256: Optional[str] = None


class ImportBatchRead(BaseModel):
    id: int
    import_type: str
    coordination_id: Optional[int] = None
    uploaded_by_user_id: int
    filename: str
    file_sha256: str
    mode: str
    status: str
    created_count: int
    updated_count: int
    unchanged_count: int
    conflict_count: int
    rejected_count: int
    warning_count: int
    error_count: int
    created_at: datetime
    committed_at: Optional[datetime] = None


class ImportBatchDetailRead(ImportBatchRead):
    summary_data: Optional[str] = None
    records: list[dict[str, Any]] = []


class TemplateInfoResponse(BaseModel):
    supported_formats: list[str]
    supported_import_types: list[str]
    required_sheets: list[str]
    optional_sheets: list[str]
