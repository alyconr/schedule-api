from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SpecialtyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coordination_id: int
    code: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=500)


class SpecialtyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = None


class SpecialtyResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    coordination_id: int
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PlanningMatrixCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    matrix_type: str = Field(pattern="^(program|project)$")
    original_filename: str = Field(min_length=1, max_length=255)
    file_url: Optional[str] = Field(default=None, max_length=500)


class PlanningMatrixResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    planning_id: int
    matrix_type: str
    original_filename: str
    file_url: Optional[str] = None
    uploaded_by: int
    uploaded_at: datetime


class PedagogicalPlanningCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coordination_id: int
    specialty_id: int
    program_code: str = Field(min_length=1, max_length=50)
    program_name: str = Field(min_length=1, max_length=255)
    program_version: str = Field(default="1", min_length=1, max_length=20)
    project_code: str = Field(min_length=1, max_length=50)
    project_name: str = Field(min_length=1, max_length=255)
    project_version: str = Field(default="1", min_length=1, max_length=20)
    executing_team: str = Field(min_length=1, max_length=150)
    observations: Optional[str] = Field(default=None, max_length=1000)


class PedagogicalPlanningStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str = Field(pattern="^(draft|in_review|approved|adjustment_required)$")
    observations: Optional[str] = Field(default=None, max_length=1000)


class PedagogicalPlanningResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    coordination_id: int
    coordination_name: Optional[str] = None
    specialty_id: int
    specialty_name: Optional[str] = None
    leader_id: int
    leader_name: Optional[str] = None
    program_code: str
    program_name: str
    program_version: str
    project_code: str
    project_name: str
    project_version: str
    executing_team: str
    status: str
    observations: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    matrices: list[PlanningMatrixResponse] = Field(default_factory=list)


class PlanningDashboardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    total_plannings: int
    by_status: dict[str, int]
    items: list[PedagogicalPlanningResponse]
