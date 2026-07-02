from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.db import get_session
from app.models import Environment
from app.schemas.master_data import EnvironmentCreate, EnvironmentUpdate


router = APIRouter(prefix="/environments", tags=["environments"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("")
def list_environments(session: SessionDep) -> list[Environment]:
    return list(session.exec(select(Environment)).all())


@router.get("/{environment_id}")
def get_environment(environment_id: int, session: SessionDep) -> Environment:
    obj = session.get(Environment, environment_id)
    if not obj:
        raise HTTPException(404, detail="Environment not found")
    return obj


@router.post("", status_code=201)
def create_environment(payload: EnvironmentCreate, session: SessionDep) -> Environment:
    obj = Environment(**payload.model_dump())
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Environment code already exists")
    return obj


@router.put("/{environment_id}")
def update_environment(
    environment_id: int, payload: EnvironmentUpdate, session: SessionDep
) -> Environment:
    obj = session.get(Environment, environment_id)
    if not obj:
        raise HTTPException(404, detail="Environment not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Environment code already exists")
    return obj


@router.delete("/{environment_id}")
def delete_environment(environment_id: int, session: SessionDep) -> dict:
    obj = session.get(Environment, environment_id)
    if not obj:
        raise HTTPException(404, detail="Environment not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    return {"ok": True}