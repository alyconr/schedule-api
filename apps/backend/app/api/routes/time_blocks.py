from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import TimeBlock
from app.schemas.master_data import TimeBlockCreate, TimeBlockUpdate


router = APIRouter(prefix="/time-blocks", tags=["time-blocks"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("")
def list_time_blocks(session: SessionDep) -> list[TimeBlock]:
    return list(session.exec(select(TimeBlock)).all())


@router.get("/{time_block_id}")
def get_time_block(time_block_id: int, session: SessionDep) -> TimeBlock:
    obj = session.get(TimeBlock, time_block_id)
    if not obj:
        raise HTTPException(404, detail="Time block not found")
    return obj


@router.post("", status_code=201)
def create_time_block(payload: TimeBlockCreate, session: SessionDep) -> TimeBlock:
    obj = TimeBlock(**payload.model_dump())
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.put("/{time_block_id}")
def update_time_block(
    time_block_id: int, payload: TimeBlockUpdate, session: SessionDep
) -> TimeBlock:
    obj = session.get(TimeBlock, time_block_id)
    if not obj:
        raise HTTPException(404, detail="Time block not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.delete("/{time_block_id}")
def delete_time_block(time_block_id: int, session: SessionDep) -> dict:
    obj = session.get(TimeBlock, time_block_id)
    if not obj:
        raise HTTPException(404, detail="Time block not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    return {"ok": True}