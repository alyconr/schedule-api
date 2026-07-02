from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.db import get_session
from app.models import ContractType, Instructor
from app.schemas.master_data import InstructorCreate, InstructorUpdate


router = APIRouter(prefix="/instructors", tags=["instructors"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("")
def list_instructors(session: SessionDep) -> list[Instructor]:
    return list(session.exec(select(Instructor)).all())


@router.get("/{instructor_id}")
def get_instructor(instructor_id: int, session: SessionDep) -> Instructor:
    obj = session.get(Instructor, instructor_id)
    if not obj:
        raise HTTPException(404, detail="Instructor not found")
    return obj


@router.post("", status_code=201)
def create_instructor(payload: InstructorCreate, session: SessionDep) -> Instructor:
    if payload.contract_type_id is not None and not session.get(ContractType, payload.contract_type_id):
        raise HTTPException(422, detail="contract_type_id does not exist")
    obj = Instructor(**payload.model_dump())
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Instructor document number already exists")
    return obj


@router.put("/{instructor_id}")
def update_instructor(
    instructor_id: int, payload: InstructorUpdate, session: SessionDep
) -> Instructor:
    obj = session.get(Instructor, instructor_id)
    if not obj:
        raise HTTPException(404, detail="Instructor not found")
    if payload.contract_type_id is not None and not session.get(ContractType, payload.contract_type_id):
            raise HTTPException(422, detail="contract_type_id does not exist")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Instructor document number already exists")
    return obj


@router.delete("/{instructor_id}")
def delete_instructor(instructor_id: int, session: SessionDep) -> dict:
    obj = session.get(Instructor, instructor_id)
    if not obj:
        raise HTTPException(404, detail="Instructor not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    return {"ok": True}