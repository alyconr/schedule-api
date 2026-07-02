from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.db import get_session
from app.models import Competency, LearningResult
from app.schemas.master_data import LearningResultCreate, LearningResultUpdate


router = APIRouter(prefix="/learning-results", tags=["learning-results"])
SessionDep = Annotated[Session, Depends(get_session)]


def _validate_competency(session: Session, competency_id: int | None) -> None:
    if competency_id is not None and not session.get(Competency, competency_id):
        raise HTTPException(422, detail="competency_id does not exist")


@router.get("")
def list_learning_results(session: SessionDep) -> list[LearningResult]:
    return list(session.exec(select(LearningResult)).all())


@router.get("/{lr_id}")
def get_learning_result(lr_id: int, session: SessionDep) -> LearningResult:
    obj = session.get(LearningResult, lr_id)
    if not obj:
        raise HTTPException(404, detail="Learning result not found")
    return obj


@router.post("", status_code=201)
def create_learning_result(payload: LearningResultCreate, session: SessionDep) -> LearningResult:
    _validate_competency(session, payload.competency_id)
    obj = LearningResult(**payload.model_dump())
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Learning result code already exists")
    return obj


@router.put("/{lr_id}")
def update_learning_result(
    lr_id: int, payload: LearningResultUpdate, session: SessionDep
) -> LearningResult:
    obj = session.get(LearningResult, lr_id)
    if not obj:
        raise HTTPException(404, detail="Learning result not found")
    _validate_competency(session, payload.competency_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Learning result code already exists")
    return obj


@router.delete("/{lr_id}")
def delete_learning_result(lr_id: int, session: SessionDep) -> dict:
    obj = session.get(LearningResult, lr_id)
    if not obj:
        raise HTTPException(404, detail="Learning result not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    return {"ok": True}