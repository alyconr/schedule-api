from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# --- ContractType ---
class ContractTypeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=50)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, max_length=50)
    monthly_training_hours: Decimal = Field(default=Decimal("0"), max_digits=7, decimal_places=1)
    monthly_additional_hours: Decimal = Field(default=Decimal("0"), max_digits=7, decimal_places=1)
    weekly_base_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)
    weekly_max_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)
    source_label: Optional[str] = Field(default=None, max_length=100)


class ContractTypeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, max_length=50)
    monthly_training_hours: Optional[Decimal] = Field(default=None, max_digits=7, decimal_places=1)
    monthly_additional_hours: Optional[Decimal] = Field(default=None, max_digits=7, decimal_places=1)
    weekly_base_hours: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=1)
    weekly_max_hours: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=1)
    source_label: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None


# --- Instructor ---
class InstructorCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    document_type: str = Field(max_length=20)
    document_number: str = Field(min_length=1, max_length=30)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=200)
    phone: Optional[str] = Field(default=None, max_length=20)
    contract_type_id: Optional[int] = None
    area: Optional[str] = Field(default=None, max_length=100)
    specialty: Optional[str] = Field(default=None, max_length=200)
    monthly_training_hours: Decimal = Field(default=Decimal("0"), max_digits=7, decimal_places=1)
    monthly_additional_hours: Decimal = Field(default=Decimal("0"), max_digits=7, decimal_places=1)
    weekly_base_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)
    weekly_max_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)
    notes: Optional[str] = None


class InstructorUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    document_type: Optional[str] = Field(default=None, max_length=20)
    document_number: Optional[str] = Field(default=None, min_length=1, max_length=30)
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=20)
    contract_type_id: Optional[int] = None
    area: Optional[str] = Field(default=None, max_length=100)
    specialty: Optional[str] = Field(default=None, max_length=200)
    monthly_training_hours: Optional[Decimal] = Field(default=None, max_digits=7, decimal_places=1)
    monthly_additional_hours: Optional[Decimal] = Field(default=None, max_digits=7, decimal_places=1)
    weekly_base_hours: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=1)
    weekly_max_hours: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=1)
    is_active: Optional[bool] = None
    notes: Optional[str] = None


# --- TrainingProgram ---
class TrainingProgramCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=300)
    version: Optional[str] = Field(default=None, max_length=50)
    level: Optional[str] = Field(default=None, max_length=100)
    duration_hours: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=1)


class TrainingProgramUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    name: Optional[str] = Field(default=None, min_length=1, max_length=300)
    version: Optional[str] = Field(default=None, max_length=50)
    level: Optional[str] = Field(default=None, max_length=100)
    duration_hours: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=1)
    is_active: Optional[bool] = None


# --- Competency ---
class CompetencyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=300)
    training_program_id: Optional[int] = None
    hours: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=1)


class CompetencyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    name: Optional[str] = Field(default=None, min_length=1, max_length=300)
    training_program_id: Optional[int] = None
    hours: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=1)
    is_active: Optional[bool] = None


# --- LearningResult ---
class LearningResultCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=500)
    competency_id: Optional[int] = None
    estimated_hours: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=1)
    result_type: Optional[str] = Field(default=None, max_length=50)


class LearningResultUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    description: Optional[str] = Field(default=None, min_length=1, max_length=500)
    competency_id: Optional[int] = None
    estimated_hours: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=1)
    result_type: Optional[str] = Field(default=None, max_length=50)
    is_active: Optional[bool] = None


# --- Group ---
class GroupCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=1, max_length=50)
    name: Optional[str] = Field(default=None, max_length=300)
    training_program_id: Optional[int] = None
    jornada: Optional[str] = Field(default=None, max_length=50)
    modality: Optional[str] = Field(default=None, max_length=50)
    trimester: str = Field(min_length=1, max_length=50)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    productive_stage_start_date: Optional[date] = None
    productive_stage_end_date: Optional[date] = None
    learners_count: int = Field(default=0, ge=0)
    notes: Optional[str] = None

    @field_validator("trimester")
    @classmethod
    def validate_trimester(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("trimester no puede estar vacío")
        v_stripped = v.strip()
        if len(v_stripped) > 50:
            raise ValueError("trimester no puede tener más de 50 caracteres")
        return v_stripped


class GroupUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    name: Optional[str] = Field(default=None, max_length=300)
    training_program_id: Optional[int] = None
    jornada: Optional[str] = Field(default=None, max_length=50)
    modality: Optional[str] = Field(default=None, max_length=50)
    trimester: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    productive_stage_start_date: Optional[date] = None
    productive_stage_end_date: Optional[date] = None
    learners_count: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_trimester_update(self) -> "GroupUpdate":
        if "trimester" in self.__pydantic_fields_set__:
            if self.trimester is None:
                raise ValueError("trimester no puede ser null")
            v_stripped = self.trimester.strip()
            if not v_stripped:
                raise ValueError("trimester no puede estar vacío")
            if len(v_stripped) > 50:
                raise ValueError("trimester no puede tener más de 50 caracteres")
            self.trimester = v_stripped
        return self


# --- Environment ---
class EnvironmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    location: Optional[str] = Field(default=None, max_length=200)
    capacity: int = Field(default=0, ge=0)
    environment_type: Literal["fisico", "virtual", "externo"] = "fisico"
    resources: Optional[str] = None
    notes: Optional[str] = None


class EnvironmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    location: Optional[str] = Field(default=None, max_length=200)
    capacity: Optional[int] = Field(default=None, ge=0)
    environment_type: Optional[Literal["fisico", "virtual", "externo"]] = None
    resources: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


# --- TimeBlock ---
class TimeBlockCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=100)
    weekday: int = Field(ge=1, le=7)
    start_time: str = Field(min_length=1, max_length=10)
    end_time: str = Field(min_length=1, max_length=10)
    duration_minutes: int = Field(gt=0)
    jornada: Optional[str] = Field(default=None, max_length=50)


class TimeBlockUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    weekday: Optional[int] = Field(default=None, ge=1, le=7)
    start_time: Optional[str] = Field(default=None, min_length=1, max_length=10)
    end_time: Optional[str] = Field(default=None, min_length=1, max_length=10)
    duration_minutes: Optional[int] = Field(default=None, gt=0)
    jornada: Optional[str] = Field(default=None, max_length=50)
    is_active: Optional[bool] = None
