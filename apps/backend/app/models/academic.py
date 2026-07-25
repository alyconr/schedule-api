from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


class ContractTypeEnum(str, PyEnum):
    planta = "planta"
    contratista = "contratista"
    otro = "otro"


class EnvironmentTypeEnum(str, PyEnum):
    fisico = "fisico"
    virtual = "virtual"
    externo = "externo"


class ContractType(SQLModel, table=True):
    __tablename__ = "contract_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, max_length=50)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, max_length=50)
    monthly_training_hours: Decimal = Field(default=Decimal("0"), max_digits=7, decimal_places=1)
    monthly_additional_hours: Decimal = Field(default=Decimal("0"), max_digits=7, decimal_places=1)
    weekly_base_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)
    weekly_max_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)
    source_label: Optional[str] = Field(default=None, max_length=100)
    is_active: bool = Field(default=True)

    instructors: list["Instructor"] = Relationship(back_populates="contract_type")


class Instructor(SQLModel, table=True):
    __tablename__ = "instructors"

    id: Optional[int] = Field(default=None, primary_key=True)
    document_type: str = Field(max_length=20)
    document_number: str = Field(max_length=30, unique=True)
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    email: str = Field(max_length=200)
    phone: Optional[str] = Field(default=None, max_length=20)
    contract_type_id: Optional[int] = Field(default=None, foreign_key="contract_types.id")
    area: Optional[str] = Field(default=None, max_length=100)
    specialty: Optional[str] = Field(default=None, max_length=200)
    monthly_training_hours: Decimal = Field(default=Decimal("0"), max_digits=7, decimal_places=1)
    monthly_additional_hours: Decimal = Field(default=Decimal("0"), max_digits=7, decimal_places=1)
    weekly_base_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)
    weekly_max_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)
    is_active: bool = Field(default=True)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    contract_type: Optional[ContractType] = Relationship(back_populates="instructors")


class TrainingProgram(SQLModel, table=True):
    __tablename__ = "training_programs"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, max_length=50)
    name: str = Field(max_length=300)
    version: Optional[str] = Field(default=None, max_length=50)
    level: Optional[str] = Field(default=None, max_length=100)
    duration_hours: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=1)
    is_active: bool = Field(default=True)

    competencies: list["Competency"] = Relationship(back_populates="training_program")
    groups: list["Group"] = Relationship(back_populates="training_program")


class Competency(SQLModel, table=True):
    __tablename__ = "competencies"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, max_length=50)
    name: str = Field(max_length=300)
    training_program_id: Optional[int] = Field(default=None, foreign_key="training_programs.id")
    hours: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=1)
    is_active: bool = Field(default=True)

    training_program: Optional[TrainingProgram] = Relationship(back_populates="competencies")
    learning_results: list["LearningResult"] = Relationship(back_populates="competency")


class LearningResult(SQLModel, table=True):
    __tablename__ = "learning_results"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, max_length=50)
    description: str = Field(max_length=500)
    competency_id: Optional[int] = Field(default=None, foreign_key="competencies.id")
    estimated_hours: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=1)
    result_type: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = Field(default=True)

    competency: Optional[Competency] = Relationship(back_populates="learning_results")


class Topic(SQLModel, table=True):
    __tablename__ = "topics"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, max_length=50)
    name: str = Field(max_length=500)
    program_scope: Optional[str] = Field(default=None, max_length=50)
    trimester: Optional[str] = Field(default=None, max_length=50)
    trimester_number: Optional[int] = None
    estimated_hours: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=1)
    source_sheet: Optional[str] = Field(default=None, max_length=150)
    source_address: Optional[str] = Field(default=None, max_length=20)
    source_row: Optional[int] = None
    source_col: Optional[int] = None
    color_key: Optional[str] = Field(default=None, max_length=100)
    color_hex: Optional[str] = Field(default=None, max_length=20)
    is_active: bool = Field(default=True)


class LearningResultTopic(SQLModel, table=True):
    __tablename__ = "learning_result_topics"
    __table_args__ = (UniqueConstraint("training_program_id", "learning_result_id", "topic_id", "group_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    relation_id: str = Field(unique=True, max_length=120)
    training_program_id: Optional[int] = Field(default=None, foreign_key="training_programs.id")
    training_program_code: Optional[str] = Field(default=None, max_length=50)
    training_program_name: Optional[str] = Field(default=None, max_length=300)
    learning_result_id: int = Field(foreign_key="learning_results.id")
    topic_id: int = Field(foreign_key="topics.id")
    group_id: str = Field(max_length=80)
    program_scope: Optional[str] = Field(default=None, max_length=50)
    trimester_number: Optional[int] = None
    color_key: Optional[str] = Field(default=None, max_length=100)
    color_hex: Optional[str] = Field(default=None, max_length=20)
    relation_method: str = Field(default="same_trimester_and_same_fill_color", max_length=80)
    relation_status: str = Field(default="OK", max_length=50)
    confidence: str = Field(default="alta", max_length=20)
    needs_manual_review: bool = Field(default=False)


class Group(SQLModel, table=True):
    __tablename__ = "groups"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, max_length=50)
    name: Optional[str] = Field(default=None, max_length=300)
    training_program_id: Optional[int] = Field(default=None, foreign_key="training_programs.id")
    jornada: Optional[str] = Field(default=None, max_length=50)
    modality: Optional[str] = Field(default=None, max_length=50)
    trimester: Optional[str] = Field(default=None, max_length=50)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    productive_stage_start_date: Optional[date] = None
    productive_stage_end_date: Optional[date] = None
    learners_count: int = Field(default=0)
    is_active: bool = Field(default=True)
    notes: Optional[str] = None

    training_program: Optional[TrainingProgram] = Relationship(back_populates="groups")


class Environment(SQLModel, table=True):
    __tablename__ = "environments"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, max_length=50)
    name: str = Field(max_length=200)
    location: Optional[str] = Field(default=None, max_length=200)
    capacity: int = Field(default=0)
    environment_type: str = Field(default="fisico", max_length=30)
    resources: Optional[str] = None
    is_active: bool = Field(default=True)
    notes: Optional[str] = None


class TimeBlock(SQLModel, table=True):
    __tablename__ = "time_blocks"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    weekday: int = Field(default=1)
    start_time: str = Field(max_length=10)
    end_time: str = Field(max_length=10)
    duration_minutes: int = Field(default=0)
    jornada: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = Field(default=True)
