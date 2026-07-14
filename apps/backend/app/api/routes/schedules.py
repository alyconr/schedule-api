from datetime import date as date_type
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import require_roles, ROLE_READ, ROLE_WRITE, ROLE_DELETE
from app.db import get_session
from app.models import (
    Competency,
    Environment,
    ExceptionRequest,
    Group,
    Instructor,
    LearningResult,
    LearningResultTopic,
    Schedule,
    ScheduleValidation,
    Topic,
    TrainingProgram,
)
from app.schemas.schedules import (
    ScheduleCreate,
    ScheduleDetailedRead,
    SchedulePersistResponse,
    ScheduleUpdate,
    ScheduleValidationRequest,
    ScheduleValidationResponse,
    ScheduleValidationRead,
    ValidationResult,
)
from app.services.schedule_service import derive_contract_type, get_week_range, weekday_label
from app.services.schedule_validation import validate_schedule


router = APIRouter(prefix="/schedules", tags=["schedules"])
SessionDep = Annotated[Session, Depends(get_session)]
INACTIVE_SCHEDULE_STATUSES = ["cancelled", "deleted"]


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
    exclude_id: int | None = None,
) -> dict:
    if isinstance(payload, ScheduleUpdate) and payload.date is not None:
        ref_date = payload.date
    else:
        ref_date = payload.date

    monday, sunday = get_week_range(ref_date)
    stmt = select(Schedule).where(
        Schedule.instructor_id == payload.instructor_id,
        Schedule.date >= monday,
        Schedule.date <= sunday,
        ~Schedule.status.in_(INACTIVE_SCHEDULE_STATUSES),
    )
    if exclude_id is not None:
        stmt = stmt.where(Schedule.id != exclude_id)
    week_rows = session.exec(stmt).all()
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
    if group.training_program_id is not None:
        program = session.get(TrainingProgram, group.training_program_id)
        if payload.training_program_id is not None and payload.training_program_id != group.training_program_id:
            raise HTTPException(422, detail="training_program_id does not match group training program")
    elif payload.training_program_id is not None:
        program = session.get(TrainingProgram, payload.training_program_id)
        if not program:
            raise HTTPException(404, detail="Training program not found")

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
        ~Schedule.status.in_(INACTIVE_SCHEDULE_STATUSES),
    )
    if exclude_id is not None:
        stmt = stmt.where(Schedule.id != exclude_id)
    return list(session.exec(stmt).all())


def _clean_manual_topic(value: str | None) -> str | None:
    cleaned = value.strip() if value else ""
    return cleaned or None


def _validate_topic_assignment(
    session: Session,
    learning_result_id: int,
    training_program_id: int | None,
    learning_result_topic_id: int | None,
    manual_topic_name: str | None,
) -> None:
    manual_topic_name = _clean_manual_topic(manual_topic_name)
    if learning_result_topic_id and manual_topic_name:
        raise HTTPException(422, detail="Use learning_result_topic_id or manual_topic_name, not both")
    if not learning_result_topic_id and not manual_topic_name:
        raise HTTPException(422, detail="Topic selection is required")
    if not learning_result_topic_id:
        return

    relation = session.get(LearningResultTopic, learning_result_topic_id)
    if not relation:
        raise HTTPException(404, detail="Learning result topic not found")
    if relation.learning_result_id != learning_result_id:
        raise HTTPException(422, detail="learning_result_topic_id does not match learning_result_id")
    if training_program_id is not None and relation.training_program_id != training_program_id:
        raise HTTPException(422, detail="learning_result_topic_id does not match training_program_id")


@router.get("", dependencies=[Depends(require_roles(*ROLE_READ))])
def list_schedules(
    session: SessionDep,
    instructor_id: int | None = Query(default=None),
    group_id: int | None = Query(default=None),
    environment_id: int | None = Query(default=None),
    learning_result_id: int | None = Query(default=None),
    date: date_type | None = Query(default=None),
    date_from: date_type | None = Query(default=None),
    date_to: date_type | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    include_cancelled: bool = Query(default=False),
    limit: int = Query(default=500, ge=1, le=2000),
) -> list[Schedule]:
    stmt = select(Schedule).where(Schedule.status != "deleted")
    if not (include_inactive or include_cancelled):
        stmt = stmt.where(Schedule.status != "cancelled")
    if instructor_id is not None:
        stmt = stmt.where(Schedule.instructor_id == instructor_id)
    if group_id is not None:
        stmt = stmt.where(Schedule.group_id == group_id)
    if environment_id is not None:
        stmt = stmt.where(Schedule.environment_id == environment_id)
    if learning_result_id is not None:
        stmt = stmt.where(Schedule.learning_result_id == learning_result_id)
    if date is not None:
        stmt = stmt.where(Schedule.date == date)
    else:
        if date_from is not None:
            stmt = stmt.where(Schedule.date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Schedule.date <= date_to)
    stmt = stmt.order_by(Schedule.date, Schedule.start_time).limit(limit)
    return list(session.exec(stmt).all())


@router.get(
    "/detailed",
    response_model=list[ScheduleDetailedRead],
    dependencies=[Depends(require_roles(*ROLE_READ))],
)
def list_schedules_detailed(
    session: SessionDep,
    instructor_id: int | None = Query(default=None),
    group_id: int | None = Query(default=None),
    learning_result_id: int | None = Query(default=None),
    date_from: date_type | None = Query(default=None),
    date_to: date_type | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    include_cancelled: bool = Query(default=False),
    limit: int = Query(default=500, ge=1, le=2000),
) -> list[ScheduleDetailedRead]:
    stmt = (
        select(Schedule, Instructor, Group, TrainingProgram, LearningResult, Environment)
        .join(Instructor, Instructor.id == Schedule.instructor_id)
        .join(Group, Group.id == Schedule.group_id)
        .outerjoin(TrainingProgram, TrainingProgram.id == Schedule.training_program_id)
        .outerjoin(LearningResult, LearningResult.id == Schedule.learning_result_id)
        .join(Environment, Environment.id == Schedule.environment_id)
        .where(Schedule.status != "deleted")
    )
    if not (include_inactive or include_cancelled):
        stmt = stmt.where(Schedule.status != "cancelled")
    if instructor_id is not None:
        stmt = stmt.where(Schedule.instructor_id == instructor_id)
    if group_id is not None:
        stmt = stmt.where(Schedule.group_id == group_id)
    if learning_result_id is not None:
        stmt = stmt.where(Schedule.learning_result_id == learning_result_id)
    if date_from is not None:
        stmt = stmt.where(Schedule.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Schedule.date <= date_to)
    stmt = stmt.order_by(Schedule.date, Schedule.start_time).limit(limit)

    rows = session.exec(stmt).all()

    topic_ids = {sch.learning_result_topic_id for sch, *_ in rows if sch.learning_result_topic_id}
    topics_by_relation_id: dict[int, str] = {}
    if topic_ids:
        relations = session.exec(
            select(LearningResultTopic).where(LearningResultTopic.id.in_(topic_ids))
        ).all()
        topic_ids_by_topic_table = {rel.id: rel.topic_id for rel in relations}
        topic_table_ids = set(topic_ids_by_topic_table.values())
        topics = session.exec(select(Topic).where(Topic.id.in_(topic_table_ids))).all() if topic_table_ids else []
        topics_by_id = {t.id: t.name for t in topics}
        topics_by_relation_id = {
            rel_id: topics_by_id.get(topic_table_id, "")
            for rel_id, topic_table_id in topic_ids_by_topic_table.items()
        }

    results: list[ScheduleDetailedRead] = []
    for sch, instructor, group, program, learning_result, environment in rows:
        topic_name = sch.manual_topic_name or (
            topics_by_relation_id.get(sch.learning_result_topic_id) if sch.learning_result_topic_id else None
        )
        results.append(
            ScheduleDetailedRead(
                id=sch.id,
                date=sch.date,
                weekday_label=weekday_label(sch.weekday or sch.date.isoweekday()),
                start_time=sch.start_time,
                end_time=sch.end_time,
                instructor_id=instructor.id,
                instructor_name=f"{instructor.first_name} {instructor.last_name}",
                group_id=group.id,
                group_code=group.code,
                group_name=group.name,
                training_program_id=program.id if program else None,
                training_program_name=program.name if program else None,
                learning_result_id=learning_result.id if learning_result else None,
                learning_result_code=learning_result.code if learning_result else None,
                learning_result_description=learning_result.description if learning_result else None,
                topic_name=topic_name,
                environment_id=environment.id,
                environment_name=environment.name,
                status=sch.status,
            )
        )
    return results


@router.get("/{schedule_id}", dependencies=[Depends(require_roles(*ROLE_READ))])
def get_schedule(schedule_id: int, session: SessionDep) -> Schedule:
    obj = session.get(Schedule, schedule_id)
    if not obj:
        raise HTTPException(404, detail="Schedule not found")
    return obj


@router.get(
    "/{schedule_id}/validations",
    response_model=list[ScheduleValidationRead],
    dependencies=[Depends(require_roles(*ROLE_READ))],
)
def list_schedule_validations(schedule_id: int, session: SessionDep) -> list[ScheduleValidation]:
    if session.get(Schedule, schedule_id) is None:
        raise HTTPException(404, detail="Horario no encontrado")
    return list(
        session.exec(
            select(ScheduleValidation).where(ScheduleValidation.schedule_id == schedule_id)
        ).all()
    )


@router.post("", status_code=201, dependencies=[Depends(require_roles(*ROLE_WRITE))])
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
    manual_topic_name = _clean_manual_topic(payload.manual_topic_name)
    _validate_topic_assignment(
        session,
        payload.learning_result_id,
        training_program_id,
        payload.learning_result_topic_id,
        manual_topic_name,
    )

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
        learning_result_topic_id=payload.learning_result_topic_id,
        manual_topic_name=manual_topic_name,
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


@router.put("/{schedule_id}", dependencies=[Depends(require_roles(*ROLE_WRITE))])
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
    merged_learning_result_topic_id = (
        payload.learning_result_topic_id
        if "learning_result_topic_id" in payload.model_fields_set
        else sch.learning_result_topic_id
    )
    merged_manual_topic_name = (
        payload.manual_topic_name
        if "manual_topic_name" in payload.model_fields_set
        else sch.manual_topic_name
    )
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
        learning_result_topic_id = merged_learning_result_topic_id
        manual_topic_name = merged_manual_topic_name
        training_program_id = merged_training_program_id
        competency_id = merged_competency_id
        date = merged_date
        start_time = merged_start
        end_time = merged_end
        duration_hours = merged_duration

    instructor, group, environment, learning_result, competency, program = _check_entities(session, MergedPayload())

    existing = _existing_for_date(session, MergedPayload(), exclude_id=schedule_id)
    vpayload = _build_validation_payload(
        MergedPayload(), instructor, group, environment, learning_result, competency, program, existing, session,
        exclude_id=schedule_id,
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
    merged_training_program_id = MergedPayload().training_program_id
    if merged_training_program_id is None and program is not None:
        merged_training_program_id = program.id
    _validate_topic_assignment(
        session,
        MergedPayload().learning_result_id,
        merged_training_program_id,
        MergedPayload().learning_result_topic_id,
        _clean_manual_topic(MergedPayload().manual_topic_name),
    )
    for key, value in update_data.items():
        if key in ("learning_result_topic_id", "manual_topic_name"):
            setattr(sch, key, _clean_manual_topic(value) if key == "manual_topic_name" else value)
        elif value is not None:
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


def _mark_schedule_status(schedule_id: int, status: str, session: SessionDep) -> dict:
    obj = session.get(Schedule, schedule_id)
    if not obj:
        raise HTTPException(404, detail="Schedule not found")
    obj.status = status
    session.add(obj)
    session.commit()
    return {"ok": True}


@router.post("/{schedule_id}/cancel", dependencies=[Depends(require_roles(*ROLE_WRITE))])
def cancel_schedule(schedule_id: int, session: SessionDep) -> dict:
    return _mark_schedule_status(schedule_id, "cancelled", session)


@router.delete("/{schedule_id}", dependencies=[Depends(require_roles(*ROLE_DELETE))])
def delete_schedule(schedule_id: int, session: SessionDep) -> dict:
    obj = session.get(Schedule, schedule_id)
    if not obj:
        raise HTTPException(404, detail="Schedule not found")

    # Cascade delete validation records
    validations = session.exec(
        select(ScheduleValidation).where(ScheduleValidation.schedule_id == schedule_id)
    ).all()
    for v in validations:
        session.delete(v)

    # Cascade delete exception requests
    exceptions = session.exec(
        select(ExceptionRequest).where(ExceptionRequest.schedule_id == schedule_id)
    ).all()
    for e in exceptions:
        session.delete(e)

    # Physically delete the schedule
    session.delete(obj)
    session.commit()
    return {"ok": True}


@router.post("/validate", response_model=ScheduleValidationResponse, dependencies=[Depends(require_roles(*ROLE_WRITE))])
def validate_schedule_draft(payload: ScheduleValidationRequest) -> ScheduleValidationResponse:
    return ScheduleValidationResponse(**validate_schedule(payload.model_dump()))
