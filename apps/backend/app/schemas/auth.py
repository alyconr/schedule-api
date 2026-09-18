from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    full_name: Optional[str] = Field(default=None, max_length=200)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    roles: list[str] = Field(default_factory=lambda: ["consulta"])
    coordination_id: Optional[int] = None
    specialty_id: Optional[int] = None
    coordination_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_asgard_requirements(self) -> "UserCreate":
        # Synchronize full_name if first_name / last_name provided
        if not self.full_name and (self.first_name or self.last_name):
            self.full_name = f"{self.first_name or ''} {self.last_name or ''}".strip()
        elif not self.full_name:
            self.full_name = self.email

        # If confirm_password is provided, check match
        if self.confirm_password is not None and self.password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")

        # Asgard operational roles: Lider de equipo ejecutor o Usuario adicional
        asgard_member_roles = {"lider_equipo", "usuario_adicional"}
        if any(role in asgard_member_roles for role in self.roles):
            if not self.first_name or not self.first_name.strip():
                raise ValueError("El nombre es obligatorio para el Líder o Usuario adicional")
            if not self.last_name or not self.last_name.strip():
                raise ValueError("Los apellidos son obligatorios para el Líder o Usuario adicional")
            if not self.phone or not self.phone.strip():
                raise ValueError("El teléfono es obligatorio para el Líder o Usuario adicional")
            if not self.coordination_id:
                raise ValueError("La coordinación es obligatoria para el Líder o Usuario adicional")
            if not self.specialty_id:
                raise ValueError("La especialidad es obligatoria para el Líder o Usuario adicional")

        # Ensure coordination_id is included in coordination_ids list
        if self.coordination_id and self.coordination_id not in self.coordination_ids:
            self.coordination_ids.append(self.coordination_id)

        return self


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: Optional[str] = Field(default=None, min_length=1, max_length=200)
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, min_length=1, max_length=30)
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    confirm_password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    coordination_id: Optional[int] = None
    specialty_id: Optional[int] = None
    is_active: Optional[bool] = None
    roles: Optional[list[str]] = None
    coordination_ids: Optional[list[int]] = None

    @model_validator(mode="after")
    def validate_passwords(self) -> "UserUpdate":
        if self.confirm_password is not None and self.password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")
        return self


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    email: str
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    coordination_id: Optional[int] = None
    specialty_id: Optional[int] = None
    coordination_name: Optional[str] = None
    specialty_name: Optional[str] = None
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