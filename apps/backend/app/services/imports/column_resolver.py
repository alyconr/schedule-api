from decimal import Decimal
import re
from typing import Any, Optional
import unicodedata

from app.schemas.imports import ImportIssue


def normalize_header(value: Any) -> str:
    """Normalize header text into lowercase snake_case without accents or special chars."""
    if value is None:
        return ""
    s = str(value).strip().lower()
    s = "".join(
        c for c in unicodedata.normalize("NFD", s)
        if unicodedata.category(c) != "Mn"
    )
    s = re.sub(r"[\s\-]+", "_", s)
    s = re.sub(r"[^\w_]", "", s)
    return s


def find_col_idx(headers: list[str], *keys: str) -> Optional[int]:
    """Find column index matching any of the candidate keys with exact, prefix, or substring precedence."""
    for key in keys:
        for i, h in enumerate(headers):
            if h == key:
                return i
    for key in keys:
        for i, h in enumerate(headers):
            if h.startswith(key):
                return i
    for key in keys:
        for i, h in enumerate(headers):
            if key in h:
                return i
    return None


EXCEL_FORMULA_ERRORS = (
    "#NAME?",
    "#VALUE!",
    "#REF!",
    "#DIV/0!",
    "#NUM!",
    "#N/A",
    "#NULL!",
)


def parse_optional_decimal(
    value: Any,
    sheet: str,
    row: int,
    entity: str,
    warnings: list[ImportIssue],
    field_name: str = "HORAS",
) -> Optional[Decimal]:
    """
    Parse a numeric/decimal value safely.
    If the cell contains an Excel formula error (e.g. #NAME?), returns None and appends a warning.
    If the cell is empty or None, returns None without error.
    If valid, returns Decimal.
    """
    if value is None:
        return None
    val_str = str(value).strip()
    if not val_str:
        return None

    # Check for Excel formula errors
    val_upper = val_str.upper()
    for err in EXCEL_FORMULA_ERRORS:
        if err in val_upper:
            warnings.append(
                ImportIssue(
                    sheet=sheet,
                    row=row,
                    entity=entity,
                    severity="warning",
                    message=f"{field_name} contiene un error de fórmula Excel ({val_str}); se importará como nulo.",
                    raw_value=val_str,
                )
            )
            return None

    try:
        cleaned = val_str.replace(",", ".")
        return Decimal(cleaned)
    except Exception:
        warnings.append(
            ImportIssue(
                sheet=sheet,
                row=row,
                entity=entity,
                severity="warning",
                message=f"{field_name} contiene un valor no numérico '{val_str}'; se importará como nulo.",
                raw_value=val_str,
            )
        )
        return None


COLUMN_ALIASES: dict[str, dict[str, tuple[str, ...]]] = {
    "instructors": {
        "name": ("nombre_completo", "nombre"),
        "vinculation": ("tipo_de_vinculacion", "tipo_vinculacion", "tipo_contrato", "contrato"),
        "monthly_hours": ("horas_formacion_mes", "horas_formacion", "horasfromacion", "horas_mes"),
        "additional_hours": ("horas_adicionales", "adicionales"),
        "coordination": ("coordinacion",),
        "document_type": ("tipo", "tipo_documento", "tipo_doc"),
        "document_number": ("numero", "numero_documento", "num_doc", "documento", "cedula"),
        "specialty": ("especilialidad_o_area", "especialidad_o_area", "especialidad", "area"),
        "email": ("correo", "email", "correo_electronico"),
        "phone": ("telefono", "celular", "tel"),
    },
    "environments": {
        "code": ("numero", "num", "codigo"),
        "sede": ("sede", "ubicacion"),
        "name": ("ambiente_o_ubicacion", "ambiente", "nombre"),
        "capacity": ("capacidad", "aforo"),
        "environment_type": ("tipo", "tipo_de_ambiente", "tipo_ambiente"),
        "coordination": ("coordinacion",),
    },
    "groups": {
        "code": ("no_ficha", "no_fichas", "numero_ficha", "ficha_num"),
        "name": ("nombre_del_programa_de_formacion", "nombre_programa_formacion", "ficha", "programa"),
        "level": ("nivel",),
        "trimester": ("trimestre",),
        "start_date": ("fecha_inicio", "inicio_lectiva", "fecha_inicio_lectiva"),
        "end_date": ("fecha_fin_lectiva", "fin_de_etapa_lectiva", "fin_lectiva", "fecha_fin"),
        "productive_start": ("fecha_inicio_productiva", "inicio_productiva"),
        "productive_end": ("fecha_fin_productiva", "fin_productiva"),
        "jornada": ("jornada",),
        "modality": ("modalidad",),
        "coordination": ("coordinacion",),
        "sede": ("sede",),
        "response_type": ("tipo_de_respuesta", "tipo_respuesta"),
        "empresa": ("empresa",),
        "jornada_especifica": ("jornada_especifica",),
        "duracion_meses": ("duracion_en_meses", "duracion_meses"),
    },
    "academic_periods": {
        "name": ("nombre", "trimestre", "periodo"),
        "start_date": ("fecha_inicio", "inicio"),
        "end_date": ("fecha_fin", "fin"),
    },
    "semaforos": {
        "program_name": ("programa_de_formacion", "programa_formacion", "programa"),
        "trimester": ("trimestre",),
        "ra_description": ("resultado_aprendizaje", "resultado_de_aprendizaje"),
        "ra_type": (
            "tipo_resultado_ra",
            "tipo_resultado_racompletoparcial",
            "tipo_resultado_ra_completo_parcial",
            "tipo_de_resultado_ra",
        ),
        "ra_week_hours": ("horas_semana_ra", "horas_semanales_ra"),
        "ra_trimester_hours": ("horas_trimestre_ra", "horas_trimestrales_ra"),
        "topic_name": ("tematica", "tema"),
        "topic_type": (
            "tipo_resultado_tematica",
            "tipo_resultado_tematica_completoparcial",
            "tipo_resultado_tematica_completo_parcial",
        ),
        "topic_week_hours": ("horas_semana_tematica", "horas_semanales_tematica"),
    },
}
