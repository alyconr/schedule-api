from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.db import get_session
from app.models import Role, User, UserRole
from app.services.auth_service import decode_access_token


security = HTTPBearer(auto_error=False)
SessionDep = Annotated[Session, Depends(get_session)]

ROLE_READ = ("admin", "coordinador", "programador", "consulta")
ROLE_WRITE = ("admin", "coordinador", "programador")
ROLE_DELETE = ("admin", "coordinador")


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


def get_current_user_roles(current_user: Annotated[User, Depends(get_current_user)], session: SessionDep) -> list[str]:
    return list(
        session.exec(
            select(Role.name).where(
                Role.id.in_(
                    select(UserRole.role_id).where(UserRole.user_id == current_user.id)
                ),
                Role.is_active == True,
            )
        ).all()
    )


def require_roles(*allowed_roles: str):
    async def _check(
        current_user: Annotated[User, Depends(get_current_user)],
        session: SessionDep,
    ) -> User:
        user_roles = list(
            session.exec(
                select(Role.name).where(
                    Role.id.in_(
                        select(UserRole.role_id).where(UserRole.user_id == current_user.id)
                    ),
                    Role.is_active == True,
                )
            ).all()
        )
        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return _check


CurrentUserDep = Annotated[User, Depends(get_current_user)]