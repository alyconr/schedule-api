from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.api.deps import ADMIN_ROLES, ROLE_READ, SessionDep, require_roles
from app.models import Coordination, Specialty
from app.schemas.pedagogical import SpecialtyCreate, SpecialtyResponse, SpecialtyUpdate


router = APIRouter(tags=["specialties"])


@router.get("/coordinations/{coordination_id}/specialties", dependencies=[Depends(require_roles(*ROLE_READ))])
def list_coordination_specialties(coordination_id: int, session: SessionDep) -> list[SpecialtyResponse]:
    coord = session.get(Coordination, coordination_id)
    if not coord or not coord.is_active:
        raise HTTPException(404, detail="Coordination not found")
    specialties = session.exec(
        select(Specialty).where(
            Specialty.coordination_id == coordination_id,
            Specialty.is_active == True,  # noqa: E712
        )
    ).all()
    return list(specialties)


@router.post(
    "/coordinations/{coordination_id}/specialties",
    status_code=201,
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def create_coordination_specialty(
    coordination_id: int,
    payload: SpecialtyCreate,
    session: SessionDep,
) -> SpecialtyResponse:
    if payload.coordination_id != coordination_id:
        raise HTTPException(422, detail="Coordination ID in URL does not match body")
    coord = session.get(Coordination, coordination_id)
    if not coord or not coord.is_active:
        raise HTTPException(404, detail="Coordination not found")

    specialty = Specialty(**payload.model_dump())
    try:
        session.add(specialty)
        session.commit()
        session.refresh(specialty)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Specialty code already exists")
    return specialty


@router.get("/specialties", dependencies=[Depends(require_roles(*ROLE_READ))])
def list_all_specialties(
    session: SessionDep,
    coordination_id: Optional[int] = Query(default=None),
) -> list[SpecialtyResponse]:
    query = select(Specialty).where(Specialty.is_active == True)  # noqa: E712
    if coordination_id is not None:
        query = query.where(Specialty.coordination_id == coordination_id)
    specialties = session.exec(query).all()
    return list(specialties)


@router.put("/specialties/{specialty_id}", dependencies=[Depends(require_roles(*ADMIN_ROLES))])
def update_specialty(
    specialty_id: int,
    payload: SpecialtyUpdate,
    session: SessionDep,
) -> SpecialtyResponse:
    specialty = session.get(Specialty, specialty_id)
    if not specialty:
        raise HTTPException(404, detail="Specialty not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(specialty, key, val)
    session.add(specialty)
    session.commit()
    session.refresh(specialty)
    return specialty
