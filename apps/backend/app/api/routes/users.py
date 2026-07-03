from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import require_roles
from app.db import get_session
from app.models import Role, User, UserRole
from app.schemas.auth import UserCreate, UserResponse, UserUpdate
from app.services.auth_service import hash_password


router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_roles("admin"))])
SessionDep = Annotated[Session, Depends(get_session)]


def _user_to_response(user: User, session: Session) -> UserResponse:
    role_ids = session.exec(select(UserRole.role_id).where(UserRole.user_id == user.id)).all()
    roles = session.exec(select(Role.name).where(Role.id.in_(role_ids))).all()
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=list(roles),
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _resolve_roles(session: Session, role_names: list[str]) -> list[Role]:
    roles = []
    for name in role_names:
        role = session.exec(select(Role).where(Role.name == name)).first()
        if not role:
            raise HTTPException(422, detail=f"Role '{name}' does not exist")
        roles.append(role)
    return roles


@router.get("")
def list_users(session: SessionDep) -> list[UserResponse]:
    users = session.exec(select(User)).all()
    return [_user_to_response(u, session) for u in users]


@router.get("/{user_id}")
def get_user(user_id: int, session: SessionDep) -> UserResponse:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")
    return _user_to_response(user, session)


@router.post("", status_code=201)
def create_user(payload: UserCreate, session: SessionDep) -> UserResponse:
    roles = _resolve_roles(session, payload.roles)

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    try:
        session.add(user)
        session.flush()
        for role in roles:
            session.add(UserRole(user_id=user.id, role_id=role.id))
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Email already exists")
    return _user_to_response(user, session)


@router.put("/{user_id}")
def update_user(user_id: int, payload: UserUpdate, session: SessionDep) -> UserResponse:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    if payload.roles is not None:
        resolved_roles = _resolve_roles(session, payload.roles)

    update_data = payload.model_dump(exclude_unset=True, exclude={"roles"})
    if "password" in update_data and update_data["password"] is not None:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        if value is not None:
            setattr(user, key, value)

    try:
        session.add(user)
        if payload.roles is not None:
            old_urs = session.exec(select(UserRole).where(UserRole.user_id == user.id)).all()
            for ur in old_urs:
                session.delete(ur)
            for role in resolved_roles:
                session.add(UserRole(user_id=user.id, role_id=role.id))
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Email already exists")
    return _user_to_response(user, session)


@router.delete("/{user_id}")
def delete_user(user_id: int, session: SessionDep) -> dict:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")
    user.is_active = False
    session.add(user)
    session.commit()
    return {"ok": True}