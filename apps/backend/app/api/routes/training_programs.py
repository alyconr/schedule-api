from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import require_roles, ROLE_READ, ROLE_WRITE, ROLE_DELETE
from app.db import get_session
from app.models import TrainingProgram
from app.schemas.master_data import TrainingProgramCreate, TrainingProgramUpdate


router = APIRouter(prefix="/training-programs", tags=["training-programs"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", dependencies=[Depends(require_roles(*ROLE_READ))])
def list_training_programs(session: SessionDep) -> list[TrainingProgram]:
    return list(session.exec(select(TrainingProgram)).all())


@router.get("/{program_id}", dependencies=[Depends(require_roles(*ROLE_READ))])
def get_training_program(program_id: int, session: SessionDep) -> TrainingProgram:
    obj = session.get(TrainingProgram, program_id)
    if not obj:
        raise HTTPException(404, detail="Training program not found")
    return obj


@router.post("", status_code=201, dependencies=[Depends(require_roles(*ROLE_WRITE))])
def create_training_program(payload: TrainingProgramCreate, session: SessionDep) -> TrainingProgram:
    obj = TrainingProgram(**payload.model_dump())
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Training program code already exists")
    return obj


@router.put("/{program_id}", dependencies=[Depends(require_roles(*ROLE_WRITE))])
def update_training_program(
    program_id: int, payload: TrainingProgramUpdate, session: SessionDep
) -> TrainingProgram:
    obj = session.get(TrainingProgram, program_id)
    if not obj:
        raise HTTPException(404, detail="Training program not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Training program code already exists")
    return obj


@router.delete("/{program_id}", dependencies=[Depends(require_roles(*ROLE_DELETE))])
def delete_training_program(program_id: int, session: SessionDep) -> dict:
    obj = session.get(TrainingProgram, program_id)
    if not obj:
        raise HTTPException(404, detail="Training program not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    return {"ok": True}