from collections import Counter
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select

from app.api.deps import ADMIN_ROLES, CurrentUserDep, SessionDep, require_roles
from app.models import Coordination, Specialty, User
from app.models.pedagogical import PedagogicalPlanning, PlanningMatrix
from app.schemas.pedagogical import (
    PedagogicalPlanningCreate,
    PedagogicalPlanningResponse,
    PedagogicalPlanningStatusUpdate,
    PlanningDashboardResponse,
    PlanningMatrixCreate,
    PlanningMatrixResponse,
)


router = APIRouter(prefix="/pedagogical-plannings", tags=["pedagogical-plannings"])


def _planning_to_response(planning: PedagogicalPlanning, session: SessionDep) -> PedagogicalPlanningResponse:
    coord = session.get(Coordination, planning.coordination_id)
    spec = session.get(Specialty, planning.specialty_id)
    leader = session.get(User, planning.leader_id)

    matrices = session.exec(
        select(PlanningMatrix).where(PlanningMatrix.planning_id == planning.id)
    ).all()

    matrix_responses = [
        PlanningMatrixResponse(
            id=m.id,
            planning_id=m.planning_id,
            matrix_type=m.matrix_type,
            original_filename=m.original_filename,
            file_url=m.file_url,
            uploaded_by=m.uploaded_by,
            uploaded_at=m.uploaded_at,
        )
        for m in matrices
    ]

    return PedagogicalPlanningResponse(
        id=planning.id,
        coordination_id=planning.coordination_id,
        coordination_name=coord.name if coord else None,
        specialty_id=planning.specialty_id,
        specialty_name=spec.name if spec else None,
        leader_id=planning.leader_id,
        leader_name=leader.full_name if leader else None,
        program_code=planning.program_code,
        program_name=planning.program_name,
        program_version=planning.program_version,
        project_code=planning.project_code,
        project_name=planning.project_name,
        project_version=planning.project_version,
        executing_team=planning.executing_team,
        status=planning.status,
        observations=planning.observations,
        created_at=planning.created_at,
        updated_at=planning.updated_at,
        matrices=matrix_responses,
    )


def _is_admin(current_user: User, session: SessionDep) -> bool:
    from app.api.deps import _load_user_roles
    roles = _load_user_roles(session, current_user.id)
    return any(r in ADMIN_ROLES for r in roles)


@router.get("/dashboard")
def get_dashboard(
    current_user: CurrentUserDep,
    session: SessionDep,
    coordination_id: Optional[int] = Query(default=None),
    specialty_id: Optional[int] = Query(default=None),
) -> PlanningDashboardResponse:
    admin_user = _is_admin(current_user, session)

    query = select(PedagogicalPlanning)

    if admin_user:
        # Administrators (Equipo Pedagógico) can filter by any coordination and specialty
        if coordination_id is not None:
            query = query.where(PedagogicalPlanning.coordination_id == coordination_id)
        if specialty_id is not None:
            query = query.where(PedagogicalPlanning.specialty_id == specialty_id)
    else:
        # Leader or Additional user: strictly scoped to their own coordination and specialty
        if not current_user.coordination_id or not current_user.specialty_id:
            return PlanningDashboardResponse(total_plannings=0, by_status={}, items=[])
        query = query.where(
            PedagogicalPlanning.coordination_id == current_user.coordination_id,
            PedagogicalPlanning.specialty_id == current_user.specialty_id,
        )

    plannings = session.exec(query).all()
    status_counts = Counter(p.status for p in plannings)

    items = [_planning_to_response(p, session) for p in plannings]
    return PlanningDashboardResponse(
        total_plannings=len(items),
        by_status=dict(status_counts),
        items=items,
    )


@router.post("", status_code=201)
def create_planning(
    payload: PedagogicalPlanningCreate,
    current_user: CurrentUserDep,
    session: SessionDep,
) -> PedagogicalPlanningResponse:
    admin_user = _is_admin(current_user, session)

    # If leader or additional user, force their assigned coordination and specialty
    if not admin_user:
        if (
            current_user.coordination_id != payload.coordination_id
            or current_user.specialty_id != payload.specialty_id
        ):
            raise HTTPException(
                403,
                detail="Solo puede crear planeaciones correspondientes a su coordinación y especialidad asignada",
            )

    coord = session.get(Coordination, payload.coordination_id)
    if not coord or not coord.is_active:
        raise HTTPException(422, detail="La coordinación no existe o está inactiva")

    spec = session.get(Specialty, payload.specialty_id)
    if not spec or not spec.is_active or spec.coordination_id != payload.coordination_id:
        raise HTTPException(422, detail="La especialidad no pertenece a la coordinación indicada")

    planning = PedagogicalPlanning(
        coordination_id=payload.coordination_id,
        specialty_id=payload.specialty_id,
        leader_id=current_user.id,
        program_code=payload.program_code,
        program_name=payload.program_name,
        program_version=payload.program_version,
        project_code=payload.project_code,
        project_name=payload.project_name,
        project_version=payload.project_version,
        executing_team=payload.executing_team,
        observations=payload.observations,
        status="draft",
    )
    session.add(planning)
    session.commit()
    session.refresh(planning)
    return _planning_to_response(planning, session)


@router.get("/{planning_id}")
def get_planning(
    planning_id: int,
    current_user: CurrentUserDep,
    session: SessionDep,
) -> PedagogicalPlanningResponse:
    planning = session.get(PedagogicalPlanning, planning_id)
    if not planning:
        raise HTTPException(404, detail="Planeación pedagógica no encontrada")

    if not _is_admin(current_user, session):
        if (
            planning.coordination_id != current_user.coordination_id
            or planning.specialty_id != current_user.specialty_id
        ):
            raise HTTPException(404, detail="Planeación pedagógica no encontrada")

    return _planning_to_response(planning, session)


@router.post("/{planning_id}/matrices", status_code=201)
def upload_matrix(
    planning_id: int,
    payload: PlanningMatrixCreate,
    current_user: CurrentUserDep,
    session: SessionDep,
) -> PlanningMatrixResponse:
    planning = session.get(PedagogicalPlanning, planning_id)
    if not planning:
        raise HTTPException(404, detail="Planeación pedagógica no encontrada")

    if not _is_admin(current_user, session):
        if (
            planning.coordination_id != current_user.coordination_id
            or planning.specialty_id != current_user.specialty_id
        ):
            raise HTTPException(403, detail="No tiene permisos para modificar esta planeación")

    matrix = PlanningMatrix(
        planning_id=planning.id,
        matrix_type=payload.matrix_type,
        original_filename=payload.original_filename,
        file_url=payload.file_url,
        uploaded_by=current_user.id,
    )
    session.add(matrix)
    session.commit()
    session.refresh(matrix)

    return PlanningMatrixResponse(
        id=matrix.id,
        planning_id=matrix.planning_id,
        matrix_type=matrix.matrix_type,
        original_filename=matrix.original_filename,
        file_url=matrix.file_url,
        uploaded_by=matrix.uploaded_by,
        uploaded_at=matrix.uploaded_at,
    )


@router.put("/{planning_id}/status")
def update_planning_status(
    planning_id: int,
    payload: PedagogicalPlanningStatusUpdate,
    current_user: CurrentUserDep,
    session: SessionDep,
) -> PedagogicalPlanningResponse:
    planning = session.get(PedagogicalPlanning, planning_id)
    if not planning:
        raise HTTPException(404, detail="Planeación pedagógica no encontrada")

    admin_user = _is_admin(current_user, session)

    if not admin_user:
        if (
            planning.coordination_id != current_user.coordination_id
            or planning.specialty_id != current_user.specialty_id
        ):
            raise HTTPException(403, detail="No tiene permisos sobre esta planeación")
        # Leader or additional user can only transition draft -> in_review
        if payload.status != "in_review":
            raise HTTPException(
                403,
                detail="Solo el Administrador (Equipo Pedagógico) puede cambiar el estado a aprobado o ajuste requerido",
            )

    planning.status = payload.status
    if payload.observations is not None:
        planning.observations = payload.observations

    session.add(planning)
    session.commit()
    session.refresh(planning)
    return _planning_to_response(planning, session)
