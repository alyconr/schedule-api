from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import require_roles, CurrentUserDep, SessionDep
from app.db import get_session
from app.models import Coordination, Role, User, UserCoordination, UserRole
from app.schemas.auth import UserCreate, UserResponse, UserUpdate
from app.services.auth_service import hash_password


router = APIRouter(prefix="/users", tags=["users"])


def _user_to_response(user: User, session: Session) -> UserResponse:
    role_ids = session.exec(select(UserRole.role_id).where(UserRole.user_id == user.id)).all()
    roles = session.exec(select(Role.name).where(Role.id.in_(role_ids))).all()
    coordination_ids = session.exec(
        select(UserCoordination.coordination_id).where(UserCoordination.user_id == user.id)
    ).all()
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=list(roles),
        coordination_ids=list(coordination_ids),
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _resolve_roles(session: Session, role_names: list[str]) -> list[Role]:
    role_names = list(dict.fromkeys(role_names))
    roles = []
    for name in role_names:
        role = session.exec(select(Role).where(Role.name == name)).first()
        if not role:
            raise HTTPException(422, detail=f"Role '{name}' does not exist")
        roles.append(role)
    return roles


def _resolve_coordinations(session: Session, coordination_ids: list[int]) -> list[Coordination]:
    ids = list(dict.fromkeys(coordination_ids))
    if not ids:
        return []
    rows = session.exec(select(Coordination).where(Coordination.id.in_(ids))).all()
    if len(rows) != len(ids):
        raise HTTPException(422, detail="One or more coordination_ids do not exist")
    return list(rows)


def _sync_user_coordinations(session: Session, user_id: int, coordination_ids: list[int]) -> None:
    old = session.exec(select(UserCoordination).where(UserCoordination.user_id == user_id)).all()
    for uc in old:
        session.delete(uc)
    for cid in dict.fromkeys(coordination_ids):
        session.add(UserCoordination(user_id=user_id, coordination_id=cid))


@router.get("", dependencies=[Depends(require_roles("admin"))])
def list_users(session: SessionDep) -> list[UserResponse]:
    users = session.exec(select(User)).all()
    return [_user_to_response(u, session) for u in users]


@router.get("/{user_id}", dependencies=[Depends(require_roles("admin"))])
def get_user(user_id: int, session: SessionDep) -> UserResponse:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")
    return _user_to_response(user, session)


@router.post("", status_code=201, dependencies=[Depends(require_roles("admin"))])
def create_user(payload: UserCreate, session: SessionDep) -> UserResponse:
    roles = _resolve_roles(session, payload.roles)
    coordinations = _resolve_coordinations(session, payload.coordination_ids)

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
        for coord in coordinations:
            session.add(UserCoordination(user_id=user.id, coordination_id=coord.id))
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Email already exists")
    return _user_to_response(user, session)


@router.put("/{user_id}", dependencies=[Depends(require_roles("admin"))])
def update_user(
    user_id: int,
    payload: UserUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> UserResponse:
    if user_id == current_user.id and payload.roles is not None and "admin" not in payload.roles:
        raise HTTPException(422, detail="You cannot remove your own admin role")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    resolved_roles: list[Role] | None = None
    if payload.roles is not None:
        resolved_roles = _resolve_roles(session, payload.roles)

    resolved_coordinations: list[Coordination] | None = None
    if payload.coordination_ids is not None:
        resolved_coordinations = _resolve_coordinations(session, payload.coordination_ids)

    update_data = payload.model_dump(exclude_unset=True, exclude={"roles", "coordination_ids"})
    if "password" in update_data and update_data["password"] is not None:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        if value is not None:
            setattr(user, key, value)

    try:
        session.add(user)
        if resolved_roles is not None:
            old_urs = session.exec(select(UserRole).where(UserRole.user_id == user.id)).all()
            for ur in old_urs:
                session.delete(ur)
            for role in resolved_roles:
                session.add(UserRole(user_id=user.id, role_id=role.id))
        if resolved_coordinations is not None:
            _sync_user_coordinations(session, user.id, [c.id for c in resolved_coordinations])
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Email already exists")
    return _user_to_response(user, session)


@router.delete("/{user_id}", dependencies=[Depends(require_roles("admin"))])
def delete_user(
    user_id: int,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    if user_id == current_user.id:
        raise HTTPException(422, detail="You cannot deactivate your own user")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")
    user.is_active = False
    session.add(user)
    session.commit()
    return {"ok": True}