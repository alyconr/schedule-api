from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import require_roles, get_session
from app.models import Role
from app.schemas.auth import RoleResponse

router = APIRouter(prefix="/roles", tags=["roles"], dependencies=[Depends(require_roles("admin"))])

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[RoleResponse])
def list_roles(session: SessionDep) -> list[Role]:
    roles = session.exec(select(Role).where(Role.is_active == True)).all()
    return roles
