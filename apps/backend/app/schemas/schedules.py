from datetime import date as date_type, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ContractType = Literal["planta", "contratista", "otro"]
EnvironmentType = Literal["fisico", "virtual", "externo"]
Severity = Literal["INFO", "WARNING", "BLOCKING"]
ValidationStatus = Literal["valid", "warning", "blocked"]


class ExistingSchedule(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instructor_id: str
    group_id: str
    environment_id: str
    learning_result_id: str
    date: date_type
    start_time: time
    end_time: time
    environment_type: EnvironmentType = "fisico"


class ScheduleValidationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instructor_id: str
    group_id: str
    environment_id: str
    learning_result_id: str
    program_learning_result_ids: list[str] = Field(min_length=1)
    date: date_type
    start_time: time
    end_time: time
    duration_hours: float = Field(gt=0)
    instructor_contract_type: ContractType
    instructor_weekly_hours: float = Field(ge=0)
    group_learners: int = Field(ge=0)
    environment_capacity: int = Field(ge=0)
    environment_type: EnvironmentType = "fisico"
    instructor_active: bool = True
    group_active: bool = True
    environment_active: bool = True
    existing_schedules: list[ExistingSchedule] = Field(default_factory=list)


class ValidationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rule_code: str
    severity: Severity
    message: str
    is_blocking: bool
    field: str | None = None


class ScheduleValidationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    schedule_id: int
    rule_code: str
    severity: str
    message: str
    is_blocking: bool
    created_at: datetime


class ScheduleValidationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ValidationStatus
    validations: list[ValidationResult]


class ScheduleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instructor_id: int
    group_id: int
    training_program_id: int | None = None
    competency_id: int | None = None
    learning_result_id: int
    learning_result_topic_id: int | None = None
    manual_topic_name: str | None = Field(default=None, max_length=500)
    environment_id: int
    date: date_type
    weekday: int | None = None
    start_time: time
    end_time: time
    block_id: int | None = None
    subblock_id: int | None = None
    duration_hours: float = Field(gt=0)
    notes: str | None = None


class ScheduleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instructor_id: int | None = None
    group_id: int | None = None
    training_program_id: int | None = None
    competency_id: int | None = None
    learning_result_id: int | None = None
    learning_result_topic_id: int | None = None
    manual_topic_name: str | None = Field(default=None, max_length=500)
    environment_id: int | None = None
    date: date_type | None = None
    weekday: int | None = None
    start_time: time | None = None
    end_time: time | None = None
    block_id: int | None = None
    subblock_id: int | None = None
    duration_hours: float | None = Field(default=None, gt=0)
    notes: str | None = None
    status: str | None = None


class SchedulePersistResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    schedule: dict | None = None
    validations: list[ValidationResult]


class ScheduleDetailedRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_type
    weekday_label: str
    start_time: time
    end_time: time
    instructor_id: int
    instructor_name: str
    group_id: int
    group_code: str
    group_name: str | None = None
    group_trimester: str | None = None
    training_program_id: int | None = None
    training_program_name: str | None = None
    learning_result_id: int | None = None
    learning_result_code: str | None = None
    learning_result_description: str | None = None
    topic_name: str | None = None
    environment_id: int
    environment_name: str
    status: str
