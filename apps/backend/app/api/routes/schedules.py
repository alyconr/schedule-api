from datetime import date as date_type
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.db import get_session
from app.models import (
    Competency,
    ContractType,
    Environment,
    Group,
    Instructor,
    LearningResult,
    Schedule,
    ScheduleValidation,
    TrainingProgram,
)
from app.schemas.schedules import (
    ScheduleCreate,
    SchedulePersistResponse,
    ScheduleUpdate,
    ScheduleValidationRequest,
    ScheduleValidationResponse,
    ValidationResult,
)
from app.services.schedule_service import derive_contract_type, get_week_range
from app.services.schedule_validation import validate_schedule


router = APIRouter(prefix="/schedules", tags=["schedules"])
SessionDep = Annotated[Session, Depends(get_session)]


def _build_validation_payload(
    payload: ScheduleCreate | ScheduleUpdate,
    instructor: Instructor,
    group: Group,
    environment: Environment,
    learning_result: LearningResult,
    competency: Competency | None,
    program: TrainingProgram | None,
    existing_schedules_raw: list[Schedule],
    session: Session,
) -> dict:
    if isinstance(payload, ScheduleUpdate) and payload.date is not None:
        ref_date = payload.date
    else:
        ref_date = payload.date

    monday, sunday = get_week_range(ref_date)
    week_rows = session.exec(
        select(Schedule).where(
            Schedule.instructor_id == payload.instructor_id,
            Schedule.date >= monday,
            Schedule.date <= sunday,
            Schedule.status != "cancelled",
        )
    ).all()
    instructor_weekly_hours = float(sum(r.duration_hours for r in week_rows))

    contract_type_name = instructor.contract_type.name if instructor.contract_type else ""
    instructor_contract_type = derive_contract_type(contract_type_name)

    program_lr_ids: list[str] = []
    if program is not None:
        for comp in (program.competencies or []):
            for lr in (comp.learning_results or []):
                program_lr_ids.append(str(lr.id))

    existing_list = []
    for sch in existing_schedules_raw:
        env = session.get(Environment, sch.environment_id)
        existing_list.append({
            "instructor_id": str(sch.instructor_id),
            "group_id": str(sch.group_id),
            "environment_id": str(sch.environment_id),
            "learning_result_id": str(sch.learning_result_id),
            "date": sch.date,
            "start_time": sch.start_time,
            "end_time": sch.end_time,
            "environment_type": (env.environment_type if env else "fisico"),
        })

    return {
        "instructor_id": str(payload.instructor_id),
        "group_id": str(payload.group_id),
        "environment_id": str(payload.environment_id),
        "learning_result_id": str(payload.learning_result_id),
        "program_learning_result_ids": program_lr_ids or [str(payload.learning_result_id)],
        "date": payload.date,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "duration_hours": float(payload.duration_hours),
        "instructor_contract_type": instructor_contract_type,
        "instructor_weekly_hours": instructor_weekly_hours,
        "group_learners": group.learners_count,
        "environment_capacity": environment.capacity,
        "environment_type": environment.environment_type,
        "instructor_active": instructor.is_active,
        "group_active": group.is_active,
        "environment_active": environment.is_active,
        "existing_schedules": existing_list,
    }


def _check_entities(
    session: Session, payload: ScheduleCreate | ScheduleUpdate
) -> tuple[Instructor, Group, Environment, LearningResult, Competency | None, TrainingProgram | None]:
    instructor = session.get(Instructor, payload.instructor_id)
    if not instructor:
        raise HTTPException(404, detail="Instructor not found")

    group = session.get(Group, payload.group_id)
    if not group:
        raise HTTPException(404, detail="Group not found")

    environment = session.get(Environment, payload.environment_id)
    if not environment:
        raise HTTPException(404, detail="Environment not found")

    learning_result = session.get(LearningResult, payload.learning_result_id)
    if not learning_result:
        raise HTTPException(404, detail="Learning result not found")

    program: TrainingProgram | None = None
    if payload.training_program_id is not None:
        program = session.get(TrainingProgram, payload.training_program_id)
        if not program:
            raise HTTPException(404, detail="Training program not found")
    elif group.training_program_id is not None:
        program = session.get(TrainingProgram, group.training_program_id)

    competency: Competency | None = None
    if payload.competency_id is not None:
        competency = session.get(Competency, payload.competency_id)
        if not competency:
            raise HTTPException(404, detail="Competency not found")
    elif learning_result.competency_id is not None:
        competency = session.get(Competency, learning_result.competency_id)

    if program is None and competency is not None and competency.training_program_id is not None:
        program = session.get(TrainingProgram, competency.training_program_id)

    return instructor, group, environment, learning_result, competency, program


def _save_validations(session: Session, schedule_id: int, validations: list[dict]) -> None:
    for v in validations:
        sv = ScheduleValidation(
            schedule_id=schedule_id,
            rule_code=v["rule_code"],
            severity=v["severity"],
            message=v["message"],
            is_blocking=v["is_blocking"],
        )
        session.add(sv)


def _existing_for_date(
    session: Session, payload: ScheduleCreate | ScheduleUpdate, exclude_id: int | None = None
) -> list[Schedule]:
    stmt = select(Schedule).where(
        Schedule.date == payload.date,
        Schedule.status != "cancelled",
    )
    if exclude_id is not None:
        stmt = stmt.where(Schedule.id != exclude_id)
    return list(session.exec(stmt).all())


@router.get("")
def list_schedules(
    session: SessionDep,
    instructor_id: int | None = Query(default=None),
    group_id: int | None = Query(default=None),
    environment_id: int | None = Query(default=None),
    date: date_type | None = Query(default=None),
) -> list[Schedule]:
    stmt = select(Schedule)
    if instructor_id is not None:
        stmt = stmt.where(Schedule.instructor_id == instructor_id)
    if group_id is not None:
        stmt = stmt.where(Schedule.group_id == group_id)
    if environment_id is not None:
        stmt = stmt.where(Schedule.environment_id == environment_id)
    if date is not None:
        stmt = stmt.where(Schedule.date == date)
    return list(session.exec(stmt).all())


@router.get("/{schedule_id}")
def get_schedule(schedule_id: int, session: SessionDep) -> Schedule:
    obj = session.get(Schedule, schedule_id)
    if not obj:
        raise HTTPException(404, detail="Schedule not found")
    return obj


@router.post("", status_code=201)
def create_schedule(payload: ScheduleCreate, session: SessionDep) -> SchedulePersistResponse:
    instructor, group, environment, learning_result, competency, program = _check_entities(session, payload)

    existing = _existing_for_date(session, payload)
    vpayload = _build_validation_payload(
        payload, instructor, group, environment, learning_result, competency, program, existing, session
    )
    result = validate_schedule(vpayload)

    if result["status"] == "blocked":
        return SchedulePersistResponse(
            status="blocked",
            schedule=None,
            validations=[ValidationResult(**v) for v in result["validations"]],
        )

    training_program_id = payload.training_program_id
    if training_program_id is None and program is not None:
        training_program_id = program.id
    competency_id = payload.competency_id
    if competency_id is None and competency is not None:
        competency_id = competency.id

    if result["status"] == "warning":
        db_status = "warning"
    else:
        db_status = "validated"

    sch = Schedule(
        instructor_id=payload.instructor_id,
        group_id=payload.group_id,
        training_program_id=training_program_id,
        competency_id=competency_id,
        learning_result_id=payload.learning_result_id,
        environment_id=payload.environment_id,
        date=payload.date,
        weekday=payload.weekday or payload.date.isoweekday(),
        start_time=payload.start_time,
        end_time=payload.end_time,
        block_id=payload.block_id,
        subblock_id=payload.subblock_id,
        duration_hours=Decimal(str(payload.duration_hours)),
        status=db_status,
        notes=payload.notes,
    )
    try:
        session.add(sch)
        session.flush()
        if result["validations"]:
            _save_validations(session, sch.id, result["validations"])
        session.commit()
        session.refresh(sch)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Schedule could not be saved")

    return SchedulePersistResponse(
        status=db_status,
        schedule=sch.model_dump(),
        validations=[ValidationResult(**v) for v in result["validations"]],
    )


@router.put("/{schedule_id}")
def update_schedule(
    schedule_id: int, payload: ScheduleUpdate, session: SessionDep
) -> SchedulePersistResponse:
    sch = session.get(Schedule, schedule_id)
    if not sch:
        raise HTTPException(404, detail="Schedule not found")

    merged_instructor_id = payload.instructor_id if payload.instructor_id is not None else sch.instructor_id
    merged_group_id = payload.group_id if payload.group_id is not None else sch.group_id
    merged_environment_id = payload.environment_id if payload.environment_id is not None else sch.environment_id
    merged_learning_result_id = payload.learning_result_id if payload.learning_result_id is not None else sch.learning_result_id
    merged_training_program_id = payload.training_program_id if payload.training_program_id is not None else sch.training_program_id
    merged_competency_id = payload.competency_id if payload.competency_id is not None else sch.competency_id
    merged_date = payload.date if payload.date is not None else sch.date
    merged_start = payload.start_time if payload.start_time is not None else sch.start_time
    merged_end = payload.end_time if payload.end_time is not None else sch.end_time
    merged_duration = payload.duration_hours if payload.duration_hours is not None else float(sch.duration_hours)

    class MergedPayload:
        instructor_id = merged_instructor_id
        group_id = merged_group_id
        environment_id = merged_environment_id
        learning_result_id = merged_learning_result_id
        training_program_id = merged_training_program_id
        competency_id = merged_competency_id
        date = merged_date
        start_time = merged_start
        end_time = merged_end
        duration_hours = merged_duration

    instructor, group, environment, learning_result, competency, program = _check_entities(session, MergedPayload())

    existing = _existing_for_date(session, MergedPayload(), exclude_id=schedule_id)
    vpayload = _build_validation_payload(
        MergedPayload(), instructor, group, environment, learning_result, competency, program, existing, session
    )
    result = validate_schedule(vpayload)

    if result["status"] == "blocked":
        return SchedulePersistResponse(
            status="blocked",
            schedule=None,
            validations=[ValidationResult(**v) for v in result["validations"]],
        )

    if payload.status is not None:
        sch.status = payload.status
    elif result["status"] == "warning":
        sch.status = "warning"
    else:
        sch.status = "validated"

    update_data = payload.model_dump(exclude_unset=True, exclude={"status"})
    for key, value in update_data.items():
        if value is not None:
            if key == "duration_hours":
                setattr(sch, key, Decimal(str(value)))
            else:
                setattr(sch, key, value)

    try:
        session.add(sch)
        old_validations = session.exec(
            select(ScheduleValidation).where(ScheduleValidation.schedule_id == schedule_id)
        ).all()
        for ov in old_validations:
            session.delete(ov)
        if result["validations"]:
            _save_validations(session, sch.id, result["validations"])
        session.commit()
        session.refresh(sch)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, detail="Schedule could not be updated")

    return SchedulePersistResponse(
        status=sch.status,
        schedule=sch.model_dump(),
        validations=[ValidationResult(**v) for v in result["validations"]],
    )


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, session: SessionDep) -> dict:
    obj = session.get(Schedule, schedule_id)
    if not obj:
        raise HTTPException(404, detail="Schedule not found")
    obj.status = "cancelled"
    session.add(obj)
    session.commit()
    return {"ok": True}


@router.post("/validate", response_model=ScheduleValidationResponse)
def validate_schedule_draft(payload: ScheduleValidationRequest) -> ScheduleValidationResponse:
    return ScheduleValidationResponse(**validate_schedule(payload.model_dump()))