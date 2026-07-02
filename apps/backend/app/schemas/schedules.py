from datetime import date, time
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
    date: date
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
    date: date
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


class ScheduleValidationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ValidationStatus
    validations: list[ValidationResult]
