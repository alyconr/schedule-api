from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_access_scope, get_current_user
from app.db import get_session
from app.models import Coordination, Role, User, UserCoordination, UserRole
from app.schemas.auth import (
    AccessScopeResponse,
    CoordinationScopeItem,
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
)
from app.services.auth_service import create_access_token, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.post("/login")
def login(payload: LoginRequest, session: SessionDep) -> TokenResponse:
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    role_ids = session.exec(select(UserRole.role_id).where(UserRole.user_id == user.id)).all()
    roles = session.exec(select(Role.name).where(Role.id.in_(role_ids))).all()

    token = create_access_token(str(user.id), list(roles))
    return TokenResponse(access_token=token)


@router.get("/me")
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
    session: SessionDep,
) -> CurrentUserResponse:
    scope = get_current_access_scope(current_user, session)
    coordination_ids = list(scope.coordination_ids)
    coordinations: list[CoordinationScopeItem] = []
    if coordination_ids:
        rows = session.exec(select(Coordination).where(Coordination.id.in_(coordination_ids))).all()
        coordinations = [
            CoordinationScopeItem(id=c.id, code=c.code, name=c.name) for c in rows
        ]
    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        roles=list(scope.roles),
        is_active=current_user.is_active,
        scope=AccessScopeResponse(
            is_global=scope.is_global,
            coordinations=coordinations,
        ),
    )