from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional

from sqlmodel import Field, SQLModel


class ScheduleStatusEnum(str, PyEnum):
    draft = "draft"
    validated = "validated"
    warning = "warning"
    blocked = "blocked"
    approved = "approved"
    published = "published"
    cancelled = "cancelled"
    deleted = "deleted"


class ExceptionStatusEnum(str, PyEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class Schedule(SQLModel, table=True):
    __tablename__ = "schedules"

    id: Optional[int] = Field(default=None, primary_key=True)
    instructor_id: int = Field(foreign_key="instructors.id")
    group_id: Optional[int] = Field(default=None, foreign_key="groups.id")
    training_program_id: Optional[int] = Field(default=None, foreign_key="training_programs.id")
    competency_id: Optional[int] = Field(default=None, foreign_key="competencies.id")
    learning_result_id: Optional[int] = Field(default=None, foreign_key="learning_results.id")
    learning_result_topic_id: Optional[int] = Field(default=None, foreign_key="learning_result_topics.id")
    manual_topic_name: Optional[str] = Field(default=None, max_length=500)
    environment_id: Optional[int] = Field(default=None, foreign_key="environments.id")
    date: date
    weekday: Optional[int] = Field(default=None)
    start_time: time
    end_time: time
    block_id: Optional[int] = Field(default=None, foreign_key="time_blocks.id")
    subblock_id: Optional[int] = Field(default=None, foreign_key="time_blocks.id")
    duration_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)
    is_additional_hours: bool = Field(default=False)
    additional_hours_type: Optional[str] = Field(default=None, max_length=120)
    status: str = Field(default="draft", max_length=20)
    created_by: Optional[str] = Field(default=None, max_length=200)
    approved_by: Optional[str] = Field(default=None, max_length=200)
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ScheduleValidation(SQLModel, table=True):
    __tablename__ = "schedule_validations"

    id: Optional[int] = Field(default=None, primary_key=True)
    schedule_id: int = Field(foreign_key="schedules.id")
    rule_code: str = Field(max_length=50)
    severity: str = Field(max_length=20)
    message: str = Field(max_length=500)
    is_blocking: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExceptionRequest(SQLModel, table=True):
    __tablename__ = "exceptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    schedule_id: int = Field(foreign_key="schedules.id")
    rule_code: str = Field(max_length=50)
    requested_by: Optional[str] = Field(default=None, max_length=200)
    approved_by: Optional[str] = Field(default=None, max_length=200)
    status: str = Field(default="pending", max_length=20)
    justification: str = Field(max_length=1000)
    approval_notes: Optional[str] = Field(default=None, max_length=1000)
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
