from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class PedagogicalPlanning(SQLModel, table=True):
    __tablename__ = "pedagogical_plannings"

    id: Optional[int] = Field(default=None, primary_key=True)
    coordination_id: int = Field(foreign_key="coordinations.id", index=True)
    specialty_id: int = Field(foreign_key="specialties.id", index=True)
    leader_id: int = Field(foreign_key="users.id", index=True)
    program_code: str = Field(max_length=50)
    program_name: str = Field(max_length=255)
    program_version: str = Field(default="1", max_length=20)
    project_code: str = Field(max_length=50)
    project_name: str = Field(max_length=255)
    project_version: str = Field(default="1", max_length=20)
    executing_team: str = Field(max_length=150)
    status: str = Field(default="draft", max_length=50)  # draft, in_review, approved, adjustment_required
    observations: Optional[str] = Field(default=None, max_length=1000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PlanningMatrix(SQLModel, table=True):
    __tablename__ = "planning_matrices"

    id: Optional[int] = Field(default=None, primary_key=True)
    planning_id: int = Field(foreign_key="pedagogical_plannings.id", index=True)
    matrix_type: str = Field(max_length=30)  # program, project
    original_filename: str = Field(max_length=255)
    file_url: Optional[str] = Field(default=None, max_length=500)
    uploaded_by: int = Field(foreign_key="users.id")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
