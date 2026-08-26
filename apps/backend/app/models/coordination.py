from datetime import datetime
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Coordination(SQLModel, table=True):
    __tablename__ = "coordinations"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, max_length=80)
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserCoordination(SQLModel, table=True):
    __tablename__ = "user_coordinations"
    __table_args__ = (UniqueConstraint("user_id", "coordination_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    coordination_id: int = Field(foreign_key="coordinations.id")


class InstructorCoordination(SQLModel, table=True):
    __tablename__ = "instructor_coordinations"
    __table_args__ = (UniqueConstraint("instructor_id", "coordination_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    instructor_id: int = Field(foreign_key="instructors.id")
    coordination_id: int = Field(foreign_key="coordinations.id")
