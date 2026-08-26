from datetime import date as date_type, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    group_id: int | None = None
    training_program_id: int | None = None
    competency_id: int | None = None
    learning_result_id: int | None = None
    learning_result_topic_id: int | None = None
    manual_topic_name: str | None = Field(default=None, max_length=500)
    environment_id: int | None = None
    date: date_type
    schedule_year: int = Field(ge=2000, le=2100)
    schedule_quarter: int = Field(ge=1, le=4)
    weekday: int | None = None
    start_time: time
    end_time: time
    block_id: int | None = None
    subblock_id: int | None = None
    duration_hours: float = Field(gt=0)
    is_additional_hours: bool = False
    additional_hours_type: str | None = Field(default=None, max_length=500)
    coordination_id: int | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_schedule_kind(self) -> "ScheduleCreate":
        expected_quarter = ((self.date.month - 1) // 3) + 1
        if self.date.year != self.schedule_year or expected_quarter != self.schedule_quarter:
            raise ValueError("date must belong to schedule_year and schedule_quarter")
        if self.is_additional_hours:
            if not (self.additional_hours_type or "").strip():
                raise ValueError("additional_hours_type is required as justification for additional hours")
            return self
        missing = [
            name
            for name, value in (
                ("group_id", self.group_id),
                ("learning_result_id", self.learning_result_id),
                ("environment_id", self.environment_id),
            )
            if value is None
        ]
        if missing:
            raise ValueError(f"{', '.join(missing)} required for academic schedules")
        return self


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
    schedule_year: int | None = Field(default=None, ge=2000, le=2100)
    schedule_quarter: int | None = Field(default=None, ge=1, le=4)
    weekday: int | None = None
    start_time: time | None = None
    end_time: time | None = None
    block_id: int | None = None
    subblock_id: int | None = None
    duration_hours: float | None = Field(default=None, gt=0)
    is_additional_hours: bool | None = None
    additional_hours_type: str | None = Field(default=None, max_length=500)
    coordination_id: int | None = None
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
    schedule_year: int
    schedule_quarter: int
    weekday_label: str
    start_time: time
    end_time: time
    duration_hours: float
    instructor_id: int
    instructor_name: str
    group_id: int | None = None
    group_code: str | None = None
    group_name: str | None = None
    group_trimester: str | None = None
    training_program_id: int | None = None
    training_program_name: str | None = None
    learning_result_id: int | None = None
    learning_result_code: str | None = None
    learning_result_description: str | None = None
    topic_name: str | None = None
    environment_id: int | None = None
    environment_name: str | None = None
    is_additional_hours: bool = False
    additional_hours_type: str | None = None
    status: str
