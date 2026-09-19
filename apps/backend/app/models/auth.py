from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, max_length=200)
    full_name: str = Field(max_length=200)
    hashed_password: str = Field(max_length=200)
    document_number: Optional[str] = Field(default=None, max_length=30)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Role(SQLModel, table=True):
    __tablename__ = "roles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, max_length=50)
    description: Optional[str] = Field(default=None, max_length=200)
    is_active: bool = Field(default=True)


class UserRole(SQLModel, table=True):
    __tablename__ = "user_roles"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    role_id: int = Field(foreign_key="roles.id")