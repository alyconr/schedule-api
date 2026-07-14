from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import require_roles, ROLE_READ, ROLE_WRITE, ROLE_DELETE
from app.db import get_session
from app.models import Group, TrainingProgram
from app.schemas.master_data import GroupCreate, GroupUpdate


router = APIRouter(prefix="/groups", tags=["groups"])
SessionDep = Annotated[Session, Depends(get_session)]


def _validate_program(session: Session, program_id: int | None) -> None:
    if program_id is not None and not session.get(TrainingProgram, program_id):
        raise HTTPException(422, detail="training_program_id does not exist")


@router.get("", dependencies=[Depends(require_roles(*ROLE_READ))])
def list_groups(session: SessionDep) -> list[Group]:
    return list(session.exec(select(Group).where(Group.is_active == True)).all())


@router.get("/{group_id}", dependencies=[Depends(require_roles(*ROLE_READ))])
def get_group(group_id: int, session: SessionDep) -> Group:
    obj = session.get(Group, group_id)
    if not obj:
        raise HTTPException(404, detail="Group not found")
    return obj


@router.post("", status_code=201, dependencies=[Depends(require_roles(*ROLE_WRITE))])
def create_group(payload: GroupCreate, session: SessionDep) -> Group:
    _validate_program(session, payload.training_program_id)
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
def update_group(group_id: int, payload: GroupUpdate, session: SessionDep) -> Group:
    obj = session.get(Group, group_id)
    if not obj:
        raise HTTPException(404, detail="Group not found")
    _validate_program(session, payload.training_program_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Group code already exists")
    return obj


@router.delete("/{group_id}", dependencies=[Depends(require_roles(*ROLE_DELETE))])
def delete_group(group_id: int, session: SessionDep) -> dict:
    obj = session.get(Group, group_id)
    if not obj:
        raise HTTPException(404, detail="Group not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    return {"ok": True}
