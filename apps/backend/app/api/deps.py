from dataclasses import dataclass
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.db import get_session
from app.models import Coordination, Role, User, UserCoordination, UserRole
from app.services.auth_service import decode_access_token


security = HTTPBearer(auto_error=False)
SessionDep = Annotated[Session, Depends(get_session)]

ROLE_READ = ("admin", "coordinador", "programador", "consulta")
ROLE_WRITE = ("admin", "coordinador", "programador")
ROLE_DELETE = ("admin", "coordinador")
ADMIN_ROLE = "admin"


@dataclass(frozen=True)
class AccessScope:
    user_id: int
    roles: frozenset[str]
    coordination_ids: frozenset[int]
    is_global: bool

    def can_access(self, coordination_id: Optional[int]) -> bool:
        if self.is_global:
            return True
        if coordination_id is None:
            return False
        return coordination_id in self.coordination_ids

    def can_access_any(self, coordination_ids: set[int]) -> bool:
        if self.is_global:
            return True
        return bool(coordination_ids & self.coordination_ids)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    session: SessionDep,
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization token")
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = session.get(User, user_id_int)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_current_user_roles(current_user: CurrentUserDep, session: SessionDep) -> list[str]:
    return list(
        session.exec(
            select(Role.name).where(
                Role.id.in_(
                    select(UserRole.role_id).where(UserRole.user_id == current_user.id)
                ),
                Role.is_active == True,  # noqa: E712
            )
        ).all()
    )


def require_roles(*allowed_roles: str):
    async def _check(
        current_user: CurrentUserDep,
        session: SessionDep,
    ) -> User:
        user_roles = list(
            session.exec(
                select(Role.name).where(
                    Role.id.in_(
                        select(UserRole.role_id).where(UserRole.user_id == current_user.id)
                    ),
                    Role.is_active == True,  # noqa: E712
                )
            ).all()
        )
        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return _check


def _load_user_roles(session: Session, user_id: int) -> list[str]:
    return list(
        session.exec(
            select(Role.name).where(
                Role.id.in_(
                    select(UserRole.role_id).where(UserRole.user_id == user_id)
                ),
                Role.is_active == True,  # noqa: E712
            )
        ).all()
    )


def _load_user_coordination_ids(session: Session, user_id: int) -> list[int]:
    return list(
        session.exec(
            select(UserCoordination.coordination_id).where(UserCoordination.user_id == user_id)
        ).all()
    )


def get_current_access_scope(
    current_user: CurrentUserDep,
    session: SessionDep,
) -> AccessScope:
    roles = frozenset(_load_user_roles(session, current_user.id))
    is_global = ADMIN_ROLE in roles
    coordination_ids = frozenset(_load_user_coordination_ids(session, current_user.id))
    return AccessScope(
        user_id=current_user.id,
        roles=roles,
        coordination_ids=coordination_ids,
        is_global=is_global,
    )


AccessScopeDep = Annotated[AccessScope, Depends(get_current_access_scope)]
