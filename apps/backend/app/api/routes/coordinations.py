from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import AccessScopeDep, require_roles, ROLE_READ, ROLE_DELETE, SessionDep
from app.db import get_session
from app.models import Coordination, UserCoordination
from app.schemas.master_data import CoordinationCreate, CoordinationUpdate


router = APIRouter(prefix="/coordinations", tags=["coordinations"])


@router.get("", dependencies=[Depends(require_roles(*ROLE_READ))])
def list_coordinations(session: SessionDep, scope: AccessScopeDep) -> list[Coordination]:
    if scope.is_global:
        return list(session.exec(select(Coordination).where(Coordination.is_active == True)).all())  # noqa: E712
    if not scope.coordination_ids:
        return []
    return list(
        session.exec(
            select(Coordination).where(
                Coordination.id.in_(scope.coordination_ids),
                Coordination.is_active == True,  # noqa: E712
            )
        ).all()
    )


@router.get("/{coordination_id}", dependencies=[Depends(require_roles(*ROLE_READ))])
def get_coordination(coordination_id: int, session: SessionDep, scope: AccessScopeDep) -> Coordination:
    if not scope.can_access(coordination_id):
        raise HTTPException(404, detail="Coordination not found")
    obj = session.get(Coordination, coordination_id)
    if not obj or not obj.is_active:
        raise HTTPException(404, detail="Coordination not found")
    return obj


@router.post("", status_code=201, dependencies=[Depends(require_roles("admin"))])
def create_coordination(payload: CoordinationCreate, session: SessionDep) -> Coordination:
    obj = Coordination(**payload.model_dump())
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Coordination code already exists")
    return obj


@router.put("/{coordination_id}", dependencies=[Depends(require_roles("admin"))])
def update_coordination(coordination_id: int, payload: CoordinationUpdate, session: SessionDep) -> Coordination:
    obj = session.get(Coordination, coordination_id)
    if not obj:
        raise HTTPException(404, detail="Coordination not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Coordination code already exists")
    return obj


@router.delete("/{coordination_id}", dependencies=[Depends(require_roles("admin"))])
def delete_coordination(coordination_id: int, session: SessionDep) -> dict:
    obj = session.get(Coordination, coordination_id)
    if not obj:
        raise HTTPException(404, detail="Coordination not found")
    refs = session.exec(
        select(UserCoordination).where(UserCoordination.coordination_id == coordination_id)
    ).first()
    if refs:
        obj.is_active = False
        session.add(obj)
        session.commit()
        return {"ok": True, "deactivated": True}
    session.delete(obj)
    session.commit()
    return {"ok": True, "deactivated": False}
