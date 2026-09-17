from datetime import date
from decimal import Decimal
from typing import Any, Optional

from app.schemas.imports import ImportIssue
from app.services.imports.canonical import (
    build_program_code,
    build_ra_code,
    build_relation_id,
    build_topic_code,
    canonical_program_key,
    get_stable_hash,
    normalize_program_name,
)
from app.services.imports.column_resolver import (
    COLUMN_ALIASES,
    find_col_idx,
    normalize_header,
    parse_optional_decimal,
)
from app.services.imports.roman import parse_trimester_label
from app.services.imports.workbook_profile import SemaforoSheetConfig


def row_cell(row: tuple[Any, ...], idx: Optional[int]) -> Any:
    return row[idx] if idx is not None and idx < len(row) else None


def normalize_doc_type(val: Any) -> str:
    if not val:
        return "CC"
    text = str(val).strip().upper()
    valid = {"CC", "CE", "TI", "PASAPORTE", "PEP", "PPT"}
    return text if text in valid else "CC"


def normalize_env_type(val: Any) -> str:
    if not val:
        return "fisico"
    text = normalize_header(val)
    if "virtual" in text:
        return "virtual"
    if "externo" in text:
        return "externo"
    return "fisico"


def normalize_response_type(val: Any) -> Optional[str]:
    if not val:
        return None
    text = normalize_header(val)
    if "abierta" in text:
        return "oferta_abierta"
    if "cerrada" in text or "cadena" in text:
        return "cadena"
    return None


def parse_instructors_sheet(
    sheet: Any,
    normalize_contract_type_fn: Any,
    vinculation_category_fn: Any,
    weekly_rule_hours_fn: Any,
    warnings: list[ImportIssue],
    errors: list[ImportIssue],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    instructors: list[dict[str, Any]] = []
    contract_types: list[dict[str, Any]] = []
    seen_instructors: set[str] = set()
    seen_contract_types: set[str] = set()

    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return instructors, contract_types
    headers = [normalize_header(c) for c in rows[0]]

    aliases = COLUMN_ALIASES["instructors"]
    nombre_idx = find_col_idx(headers, *aliases["name"])
    tipo_vinculacion_idx = find_col_idx(headers, *aliases["vinculation"])
    horas_mes_idx = find_col_idx(headers, *aliases["monthly_hours"])
    horas_add_idx = find_col_idx(headers, *aliases["additional_hours"])
    coordinacion_idx = find_col_idx(headers, *aliases["coordination"])
    doc_type_idx = find_col_idx(headers, *aliases["document_type"])
    doc_num_idx = find_col_idx(headers, *aliases["document_number"])
    specialty_idx = find_col_idx(headers, *aliases["specialty"])
    email_idx = find_col_idx(headers, *aliases["email"])
    phone_idx = find_col_idx(headers, *aliases["phone"])

    if nombre_idx is None:
        errors.append(
            ImportIssue(
                sheet=sheet.title,
                severity="error",
                message="Falta la columna obligatoria 'NOMBRE COMPLETO'.",
            )
        )
        return instructors, contract_types

    if tipo_vinculacion_idx is None:
        errors.append(
            ImportIssue(
                sheet=sheet.title,
                severity="error",
                message="Falta la columna obligatoria 'TIPO DE VINCULACION'.",
            )
        )
        return instructors, contract_types

    if horas_mes_idx is None:
        errors.append(
            ImportIssue(
                sheet=sheet.title,
                severity="error",
                message="Falta la columna obligatoria 'HORAS FORMACION MES'.",
            )
        )
        return instructors, contract_types

    if horas_add_idx is None:
        warnings.append(
            ImportIssue(
                sheet=sheet.title,
                entity="instructor",
                severity="warning",
                message="No se encontró HORAS ADICIONALES; se usará 0.",
            )
        )

    for row_num, row in enumerate(rows[1:], start=2):
        if not any(cell is not None and str(cell).strip() for cell in row):
            continue

        name_raw = row_cell(row, nombre_idx)
        name = str(name_raw or "").strip()
        if not name:
            errors.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="instructor",
                    severity="error",
                    message="NOMBRE COMPLETO es obligatorio.",
                )
            )
            continue

        parts = name.split()
        first_name = " ".join(parts[:-1]) if len(parts) > 1 else name
        last_name = parts[-1] if len(parts) > 1 else "PENDIENTE"

        # Document Number Priority:
        # 1. Real NUMERO if present
        # 2. TEMP-{get_stable_hash(name)} with warning
        raw_doc = str(row_cell(row, doc_num_idx) or "").strip()
        raw_doc_type = row_cell(row, doc_type_idx)
        doc_type = normalize_doc_type(raw_doc_type)

        if raw_doc:
            doc_num = raw_doc
        else:
            doc_num = f"TEMP-{get_stable_hash(name)}"
            warnings.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="instructor",
                    severity="warning",
                    message=f"Instructor sin documento. Se generó documento temporal: {doc_num}",
                    raw_value=name,
                )
            )

        # Email Priority:
        # 1. Real CORREO if present
        # 2. Temporal email with warning
        raw_email = str(row_cell(row, email_idx) or "").strip()
        if raw_email and "@" in raw_email:
            email = raw_email
        else:
            email_prefix = normalize_header(name).strip("_") or doc_num.lower()
            email = f"{email_prefix}@pendiente.sena.local"
            if not raw_email:
                warnings.append(
                    ImportIssue(
                        sheet=sheet.title,
                        row=row_num,
                        entity="instructor",
                        severity="warning",
                        message=f"Instructor sin correo. Se generó correo temporal: {email}",
                        raw_value=name,
                    )
                )

        phone = str(row_cell(row, phone_idx) or "").strip() or None
        specialty = str(row_cell(row, specialty_idx) or "").strip() or None

        raw_vinculation = row_cell(row, tipo_vinculacion_idx)
        vinculation_name = " ".join(str(raw_vinculation or "OTRO").strip().upper().split())
        category = vinculation_category_fn(vinculation_name)
        weekly_rule_hours = weekly_rule_hours_fn(vinculation_name)

        monthly_training_hours = (
            parse_optional_decimal(
                row_cell(row, horas_mes_idx),
                sheet.title,
                row_num,
                "instructor",
                warnings,
                "HORAS FORMACION MES",
            )
            or Decimal("0")
        )

        monthly_additional_hours = (
            parse_optional_decimal(
                row_cell(row, horas_add_idx),
                sheet.title,
                row_num,
                "instructor",
                warnings,
                "HORAS ADICIONALES",
            )
            or Decimal("0")
        )

        area = str(row_cell(row, coordinacion_idx) or "").strip()
        if not area:
            warnings.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="instructor",
                    severity="warning",
                    message="Instructor sin coordinación.",
                    raw_value=name,
                )
            )

        if category == "otro":
            warnings.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="instructor",
                    severity="warning",
                    message="Tipo de vinculación no reconocido; se usará OTRO.",
                    raw_value=str(raw_vinculation),
                )
            )

        if vinculation_name not in seen_contract_types:
            contract_types.append(
                {
                    "name": vinculation_name[:50],
                    "description": f"Tipo de vinculacion importado: {vinculation_name}"[:200],
                    "category": category,
                    "monthly_training_hours": monthly_training_hours,
                    "monthly_additional_hours": monthly_additional_hours,
                    "weekly_base_hours": weekly_rule_hours,
                    "weekly_max_hours": weekly_rule_hours,
                    "source_label": vinculation_name[:100],
                }
            )
            seen_contract_types.add(vinculation_name)

        if doc_num not in seen_instructors:
            instructors.append(
                {
                    "document_type": doc_type[:20],
                    "document_number": doc_num[:30],
                    "first_name": first_name[:100],
                    "last_name": last_name[:100],
                    "email": email[:200],
                    "phone": phone[:20] if phone else None,
                    "specialty": specialty[:200] if specialty else None,
                    "monthly_training_hours": monthly_training_hours,
                    "monthly_additional_hours": monthly_additional_hours,
                    "weekly_base_hours": weekly_rule_hours,
                    "weekly_max_hours": weekly_rule_hours,
                    "area": area[:100] if area else None,
                    "contract_type_name": vinculation_name[:50],
                    "contract_type_category": category,
                    "contract_type_base_hours": weekly_rule_hours,
                    "contract_type_max_hours": weekly_rule_hours,
                }
            )
            seen_instructors.add(doc_num)

    return instructors, contract_types


def parse_environments_sheet(
    sheet: Any,
    warnings: list[ImportIssue],
    errors: list[ImportIssue],
) -> list[dict[str, Any]]:
    environments: list[dict[str, Any]] = []
    seen: set[str] = set()

    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return environments
    headers = [normalize_header(c) for c in rows[0]]

    aliases = COLUMN_ALIASES["environments"]
    code_idx = find_col_idx(headers, *aliases["code"])
    name_idx = find_col_idx(headers, *aliases["name"])
    sede_idx = find_col_idx(headers, *aliases["sede"])
    cap_idx = find_col_idx(headers, *aliases["capacity"])
    tipo_idx = find_col_idx(headers, *aliases["environment_type"])
    coord_idx = find_col_idx(headers, *aliases["coordination"])

    if code_idx is None:
        errors.append(
            ImportIssue(
                sheet=sheet.title,
                severity="error",
                message="Falta la columna obligatoria 'NUMERO' en AMBIENTES.",
            )
        )
        return environments

    for row_num, row in enumerate(rows[1:], start=2):
        if not any(cell is not None and str(cell).strip() for cell in row):
            continue

        code = str(row_cell(row, code_idx) or "").strip()
        if not code:
            errors.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="environment",
                    severity="error",
                    message="NUMERO es obligatorio para cada ambiente.",
                )
            )
            continue

        raw_name = str(row_cell(row, name_idx) or "").strip()
        sede = str(row_cell(row, sede_idx) or "").strip()

        if raw_name:
            name = raw_name
        elif sede:
            name = f"Ambiente {code} - {sede}"
        else:
            name = f"Ambiente {code}"

        location = sede or raw_name or f"Ambiente {code}"

        # Capacity parsing
        raw_cap = row_cell(row, cap_idx)
        capacity = 0
        if raw_cap is not None:
            try:
                capacity = max(0, int(float(str(raw_cap).replace(",", "."))))
            except Exception:
                warnings.append(
                    ImportIssue(
                        sheet=sheet.title,
                        row=row_num,
                        entity="environment",
                        severity="warning",
                        message=f"Capacidad no válida '{raw_cap}'; se usará 0.",
                        raw_value=str(raw_cap),
                    )
                )

        raw_tipo = row_cell(row, tipo_idx)
        env_type = normalize_env_type(raw_tipo)

        notes_parts = []
        raw_coord = row_cell(row, coord_idx)
        if raw_coord:
            notes_parts.append(f"Coordinacion: {raw_coord}")
        if sede and sede != location:
            notes_parts.append(f"Sede: {sede}")

        if code not in seen:
            environments.append(
                {
                    "code": code[:50],
                    "name": name[:200],
                    "location": location[:200],
                    "capacity": capacity,
                    "environment_type": env_type[:30],
                    "notes": " | ".join(notes_parts) if notes_parts else None,
                }
            )
            seen.add(code)

    return environments


def parse_groups_sheet(
    sheet: Any,
    parse_excel_date_fn: Any,
    warnings: list[ImportIssue],
    errors: list[ImportIssue],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, str]]:
    groups: list[dict[str, Any]] = []
    programs: list[dict[str, Any]] = []
    program_scope_map: dict[str, str] = {}
    seen_groups: set[str] = set()
    seen_programs: set[str] = set()

    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return groups, programs, program_scope_map
    headers = [normalize_header(c) for c in rows[0]]

    aliases = COLUMN_ALIASES["groups"]
    code_idx = find_col_idx(headers, *aliases["code"])
    name_idx = find_col_idx(headers, *aliases["name"])
    level_idx = find_col_idx(headers, *aliases["level"])
    tri_idx = find_col_idx(headers, *aliases["trimester"])
    start_idx = find_col_idx(headers, *aliases["start_date"])
    end_idx = find_col_idx(headers, *aliases["end_date"])
    prod_start_idx = find_col_idx(headers, *aliases["productive_start"])
    prod_end_idx = find_col_idx(headers, *aliases["productive_end"])
    jornada_idx = find_col_idx(headers, *aliases["jornada"])
    modality_idx = find_col_idx(headers, *aliases["modality"])
    coord_idx = find_col_idx(headers, *aliases["coordination"])
    sede_idx = find_col_idx(headers, *aliases["sede"])
    resp_idx = find_col_idx(headers, *aliases["response_type"])
    empresa_idx = find_col_idx(headers, *aliases["empresa"])
    jornada_esp_idx = find_col_idx(headers, *aliases["jornada_especifica"])
    duracion_idx = find_col_idx(headers, *aliases["duracion_meses"])

    if code_idx is None:
        errors.append(
            ImportIssue(
                sheet=sheet.title,
                severity="error",
                message="Falta la columna obligatoria 'No. FICHA'.",
            )
        )
        return groups, programs, program_scope_map

    if name_idx is None:
        errors.append(
            ImportIssue(
                sheet=sheet.title,
                severity="error",
                message="Falta la columna obligatoria de nombre de programa/ficha.",
            )
        )
        return groups, programs, program_scope_map

    for row_num, row in enumerate(rows[1:], start=2):
        if not any(cell is not None and str(cell).strip() for cell in row):
            continue

        code = str(row_cell(row, code_idx) or "").strip()
        if not code:
            errors.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="group",
                    severity="error",
                    message="No. FICHA es obligatorio.",
                )
            )
            continue

        raw_name = str(row_cell(row, name_idx) or f"Ficha {code}").strip()
        program_name = normalize_program_name(raw_name)
        program_code = build_program_code(program_name)
        canonical_key = canonical_program_key(program_name)

        level = str(row_cell(row, level_idx) or "").strip()
        if program_code not in seen_programs:
            programs.append(
                {
                    "code": program_code,
                    "name": program_name[:300],
                    "level": level[:100] or None,
                }
            )
            seen_programs.add(program_code)

        trimester_label, _ = parse_trimester_label(row_cell(row, tri_idx))
        if not trimester_label:
            errors.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="group",
                    severity="error",
                    message="TRIMESTRE es obligatorio para cada ficha.",
                    raw_value=code,
                )
            )
            continue

        jornada = str(row_cell(row, jornada_idx) or "").strip()
        if not jornada:
            warnings.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="group",
                    severity="warning",
                    message="Ficha sin jornada.",
                    raw_value=code,
                )
            )

        modality = str(row_cell(row, modality_idx) or "").strip() or None

        # Build offer type / scope index
        raw_response = row_cell(row, resp_idx)
        scope = normalize_response_type(raw_response)
        if scope and canonical_key:
            if canonical_key in program_scope_map and program_scope_map[canonical_key] != scope:
                warnings.append(
                    ImportIssue(
                        sheet=sheet.title,
                        row=row_num,
                        entity="group",
                        severity="warning",
                        message=(
                            f"El programa '{program_name}' tiene múltiples fichas con tipos de respuesta "
                            f"distintos ({program_scope_map[canonical_key]} vs {scope}). Se mantendrá {program_scope_map[canonical_key]}."
                        ),
                        raw_value=code,
                    )
                )
            else:
                program_scope_map[canonical_key] = scope

        # Structured notes
        notes = []
        coord = str(row_cell(row, coord_idx) or "").strip()
        if coord:
            notes.append(f"Coordinación: {coord}")
        sede = str(row_cell(row, sede_idx) or "").strip()
        if sede:
            notes.append(f"Sede: {sede}")
        jornada_esp = str(row_cell(row, jornada_esp_idx) or "").strip()
        if jornada_esp:
            notes.append(f"Jornada específica: {jornada_esp}")
        if raw_response:
            notes.append(f"Tipo de respuesta: {raw_response}")
        empresa = str(row_cell(row, empresa_idx) or "").strip()
        if empresa:
            notes.append(f"Empresa: {empresa}")
        duracion = str(row_cell(row, duracion_idx) or "").strip()
        if duracion:
            notes.append(f"Duración meses: {duracion}")

        prod_start = parse_excel_date_fn(row_cell(row, prod_start_idx))
        prod_end = parse_excel_date_fn(row_cell(row, prod_end_idx))
        start_date = parse_excel_date_fn(row_cell(row, start_idx))
        end_date = parse_excel_date_fn(row_cell(row, end_idx))

        if code not in seen_groups:
            groups.append(
                {
                    "code": code[:50],
                    "name": raw_name[:300],
                    "jornada": jornada[:50] if jornada else None,
                    "modality": modality[:50] if modality else None,
                    "trimester": trimester_label[:50],
                    "start_date": start_date,
                    "end_date": end_date,
                    "productive_stage_start_date": prod_start,
                    "productive_stage_end_date": prod_end,
                    "learners_count": 0,
                    "notes": " | ".join(notes) if notes else None,
                    "training_program_code": program_code,
                }
            )
            seen_groups.add(code)

    return groups, programs, program_scope_map


def parse_academic_periods_sheet(
    sheet: Any,
    parse_excel_date_fn: Any,
    warnings: list[ImportIssue],
    errors: list[ImportIssue],
) -> list[dict[str, Any]]:
    periods: list[dict[str, Any]] = []
    seen: set[tuple[int, int]] = set()

    rows = list(sheet.iter_rows(values_only=True))
    if len(rows) < 2:
        return periods
    headers = [normalize_header(c) for c in rows[0]]

    aliases = COLUMN_ALIASES["academic_periods"]
    name_idx = find_col_idx(headers, *aliases["name"])
    start_idx = find_col_idx(headers, *aliases["start_date"])
    end_idx = find_col_idx(headers, *aliases["end_date"])

    if name_idx is None or start_idx is None or end_idx is None:
        warnings.append(
            ImportIssue(
                sheet=sheet.title,
                entity="academic_period",
                severity="warning",
                message="La hoja TRIMESTRE no contiene las columnas esperadas (Nombre, Fecha Inicio, Fecha Fin).",
            )
        )
        return periods

    for row_num, row in enumerate(rows[1:], start=2):
        if not any(cell is not None and str(cell).strip() for cell in row):
            continue

        raw_name = str(row_cell(row, name_idx) or "").strip()
        start_date = parse_excel_date_fn(row_cell(row, start_idx))
        end_date = parse_excel_date_fn(row_cell(row, end_idx))

        if not raw_name or not start_date or not end_date:
            warnings.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="academic_period",
                    severity="warning",
                    message="Fila de periodo académico incompleta; se omitirá.",
                    raw_value=raw_name,
                )
            )
            continue

        _, quarter_number = parse_trimester_label(raw_name)
        if quarter_number is None:
            warnings.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="academic_period",
                    severity="warning",
                    message=f"No se pudo determinar el número de trimestre para '{raw_name}'.",
                    raw_value=raw_name,
                )
            )
            continue

        year = start_date.year
        period_key = (year, quarter_number)
        if period_key not in seen:
            periods.append(
                {
                    "year": year,
                    "quarter_number": quarter_number,
                    "name": raw_name[:100],
                    "start_date": start_date,
                    "end_date": end_date,
                    "is_active": True,
                }
            )
            seen.add(period_key)

    return periods


def parse_semaforo_sheet(
    sheet: Any,
    config: SemaforoSheetConfig,
    program_scope_map: dict[str, str],
    programs_list: list[dict[str, Any]],
    learning_results_list: list[dict[str, Any]],
    topics_list: list[dict[str, Any]],
    relations_list: list[dict[str, Any]],
    seen_programs: set[str],
    seen_ras: set[str],
    seen_topics: set[str],
    seen_relations: set[str],
    warnings: list[ImportIssue],
    errors: list[ImportIssue],
) -> None:
    """
    Generic parser for any semaforo matrix sheet (TEC CADENA, TEC REGULAR, TECNICO, AUXILIAR, or v1 legacy).
    Transforms all rows into standard canonical entities.
    """
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return
    headers = [normalize_header(c) for c in rows[0]]

    aliases = COLUMN_ALIASES["semaforos"]
    prog_idx = find_col_idx(headers, *aliases["program_name"])
    tri_idx = find_col_idx(headers, *aliases["trimester"])
    ra_desc_idx = find_col_idx(headers, *aliases["ra_description"])
    ra_type_idx = find_col_idx(headers, *aliases["ra_type"])
    ra_week_idx = find_col_idx(headers, *aliases["ra_week_hours"])
    ra_trim_idx = find_col_idx(headers, *aliases["ra_trimester_hours"])
    topic_idx = find_col_idx(headers, *aliases["topic_name"])
    topic_week_idx = find_col_idx(headers, *aliases["topic_week_hours"])

    if prog_idx is None:
        errors.append(
            ImportIssue(
                sheet=sheet.title,
                severity="error",
                message=f"Falta la columna de PROGRAMA DE FORMACION en '{sheet.title}'.",
            )
        )
        return

    if ra_desc_idx is None:
        errors.append(
            ImportIssue(
                sheet=sheet.title,
                severity="error",
                message=f"Falta la columna de RESULTADO_APRENDIZAJE en '{sheet.title}'.",
            )
        )
        return

    for row_num, row in enumerate(rows[1:], start=2):
        if not any(cell is not None and str(cell).strip() for cell in row):
            continue

        raw_prog = row_cell(row, prog_idx)
        program_name = normalize_program_name(raw_prog)
        if not program_name:
            errors.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="program",
                    severity="error",
                    message="PROGRAMA DE FORMACION es obligatorio.",
                )
            )
            continue

        program_code = build_program_code(program_name)
        canonical_key = canonical_program_key(program_name)

        if program_code not in seen_programs:
            programs_list.append(
                {
                    "code": program_code,
                    "name": program_name[:300],
                    "level": config.level,
                }
            )
            seen_programs.add(program_code)

        trimester_label, trimester_number = parse_trimester_label(row_cell(row, tri_idx))

        # Determine program scope
        if config.scope_strategy == "fixed":
            scope = config.scope
        else:
            # Derive scope from groups/fichas processed earlier
            scope = program_scope_map.get(canonical_key)
            if not scope:
                scope = "oferta_abierta"
                warnings.append(
                    ImportIssue(
                        sheet=sheet.title,
                        row=row_num,
                        entity="learning_result",
                        severity="warning",
                        message=(
                            f"No se pudo determinar el tipo de oferta para el programa '{program_name}' "
                            f"desde FICHAS; se usará 'oferta_abierta'."
                        ),
                        raw_value=program_name,
                    )
                )

        ra_description = str(row_cell(row, ra_desc_idx) or "").strip()
        if not ra_description:
            errors.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="learning_result",
                    severity="error",
                    message="RESULTADO_APRENDIZAJE es obligatorio.",
                )
            )
            continue

        # Safe parsing of hours (handles #NAME? and other formula errors gracefully)
        ra_trim_hours = parse_optional_decimal(
            row_cell(row, ra_trim_idx),
            sheet.title,
            row_num,
            "learning_result",
            warnings,
            "HORAS_TRIMESTRE_RA",
        )
        ra_week_hours = parse_optional_decimal(
            row_cell(row, ra_week_idx),
            sheet.title,
            row_num,
            "learning_result",
            warnings,
            "HORAS_SEMANA_RA",
        )
        ra_hours = ra_trim_hours if ra_trim_hours is not None else ra_week_hours

        ra_code = build_ra_code(
            program_code,
            scope,
            trimester_number,
            ra_description,
            prefix=config.prefix,
            trimester_label=trimester_label,
        )

        raw_ra_type = row_cell(row, ra_type_idx)
        ra_type = str(raw_ra_type or "semaforo_normalizado").strip()[:50]

        if ra_code not in seen_ras:
            learning_results_list.append(
                {
                    "code": ra_code,
                    "description": ra_description[:500],
                    "estimated_hours": ra_hours,
                    "result_type": ra_type,
                }
            )
            seen_ras.add(ra_code)

        topic_name = str(row_cell(row, topic_idx) or "").strip()
        if not topic_name:
            warnings.append(
                ImportIssue(
                    sheet=sheet.title,
                    row=row_num,
                    entity="learning_result",
                    severity="warning",
                    message="RA sin temática relacionada.",
                    raw_value=ra_description,
                )
            )
            continue

        topic_week_hours = parse_optional_decimal(
            row_cell(row, topic_week_idx),
            sheet.title,
            row_num,
            "topic",
            warnings,
            "HORAS_SEMANA_TEMATICA",
        )

        topic_code = build_topic_code(
            program_code,
            scope,
            trimester_number,
            topic_name,
            prefix=config.prefix,
            trimester_label=trimester_label,
        )

        if topic_code not in seen_topics:
            topics_list.append(
                {
                    "code": topic_code,
                    "name": topic_name[:500],
                    "description": topic_name[:500],
                    "program_scope": scope,
                    "trimester": trimester_label,
                    "trimester_number": trimester_number,
                    "estimated_hours": topic_week_hours,
                    "source_sheet": sheet.title,
                    "source_address": f"{row_num}",
                    "source_row": row_num,
                    "source_col": topic_idx + 1 if topic_idx is not None else None,
                    "color_key": None,
                    "color_hex": None,
                }
            )
            seen_topics.add(topic_code)

        relation_id = build_relation_id(
            program_code,
            scope,
            trimester_number,
            ra_description,
            topic_name,
            prefix=config.prefix,
            trimester_label=trimester_label,
        )

        if relation_id not in seen_relations:
            relations_list.append(
                {
                    "relation_id": relation_id,
                    "group_id": f"{program_code}-{config.prefix}-T{trimester_number or 0}"[:80],
                    "training_program_code": program_code,
                    "training_program_name": program_name[:300],
                    "learning_result_code": ra_code,
                    "topic_code": topic_code,
                    "program_scope": scope,
                    "trimester_number": trimester_number,
                    "color_key": None,
                    "color_hex": None,
                    "relation_method": "normalized_excel_program_rap_topic_relation_without_color",
                    "relation_status": "OK",
                    "confidence": "alta",
                    "needs_manual_review": False,
                }
            )
            seen_relations.add(relation_id)
