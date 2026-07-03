from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import require_roles, ROLE_READ, ROLE_WRITE, ROLE_DELETE
from app.db import get_session
from app.models import Competency, TrainingProgram
from app.schemas.master_data import CompetencyCreate, CompetencyUpdate


router = APIRouter(prefix="/competencies", tags=["competencies"])
SessionDep = Annotated[Session, Depends(get_session)]


def _validate_program(session: Session, program_id: int | None) -> None:
    if program_id is not None and not session.get(TrainingProgram, program_id):
        raise HTTPException(422, detail="training_program_id does not exist")


@router.get("", dependencies=[Depends(require_roles(*ROLE_READ))])
def list_competencies(session: SessionDep) -> list[Competency]:
    return list(session.exec(select(Competency)).all())


@router.get("/{competency_id}", dependencies=[Depends(require_roles(*ROLE_READ))])
def get_competency(competency_id: int, session: SessionDep) -> Competency:
    obj = session.get(Competency, competency_id)
    if not obj:
        raise HTTPException(404, detail="Competency not found")
    return obj


@router.post("", status_code=201, dependencies=[Depends(require_roles(*ROLE_WRITE))])
def create_competency(payload: CompetencyCreate, session: SessionDep) -> Competency:
    _validate_program(session, payload.training_program_id)
    obj = Competency(**payload.model_dump())
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Competency code already exists")
    return obj


@router.put("/{competency_id}", dependencies=[Depends(require_roles(*ROLE_WRITE))])
def update_competency(
    competency_id: int, payload: CompetencyUpdate, session: SessionDep
) -> Competency:
    obj = session.get(Competency, competency_id)
    if not obj:
        raise HTTPException(404, detail="Competency not found")
    _validate_program(session, payload.training_program_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Competency code already exists")
    return obj


@router.delete("/{competency_id}", dependencies=[Depends(require_roles(*ROLE_DELETE))])
def delete_competency(competency_id: int, session: SessionDep) -> dict:
    obj = session.get(Competency, competency_id)
    if not obj:
        raise HTTPException(404, detail="Competency not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    return {"ok": True}