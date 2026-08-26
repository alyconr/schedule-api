from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    access_token: str
    token_type: str = "bearer"


class CoordinationScopeItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    code: str
    name: str


class AccessScopeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_global: bool
    coordinations: list[CoordinationScopeItem]


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    email: str
    full_name: str
    roles: list[str]
    is_active: bool
    scope: AccessScopeResponse


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=1, max_length=200)
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    roles: list[str] = Field(default_factory=lambda: ["consulta"])
    coordination_ids: list[int] = Field(default_factory=list)


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: Optional[str] = Field(default=None, min_length=1, max_length=200)
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    is_active: Optional[bool] = None
    roles: Optional[list[str]] = None
    coordination_ids: Optional[list[int]] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    email: str
    full_name: str
    is_active: bool
    roles: list[str]
    coordination_ids: list[int] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class RoleResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool