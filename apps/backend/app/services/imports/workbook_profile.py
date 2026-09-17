from dataclasses import dataclass, field
from typing import Any, Optional

from app.schemas.imports import ImportIssue
from app.services.imports.column_resolver import normalize_header


@dataclass(frozen=True)
class SheetDefinition:
    key: str
    aliases: tuple[str, ...]
    required: bool = True


@dataclass(frozen=True)
class SemaforoSheetConfig:
    aliases: tuple[str, ...]
    level: str
    scope: Optional[str] = None
    scope_strategy: str = "fixed"  # "fixed" or "from_groups"
    prefix: str = "CAD"


CORE_SHEET_DEFINITIONS: tuple[SheetDefinition, ...] = (
    SheetDefinition(
        key="instructors",
        aliases=("LISTA INSTRUCTORES", "LISTA_INSTRUCTORES", "INSTRUCTORES"),
        required=True,
    ),
    SheetDefinition(
        key="environments",
        aliases=("AMBIENTES", "LISTA_AMBIENTES"),
        required=True,
    ),
    SheetDefinition(
        key="groups",
        aliases=("FICHAS", "LISTA_FICHAS"),
        required=True,
    ),
    SheetDefinition(
        key="academic_periods",
        aliases=("TRIMESTRE", "TRIMESTRES", "PERIODOS_ACADEMICOS"),
        required=False,
    ),
)

V2_SEMAFORO_CONFIGS: tuple[SemaforoSheetConfig, ...] = (
    SemaforoSheetConfig(
        aliases=("TEC CADENA", "TEC_CADENA", "Semaforo con RA cadena"),
        level="tecnologo",
        scope="cadena",
        scope_strategy="fixed",
        prefix="CAD",
    ),
    SemaforoSheetConfig(
        aliases=("TEC REGULAR", "TEC_REGULAR", "Semaforo con RA Oferta Abierta"),
        level="tecnologo",
        scope="oferta_abierta",
        scope_strategy="fixed",
        prefix="OA",
    ),
    SemaforoSheetConfig(
        aliases=("TECNICO", "TECNICOS"),
        level="tecnico",
        scope=None,
        scope_strategy="from_groups",
        prefix="TEC",
    ),
    SemaforoSheetConfig(
        aliases=("AUXILIAR", "AUXILIARES"),
        level="auxiliar",
        scope=None,
        scope_strategy="from_groups",
        prefix="AUX",
    ),
)

V1_SEMAFORO_CONFIGS: tuple[SemaforoSheetConfig, ...] = (
    SemaforoSheetConfig(
        aliases=("Semaforo con RA cadena", "Semaforo_con_RA_cadena", "TEC CADENA"),
        level="tecnologo",
        scope="cadena",
        scope_strategy="fixed",
        prefix="CAD",
    ),
    SemaforoSheetConfig(
        aliases=("Semaforo con RA Oferta Abierta", "Semaforo_con_RA_Oferta_Abierta", "TEC REGULAR"),
        level="tecnologo",
        scope="oferta_abierta",
        scope_strategy="fixed",
        prefix="OA",
    ),
)


@dataclass
class ResolvedWorkbook:
    profile_name: str
    sheets: dict[str, Any] = field(default_factory=dict)
    matched_sheet_names: dict[str, str] = field(default_factory=dict)
    semaforo_sheets: list[tuple[Any, SemaforoSheetConfig]] = field(default_factory=list)


class WorkbookProfileDetector:
    """
    Detects the structure of the workbook and resolves sheets using aliases.
    Supports schedule_normalized_v2 (the institutional matrix) and schedule_normalized_v1 (legacy).
    """

    @staticmethod
    def _find_sheet(wb: Any, aliases: tuple[str, ...]) -> tuple[Optional[str], Optional[Any]]:
        normalized_map = {normalize_header(name): name for name in wb.sheetnames}
        for alias in aliases:
            norm_alias = normalize_header(alias)
            if norm_alias in normalized_map:
                real_name = normalized_map[norm_alias]
                return real_name, wb[real_name]
        return None, None

    @classmethod
    def resolve(
        cls,
        wb: Any,
        errors: list[ImportIssue],
    ) -> ResolvedWorkbook:
        sheet_names_norm = {normalize_header(name) for name in wb.sheetnames}

        # Check for core sheets
        resolved = ResolvedWorkbook(profile_name="schedule_normalized_v2")

        for sheet_def in CORE_SHEET_DEFINITIONS:
            real_name, sheet = cls._find_sheet(wb, sheet_def.aliases)
            if sheet is not None:
                resolved.sheets[sheet_def.key] = sheet
                resolved.matched_sheet_names[sheet_def.key] = real_name or ""
            elif sheet_def.required:
                primary_alias = sheet_def.aliases[0]
                errors.append(
                    ImportIssue(
                        sheet=primary_alias,
                        severity="error",
                        message=f"La hoja obligatoria '{primary_alias}' no fue encontrada.",
                    )
                )

        if errors:
            return resolved

        # Detect whether workbook is v2 or v1
        v2_indicators = {
            normalize_header(a)
            for cfg in V2_SEMAFORO_CONFIGS
            for a in cfg.aliases[:2]
        } | {"trimestre", "trimestres"}

        is_v2 = any(name in sheet_names_norm for name in v2_indicators)

        if is_v2:
            resolved.profile_name = "schedule_normalized_v2"
            configs_to_use = V2_SEMAFORO_CONFIGS
        else:
            resolved.profile_name = "schedule_normalized_v1"
            configs_to_use = V1_SEMAFORO_CONFIGS

        # Resolve semaforo sheets
        for cfg in configs_to_use:
            real_name, sheet = cls._find_sheet(wb, cfg.aliases)
            if sheet is not None:
                resolved.semaforo_sheets.append((sheet, cfg))
                resolved.matched_sheet_names[real_name or cfg.aliases[0]] = real_name or ""

        # In v1, both semaforo sheets are strictly mandatory
        if not is_v2 and len(resolved.semaforo_sheets) < 2:
            for cfg in configs_to_use:
                _, sheet = cls._find_sheet(wb, cfg.aliases)
                if sheet is None:
                    errors.append(
                        ImportIssue(
                            sheet=cfg.aliases[0],
                            severity="error",
                            message=f"La hoja obligatoria '{cfg.aliases[0]}' no fue encontrada.",
                        )
                    )

        # In v2, at least one semaforo sheet should exist
        if is_v2 and not resolved.semaforo_sheets:
            errors.append(
                ImportIssue(
                    sheet="MATRICES_SEMAFORO",
                    severity="error",
                    message="No se encontró ninguna de las matrices de semáforo requeridas (TEC CADENA, TEC REGULAR, TECNICO, AUXILIAR).",
                )
            )

        return resolved
