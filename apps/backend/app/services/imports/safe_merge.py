from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
import hashlib
import json
from typing import Any, Callable, Optional

from sqlmodel import Session, select

from app.models import (
    AcademicPeriod,
    Competency,
    ContractType,
    Environment,
    EnvironmentCoordination,
    Group,
    Instructor,
    InstructorCoordination,
    LearningResult,
    LearningResultTopic,
    Topic,
    TrainingProgram,
)
from app.schemas.imports import ImportIssue


def compute_file_sha256(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def normalize_val_for_fingerprint(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return str(val.normalize() if val == val.to_integral() else val)
    if isinstance(val, float):
        return f"{val:.4f}".rstrip("0").rstrip(".")
    if isinstance(val, str):
        return val.strip()
    return val


def compute_record_fingerprint(payload: dict[str, Any], excluded_keys: set[str] | None = None) -> str:
    excluded = excluded_keys or {"id", "created_at", "updated_at"}
    cleaned = {
        k: normalize_val_for_fingerprint(v)
        for k, v in payload.items()
        if k not in excluded and not k.startswith("_")
    }
    serialized = json.dumps(cleaned, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def merge_field(existing_val: Any, incoming_val: Any) -> Any:
    """Null/empty cell never erases existing data."""
    if incoming_val is None:
        return existing_val
    if isinstance(incoming_val, str) and not incoming_val.strip():
        return existing_val
    return incoming_val


def deduplicate_records(
    records: list[dict[str, Any]],
    natural_key_fn: Callable[[dict[str, Any]], str],
    entity_name: str,
    sheet_name: str,
    warnings: list[ImportIssue],
    errors: list[ImportIssue],
) -> list[dict[str, Any]]:
    seen: dict[str, dict[str, Any]] = {}
    seen_fingerprints: dict[str, str] = {}
    deduped: list[dict[str, Any]] = []

    for item in records:
        key = str(natural_key_fn(item) or "").strip()
        if not key:
            deduped.append(item)
            continue


        fp = compute_record_fingerprint(item)
        if key in seen:
            if seen_fingerprints[key] == fp:
                warnings.append(
                    ImportIssue(
                        sheet=sheet_name,
                        row=item.get("source_row"),
                        entity=entity_name,
                        severity="warning",
                        message=f"Registro duplicado idéntico para la clave '{key}'. Se procesa una única vez.",
                        raw_value=key,
                    )
                )
            else:
                errors.append(
                    ImportIssue(
                        sheet=sheet_name,
                        row=item.get("source_row"),
                        entity=entity_name,
                        severity="error",
                        message=f"Registro duplicado con datos contradictorios para la clave '{key}'.",
                        raw_value=key,
                    )
                )
            continue

        seen[key] = item
        seen_fingerprints[key] = fp
        deduped.append(item)

    return deduped


@dataclass
class ClassifiedRecord:
    entity_type: str
    natural_key: str
    action: str  # CREATE, UPDATE, UNCHANGED, CONFLICT, REJECTED
    incoming_data: dict[str, Any]
    existing_obj: Any = None
    before_hash: Optional[str] = None
    after_hash: Optional[str] = None
    conflict_reason: Optional[str] = None
    changes: dict[str, dict[str, Any]] = field(default_factory=dict)
    source_sheet: Optional[str] = None
    source_row: Optional[int] = None


def classify_group(
    session: Session,
    incoming: dict[str, Any],
    coordination_id: Optional[int],
    is_global: bool,
) -> ClassifiedRecord:
    code = str(incoming.get("code") or "").strip()
    sheet = incoming.get("source_sheet", "FICHAS")
    row = incoming.get("source_row")

    existing = session.exec(select(Group).where(Group.code == code)).first()
    if not existing:
        return ClassifiedRecord(
            entity_type="groups",
            natural_key=code,
            action="CREATE",
            incoming_data=incoming,
            source_sheet=sheet,
            source_row=row,
        )

    # Check ownership
    if existing.coordination_id != coordination_id:
        if existing.coordination_id is None:
            if not is_global:
                return ClassifiedRecord(
                    entity_type="groups",
                    natural_key=code,
                    action="CONFLICT",
                    incoming_data=incoming,
                    existing_obj=existing,
                    conflict_reason="La ficha legacy no tiene coordinación asignada. Requiere asignación por un administrador.",
                    source_sheet=sheet,
                    source_row=row,
                )
            # Admin can assign coordination to legacy group
        else:
            return ClassifiedRecord(
                entity_type="groups",
                natural_key=code,
                action="CONFLICT",
                incoming_data=incoming,
                existing_obj=existing,
                conflict_reason="La ficha pertenece a otra coordinación. No está autorizado para modificarla ni transferirla.",
                source_sheet=sheet,
                source_row=row,
            )

    # Compare fields with safe_merge
    existing_dict = existing.model_dump()
    before_hash = compute_record_fingerprint(existing_dict)

    changes: dict[str, dict[str, Any]] = {}
    target_fields = [
        "name", "jornada", "modality", "trimester", "start_date", "end_date",
        "productive_stage_start_date", "productive_stage_end_date", "learners_count", "notes"
    ]
    if existing.coordination_id is None and is_global and coordination_id is not None:
        changes["coordination_id"] = {"before": None, "after": coordination_id}

    for fld in target_fields:
        if fld in incoming:
            curr_val = existing_dict.get(fld)
            inc_val = incoming.get(fld)
            merged = merge_field(curr_val, inc_val)
            if merged != curr_val and inc_val is not None and str(inc_val).strip() != "":
                changes[fld] = {"before": curr_val, "after": merged}

    action = "UPDATE" if changes else "UNCHANGED"
    return ClassifiedRecord(
        entity_type="groups",
        natural_key=code,
        action=action,
        incoming_data=incoming,
        existing_obj=existing,
        before_hash=before_hash,
        changes=changes,
        source_sheet=sheet,
        source_row=row,
    )


def classify_instructor(
    session: Session,
    incoming: dict[str, Any],
    coordination_id: Optional[int],
    is_global: bool,
) -> ClassifiedRecord:
    doc = str(incoming.get("document_number") or "").strip()
    sheet = incoming.get("source_sheet", "LISTA INSTRUCTORES")
    row = incoming.get("source_row")

    existing = session.exec(select(Instructor).where(Instructor.document_number == doc)).first()
    if not existing:
        return ClassifiedRecord(
            entity_type="instructors",
            natural_key=doc,
            action="CREATE",
            incoming_data=incoming,
            source_sheet=sheet,
            source_row=row,
        )

    existing_dict = existing.model_dump()
    before_hash = compute_record_fingerprint(existing_dict)
    changes: dict[str, dict[str, Any]] = {}

    # Validate email conflict
    inc_email = str(incoming.get("email") or "").strip()
    if existing.email and inc_email and existing.email.lower() != inc_email.lower():
        return ClassifiedRecord(
            entity_type="instructors",
            natural_key=doc,
            action="CONFLICT",
            incoming_data=incoming,
            existing_obj=existing,
            before_hash=before_hash,
            conflict_reason=f"Email institucional difiere del existente en centro (actual: {existing.email}, entrante: {inc_email}).",
            source_sheet=sheet,
            source_row=row,
        )

    # Validate name conflict if material difference
    inc_first = str(incoming.get("first_name") or "").strip()
    inc_last = str(incoming.get("last_name") or "").strip()
    inc_full = f"{inc_first} {inc_last}".strip().lower()
    exist_full = f"{existing.first_name} {existing.last_name}".strip().lower()
    if inc_full and exist_full and inc_full != exist_full:
        # Check if length/character difference is major
        if len(set(inc_full.split()) ^ set(exist_full.split())) > 1:
            return ClassifiedRecord(
                entity_type="instructors",
                natural_key=doc,
                action="CONFLICT",
                incoming_data=incoming,
                existing_obj=existing,
                before_hash=before_hash,
                conflict_reason=f"Nombre del instructor difiere materialmente del registro institucional ({existing.first_name} {existing.last_name} vs {inc_first} {inc_last}).",
                source_sheet=sheet,
                source_row=row,
            )

    # Safe merge for empty fields
    for fld in ["email", "phone", "specialty", "notes"]:
        if fld in incoming:
            curr = existing_dict.get(fld)
            inc = incoming.get(fld)
            if not curr and inc:
                changes[fld] = {"before": curr, "after": inc}

    # Check if coordination link exists
    needs_coord_link = False
    if coordination_id is not None:
        link = session.exec(
            select(InstructorCoordination).where(
                InstructorCoordination.instructor_id == existing.id,
                InstructorCoordination.coordination_id == coordination_id,
            )
        ).first()
        if not link:
            needs_coord_link = True

    action = "UPDATE" if (changes or needs_coord_link) else "UNCHANGED"
    return ClassifiedRecord(
        entity_type="instructors",
        natural_key=doc,
        action=action,
        incoming_data=incoming,
        existing_obj=existing,
        before_hash=before_hash,
        changes=changes,
        source_sheet=sheet,
        source_row=row,
    )


def classify_environment(
    session: Session,
    incoming: dict[str, Any],
    coordination_id: Optional[int],
    is_global: bool,
) -> ClassifiedRecord:
    code = str(incoming.get("code") or "").strip()
    sheet = incoming.get("source_sheet", "AMBIENTES")
    row = incoming.get("source_row")

    existing = session.exec(select(Environment).where(Environment.code == code)).first()
    if not existing:
        return ClassifiedRecord(
            entity_type="environments",
            natural_key=code,
            action="CREATE",
            incoming_data=incoming,
            source_sheet=sheet,
            source_row=row,
        )

    existing_dict = existing.model_dump()
    before_hash = compute_record_fingerprint(existing_dict)

    # If incoming has materially conflicting capacity or environment_type, conflict
    inc_cap = incoming.get("capacity")
    if inc_cap is not None and existing.capacity and int(inc_cap) > 0 and int(inc_cap) != existing.capacity:
        # Check if environment is shared across coordinations
        links_count = len(
            session.exec(
                select(EnvironmentCoordination).where(EnvironmentCoordination.environment_id == existing.id)
            ).all()
        )
        if links_count > 1:
            return ClassifiedRecord(
                entity_type="environments",
                natural_key=code,
                action="CONFLICT",
                incoming_data=incoming,
                existing_obj=existing,
                before_hash=before_hash,
                conflict_reason=f"El ambiente es compartido y la capacidad entrante ({inc_cap}) difiere de la institucional ({existing.capacity}).",
                source_sheet=sheet,
                source_row=row,
            )

    changes: dict[str, dict[str, Any]] = {}
    for fld in ["name", "location", "resources", "notes"]:
        if fld in incoming:
            curr = existing_dict.get(fld)
            inc = incoming.get(fld)
            merged = merge_field(curr, inc)
            if merged != curr and inc is not None and str(inc).strip() != "":
                changes[fld] = {"before": curr, "after": merged}

    needs_coord_link = False
    if coordination_id is not None:
        link = session.exec(
            select(EnvironmentCoordination).where(
                EnvironmentCoordination.environment_id == existing.id,
                EnvironmentCoordination.coordination_id == coordination_id,
            )
        ).first()
        if not link:
            needs_coord_link = True

    action = "UPDATE" if (changes or needs_coord_link) else "UNCHANGED"
    return ClassifiedRecord(
        entity_type="environments",
        natural_key=code,
        action=action,
        incoming_data=incoming,
        existing_obj=existing,
        before_hash=before_hash,
        changes=changes,
        source_sheet=sheet,
        source_row=row,
    )


def classify_training_program(
    session: Session,
    incoming: dict[str, Any],
) -> ClassifiedRecord:
    code = str(incoming.get("code") or "").strip()
    sheet = incoming.get("source_sheet", "FICHAS")
    row = incoming.get("source_row")

    existing = session.exec(select(TrainingProgram).where(TrainingProgram.code == code)).first()
    if not existing:
        return ClassifiedRecord(
            entity_type="programs",
            natural_key=code,
            action="CREATE",
            incoming_data=incoming,
            source_sheet=sheet,
            source_row=row,
        )

    # Check structural conflict (level, name)
    inc_level = str(incoming.get("level") or "").strip().lower()
    exist_level = str(existing.level or "").strip().lower()
    if inc_level and exist_level and inc_level != exist_level:
        return ClassifiedRecord(
            entity_type="programs",
            natural_key=code,
            action="CONFLICT",
            incoming_data=incoming,
            existing_obj=existing,
            conflict_reason=f"Nivel formativo conflictivo para el programa '{code}' ({existing.level} vs {incoming.get('level')}).",
            source_sheet=sheet,
            source_row=row,
        )

    return ClassifiedRecord(
        entity_type="programs",
        natural_key=code,
        action="UNCHANGED",
        incoming_data=incoming,
        existing_obj=existing,
        source_sheet=sheet,
        source_row=row,
    )


def classify_academic_period(
    session: Session,
    incoming: dict[str, Any],
    is_global: bool,
) -> ClassifiedRecord:
    year = int(incoming.get("year", 0))
    quarter = int(incoming.get("quarter_number", 0))
    key = f"{year}-Q{quarter}"
    sheet = incoming.get("source_sheet", "TRIMESTRE")
    row = incoming.get("source_row")

    existing = session.exec(
        select(AcademicPeriod).where(AcademicPeriod.year == year, AcademicPeriod.quarter_number == quarter)
    ).first()

    if not existing:
        if not is_global:
            return ClassifiedRecord(
                entity_type="academic_periods",
                natural_key=key,
                action="CONFLICT",
                incoming_data=incoming,
                conflict_reason=f"El período académico {key} no existe en el sistema y solo un administrador puede crearlo.",
                source_sheet=sheet,
                source_row=row,
            )
        return ClassifiedRecord(
            entity_type="academic_periods",
            natural_key=key,
            action="CREATE",
            incoming_data=incoming,
            source_sheet=sheet,
            source_row=row,
        )

    # Period exists: check if dates or name match
    inc_start = incoming.get("start_date")
    inc_end = incoming.get("end_date")
    if inc_start and existing.start_date != inc_start or inc_end and existing.end_date != inc_end:
        if not is_global:
            return ClassifiedRecord(
                entity_type="academic_periods",
                natural_key=key,
                action="CONFLICT",
                incoming_data=incoming,
                existing_obj=existing,
                conflict_reason=f"Las fechas del período {key} difieren del calendario institucional aprobado.",
                source_sheet=sheet,
                source_row=row,
            )
        return ClassifiedRecord(
            entity_type="academic_periods",
            natural_key=key,
            action="UPDATE",
            incoming_data=incoming,
            existing_obj=existing,
            changes={"dates": {"before": f"{existing.start_date} - {existing.end_date}", "after": f"{inc_start} - {inc_end}"}},
            source_sheet=sheet,
            source_row=row,
        )

    return ClassifiedRecord(
        entity_type="academic_periods",
        natural_key=key,
        action="UNCHANGED",
        incoming_data=incoming,
        existing_obj=existing,
        source_sheet=sheet,
        source_row=row,
    )


def classify_contract_type(
    session: Session,
    incoming: dict[str, Any],
) -> ClassifiedRecord:
    name = str(incoming.get("name") or "").strip()
    sheet = incoming.get("source_sheet", "LISTA INSTRUCTORES")
    row = incoming.get("source_row")

    existing = session.exec(select(ContractType).where(ContractType.name == name)).first()
    if not existing:
        return ClassifiedRecord(
            entity_type="contract_types",
            natural_key=name,
            action="CREATE",
            incoming_data=incoming,
            source_sheet=sheet,
            source_row=row,
        )

    return ClassifiedRecord(
        entity_type="contract_types",
        natural_key=name,
        action="UNCHANGED",
        incoming_data=incoming,
        existing_obj=existing,
        source_sheet=sheet,
        source_row=row,
    )


def classify_generic_global_entity(
    session: Session,
    model_cls: Any,
    lookup_field: str,
    entity_type: str,
    incoming: dict[str, Any],
) -> ClassifiedRecord:
    key_val = str(incoming.get(lookup_field) or "").strip()
    sheet = incoming.get("source_sheet")
    row = incoming.get("source_row")

    existing = session.exec(select(model_cls).where(getattr(model_cls, lookup_field) == key_val)).first()
    if not existing:
        return ClassifiedRecord(
            entity_type=entity_type,
            natural_key=key_val,
            action="CREATE",
            incoming_data=incoming,
            source_sheet=sheet,
            source_row=row,
        )

    return ClassifiedRecord(
        entity_type=entity_type,
        natural_key=key_val,
        action="UNCHANGED",
        incoming_data=incoming,
        existing_obj=existing,
        source_sheet=sheet,
        source_row=row,
    )
