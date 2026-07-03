from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_current_user_roles
from app.db import get_session
from app.models import Role, User, UserRole
from app.schemas.auth import (
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
    roles = get_current_user_roles(current_user, session)
    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        roles=roles,
        is_active=current_user.is_active,
    )