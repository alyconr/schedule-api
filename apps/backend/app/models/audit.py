from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[str] = Field(default=None, max_length=200)
    action: str = Field(max_length=50)
    entity_type: str = Field(max_length=50)
    entity_id: Optional[str] = Field(default=None, max_length=50)
    previous_values: Optional[str] = None
    new_values: Optional[str] = None
    reason: Optional[str] = Field(default=None, max_length=500)
    ip_address: Optional[str] = Field(default=None, max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow)