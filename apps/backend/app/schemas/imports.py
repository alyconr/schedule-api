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


class ImportPreviewResponse(BaseModel):
    import_type: str
    filename: str
    sheets_detected: list[str]
    summary: dict[str, ImportEntitySummary]
    items: Optional[dict[str, list[Any]]] = None
    warnings: list[ImportIssue]
    errors: list[ImportIssue]


class ImportCommitResponse(BaseModel):
    status: str
    created: dict[str, int]
    updated: dict[str, int]
    rejected: int
    warnings: list[ImportIssue]
    errors: list[ImportIssue]


class TemplateInfoResponse(BaseModel):
    supported_formats: list[str]
    supported_import_types: list[str]
    required_sheets: list[str]
    optional_sheets: list[str]
