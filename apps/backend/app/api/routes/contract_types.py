from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.db import get_session
from app.models import ContractType
from app.schemas.master_data import ContractTypeCreate, ContractTypeUpdate


router = APIRouter(prefix="/contract-types", tags=["contract-types"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("")
def list_contract_types(session: SessionDep) -> list[ContractType]:
    return list(session.exec(select(ContractType)).all())


@router.get("/{contract_type_id}")
def get_contract_type(contract_type_id: int, session: SessionDep) -> ContractType:
    obj = session.get(ContractType, contract_type_id)
    if not obj:
        raise HTTPException(404, detail="Contract type not found")
    return obj


@router.post("", status_code=201)
def create_contract_type(payload: ContractTypeCreate, session: SessionDep) -> ContractType:
    obj = ContractType(**payload.model_dump())
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Contract type name already exists")
    return obj


@router.put("/{contract_type_id}")
def update_contract_type(
    contract_type_id: int, payload: ContractTypeUpdate, session: SessionDep
) -> ContractType:
    obj = session.get(ContractType, contract_type_id)
    if not obj:
        raise HTTPException(404, detail="Contract type not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    try:
        session.add(obj)
        session.commit()
        session.refresh(obj)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Contract type name already exists")
    return obj


@router.delete("/{contract_type_id}")
def delete_contract_type(contract_type_id: int, session: SessionDep) -> dict:
    obj = session.get(ContractType, contract_type_id)
    if not obj:
        raise HTTPException(404, detail="Contract type not found")
    if hasattr(obj, "is_active"):
        obj.is_active = False
        session.add(obj)
    else:
        session.delete(obj)
    session.commit()
    return {"ok": True}