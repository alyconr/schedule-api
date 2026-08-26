from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import AccessScopeDep, require_roles, ROLE_READ, ROLE_WRITE, ROLE_DELETE, SessionDep
from app.db import get_session
from app.models import Coordination, Group, Schedule, TrainingProgram
from app.schemas.master_data import GroupCreate, GroupUpdate


router = APIRouter(prefix="/groups", tags=["groups"])


def _validate_program(session: Session, program_id: int | None) -> None:
    if program_id is not None and not session.get(TrainingProgram, program_id):
        raise HTTPException(422, detail="training_program_id does not exist")


def _validate_coordination(session: Session, coordination_id: int | None, scope: AccessScopeDep) -> None:
    if coordination_id is None:
        raise HTTPException(422, detail="coordination_id is required")
    coord = session.get(Coordination, coordination_id)
    if not coord or not coord.is_active:
        raise HTTPException(422, detail="coordination_id does not exist or is inactive")
    if not scope.can_access(coordination_id):
        raise HTTPException(403, detail="Not authorized for this coordination")


def _scope_group_filter(stmt, scope: AccessScopeDep):
    if scope.is_global:
        return stmt
    if not scope.coordination_ids:
        return stmt.where(False)  # no results for empty scope
    return stmt.where(Group.coordination_id.in_(scope.coordination_ids))


@router.get("", dependencies=[Depends(require_roles(*ROLE_READ))])
def list_groups(
    session: SessionDep,
    scope: AccessScopeDep,
    coordination_id: Optional[int] = Query(default=None),
) -> list[Group]:
    stmt = select(Group).where(Group.is_active == True)  # noqa: E712
    if coordination_id is not None:
        if not scope.can_access(coordination_id):
            return []
        stmt = stmt.where(Group.coordination_id == coordination_id)
    else:
        stmt = _scope_group_filter(stmt, scope)
    return list(session.exec(stmt).all())


@router.get("/{group_id}", dependencies=[Depends(require_roles(*ROLE_READ))])
def get_group(group_id: int, session: SessionDep, scope: AccessScopeDep) -> Group:
    obj = session.get(Group, group_id)
    if not obj or not obj.is_active:
        raise HTTPException(404, detail="Group not found")
    if not scope.can_access(obj.coordination_id):
        raise HTTPException(404, detail="Group not found")
    return obj


@router.post("", status_code=201, dependencies=[Depends(require_roles(*ROLE_WRITE))])
def create_group(payload: GroupCreate, session: SessionDep, scope: AccessScopeDep) -> Group:
    _validate_program(session, payload.training_program_id)
    _validate_coordination(session, payload.coordination_id, scope)
    obj = Group(**payload.model_dump())
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Group code already exists")
    return obj


@router.put("/{group_id}", dependencies=[Depends(require_roles(*ROLE_WRITE))])
def update_group(group_id: int, payload: GroupUpdate, session: SessionDep, scope: AccessScopeDep) -> Group:
    obj = session.get(Group, group_id)
    if not obj or not obj.is_active:
        raise HTTPException(404, detail="Group not found")
    if not scope.can_access(obj.coordination_id):
        raise HTTPException(404, detail="Group not found")

    if payload.coordination_id is not None:
        _validate_coordination(session, payload.coordination_id, scope)
    _validate_program(session, payload.training_program_id)

    old_coord = obj.coordination_id
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)

    # If coordination changed, sync schedule ownership transactionally
    if payload.coordination_id is not None and payload.coordination_id != old_coord:
        linked_schedules = session.exec(
            select(Schedule).where(
                Schedule.group_id == obj.id,
                ~Schedule.status.in_(["cancelled", "deleted"]),
            )
        ).all()
        for sch in linked_schedules:
            if not sch.is_additional_hours:
                sch.coordination_id = obj.coordination_id
                session.add(sch)

    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Group code already exists")
    return obj


@router.delete("/{group_id}", dependencies=[Depends(require_roles(*ROLE_DELETE))])
def delete_group(group_id: int, session: SessionDep, scope: AccessScopeDep) -> dict:
    obj = session.get(Group, group_id)
    if not obj or not obj.is_active:
        raise HTTPException(404, detail="Group not found")
    if not scope.can_access(obj.coordination_id):
        raise HTTPException(404, detail="Group not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    return {"ok": True}
