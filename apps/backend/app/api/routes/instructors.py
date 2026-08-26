from datetime import date as date_type
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import AccessScopeDep, require_roles, ROLE_READ, ROLE_WRITE, ROLE_DELETE, SessionDep
from app.db import get_session
from app.models import (
    ContractType,
    Coordination,
    Instructor,
    InstructorCoordination,
    Schedule,
)
from app.schemas.master_data import InstructorCreate, InstructorRead, InstructorUpdate


router = APIRouter(prefix="/instructors", tags=["instructors"])


def _validate_contract_type(session: Session, contract_type_id: int | None) -> None:
    if contract_type_id is not None and not session.get(ContractType, contract_type_id):
        raise HTTPException(422, detail="contract_type_id does not exist")


def _resolve_coordinations(session: Session, coordination_ids: list[int]) -> list[Coordination]:
    ids = list(dict.fromkeys(coordination_ids))
    if not ids:
        return []
    rows = session.exec(select(Coordination).where(Coordination.id.in_(ids), Coordination.is_active == True)).all()  # noqa: E712
    if len(rows) != len(ids):
        raise HTTPException(422, detail="One or more coordination_ids do not exist or are inactive")
    return list(rows)


def _validate_instructor_coordinations(
    session: Session,
    primary_coordination_id: int | None,
    coordination_ids: list[int],
    scope: AccessScopeDep,
) -> tuple[int | None, list[int]]:
    # Auto-derive from primary if coordination_ids is empty
    if not coordination_ids and primary_coordination_id is not None:
        coordination_ids = [primary_coordination_id]
    if not coordination_ids:
        raise HTTPException(422, detail="At least one coordination is required")
    for cid in coordination_ids:
        if not scope.can_access(cid):
            raise HTTPException(403, detail="Not authorized for one or more coordinations")
    if primary_coordination_id is None:
        primary_coordination_id = coordination_ids[0]
    if primary_coordination_id not in coordination_ids:
        raise HTTPException(422, detail="primary_coordination_id must be in coordination_ids")
    return primary_coordination_id, coordination_ids


def _sync_instructor_coordinations(session: Session, instructor_id: int, coordination_ids: list[int]) -> None:
    old = session.exec(select(InstructorCoordination).where(InstructorCoordination.instructor_id == instructor_id)).all()
    for ic in old:
        session.delete(ic)
    for cid in dict.fromkeys(coordination_ids):
        session.add(InstructorCoordination(instructor_id=instructor_id, coordination_id=cid))


def _instructor_in_scope(session: Session, instructor: Instructor, scope: AccessScopeDep) -> bool:
    if scope.is_global:
        return True
    coord_ids = session.exec(
        select(InstructorCoordination.coordination_id).where(
            InstructorCoordination.instructor_id == instructor.id
        )
    ).all()
    if not coord_ids:
        return False
    return bool(set(coord_ids) & scope.coordination_ids)


def _instructor_read(session: Session, instructor: Instructor) -> InstructorRead:
    coordination_ids = session.exec(
        select(InstructorCoordination.coordination_id).where(
            InstructorCoordination.instructor_id == instructor.id
        )
    ).all()
    return InstructorRead.model_validate({**instructor.model_dump(), "coordination_ids": list(coordination_ids)})


@router.get("", response_model=list[InstructorRead], dependencies=[Depends(require_roles(*ROLE_READ))])
def list_instructors(
    session: SessionDep,
    scope: AccessScopeDep,
    coordination_id: Optional[int] = Query(default=None),
) -> list[InstructorRead]:
    if coordination_id is not None:
        if not scope.can_access(coordination_id):
            return []
        subq = select(InstructorCoordination.instructor_id).where(
            InstructorCoordination.coordination_id == coordination_id
        )
        instructors = list(
            session.exec(
                select(Instructor).where(
                    Instructor.is_active == True,  # noqa: E712
                    Instructor.id.in_(subq),
                )
            ).all()
        )
        return [_instructor_read(session, instructor) for instructor in instructors]
    if scope.is_global:
        instructors = session.exec(select(Instructor).where(Instructor.is_active == True)).all()  # noqa: E712
        return [_instructor_read(session, instructor) for instructor in instructors]
    if not scope.coordination_ids:
        return []
    subq = select(InstructorCoordination.instructor_id).where(
        InstructorCoordination.coordination_id.in_(scope.coordination_ids)
    )
    instructors = list(
        session.exec(
            select(Instructor).where(
                Instructor.is_active == True,  # noqa: E712
                Instructor.id.in_(subq),
            )
        ).all()
    )
    return [_instructor_read(session, instructor) for instructor in instructors]


@router.get("/{instructor_id}", response_model=InstructorRead, dependencies=[Depends(require_roles(*ROLE_READ))])
def get_instructor(instructor_id: int, session: SessionDep, scope: AccessScopeDep) -> InstructorRead:
    obj = session.get(Instructor, instructor_id)
    if not obj or not obj.is_active:
        raise HTTPException(404, detail="Instructor not found")
    if not _instructor_in_scope(session, obj, scope):
        raise HTTPException(404, detail="Instructor not found")
    return _instructor_read(session, obj)


@router.post("", status_code=201, response_model=InstructorRead, dependencies=[Depends(require_roles(*ROLE_WRITE))])
def create_instructor(payload: InstructorCreate, session: SessionDep, scope: AccessScopeDep) -> InstructorRead:
    _validate_contract_type(session, payload.contract_type_id)
    primary_cid, coord_ids = _validate_instructor_coordinations(
        session, payload.primary_coordination_id, payload.coordination_ids, scope
    )
    data = payload.model_dump(exclude={"coordination_ids"})
    data["primary_coordination_id"] = primary_cid
    obj = Instructor(**data)
    try:
        session.add(obj)
        session.flush()
        for cid in coord_ids:
            session.add(InstructorCoordination(instructor_id=obj.id, coordination_id=cid))
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Instructor document number already exists")
    return _instructor_read(session, obj)


@router.put("/{instructor_id}", response_model=InstructorRead, dependencies=[Depends(require_roles(*ROLE_WRITE))])
def update_instructor(
    instructor_id: int,
    payload: InstructorUpdate,
    session: SessionDep,
    scope: AccessScopeDep,
) -> InstructorRead:
    obj = session.get(Instructor, instructor_id)
    if not obj or not obj.is_active:
        raise HTTPException(404, detail="Instructor not found")
    if not _instructor_in_scope(session, obj, scope):
        raise HTTPException(404, detail="Instructor not found")

    _validate_contract_type(session, payload.contract_type_id)

    resolved_coord_ids: list[int] | None = None
    resolved_primary: int | None = None
    if payload.coordination_ids is not None:
        resolved_primary, resolved_coord_ids = _validate_instructor_coordinations(
            session, payload.primary_coordination_id, payload.coordination_ids, scope
        )

    update_data = payload.model_dump(exclude_unset=True, exclude={"coordination_ids"})
    if resolved_primary is not None:
        update_data["primary_coordination_id"] = resolved_primary
    for key, value in update_data.items():
        setattr(obj, key, value)

    try:
        session.add(obj)
        if resolved_coord_ids is not None:
            _sync_instructor_coordinations(session, obj.id, resolved_coord_ids)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Instructor document number already exists")
    return _instructor_read(session, obj)


@router.delete("/{instructor_id}", dependencies=[Depends(require_roles(*ROLE_DELETE))])
def delete_instructor(instructor_id: int, session: SessionDep, scope: AccessScopeDep) -> dict:
    obj = session.get(Instructor, instructor_id)
    if not obj or not obj.is_active:
        raise HTTPException(404, detail="Instructor not found")
    if not _instructor_in_scope(session, obj, scope):
        raise HTTPException(404, detail="Instructor not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    return {"ok": True}


@router.get("/{instructor_id}/busy-slots", dependencies=[Depends(require_roles(*ROLE_READ))])
def list_instructor_busy_slots(
    instructor_id: int,
    session: SessionDep,
    scope: AccessScopeDep,
    date_from: date_type = Query(...),
    date_to: date_type = Query(...),
) -> list[dict]:
    """Returns masked busy slots from coordinations not visible to the user."""
    instructor = session.get(Instructor, instructor_id)
    if not instructor or not instructor.is_active:
        raise HTTPException(404, detail="Instructor not found")
    if not _instructor_in_scope(session, instructor, scope):
        raise HTTPException(404, detail="Instructor not found")

    # Query globally — no scope filter on conflict detection
    stmt = select(Schedule).where(
        Schedule.instructor_id == instructor_id,
        Schedule.date >= date_from,
        Schedule.date <= date_to,
        ~Schedule.status.in_(["cancelled", "deleted"]),
    )
    schedules = list(session.exec(stmt).all())

    results: list[dict] = []
    for sch in schedules:
        if scope.can_access(sch.coordination_id):
            continue
        results.append({
            "date": str(sch.date),
            "start_time": str(sch.start_time),
            "end_time": str(sch.end_time),
            "availability": "busy_other_coordination",
            "label": "Ocupado por otra coordinación",
        })
    return results
