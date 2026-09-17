from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from app.api.deps import (
    AccessScopeDep,
    CurrentUserDep,
    require_roles,
    ROLE_READ,
    ROLE_WRITE,
    SessionDep,
)
from app.models import Coordination, ImportBatch, ImportBatchRecord
from app.schemas.imports import (
    ImportBatchDetailRead,
    ImportBatchRead,
    ImportCommitResponse,
    ImportPreviewResponse,
    TemplateInfoResponse,
)
from app.services import import_service
from app.services.schedule_history_import import commit_schedule_history, preview_schedule_history

router = APIRouter(prefix="/imports", tags=["imports"])
ALLOWED_IMPORT_TYPES = ["schedule_normalized", "schedule_history"]


@router.post("/preview", response_model=ImportPreviewResponse, dependencies=[Depends(require_roles(*ROLE_WRITE))])
async def preview_import(
    session: SessionDep,
    scope: AccessScopeDep,
    file: UploadFile = File(...),
    import_type: str = Form(...),
    coordination_id: int | None = Form(default=None),
    schedule_year: int | None = Form(default=None),
    schedule_quarter: int | None = Form(default=None),
) -> ImportPreviewResponse:
    filename = file.filename or ""
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=400,
            detail="Formato de archivo no soportado. Solo se admite el archivo Excel normalizado .xlsx",
        )

    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {str(e)}")

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo excede el tamaño límite de 10 MB.")

    if import_type not in ALLOWED_IMPORT_TYPES:
        raise HTTPException(status_code=400, detail=f"Tipo de importación inválido: {import_type}")

    if import_type == "schedule_history":
        if schedule_year is None or not 2000 <= schedule_year <= 2100 or schedule_quarter not in {1, 2, 3, 4}:
            raise HTTPException(status_code=422, detail="Debe seleccionar año y trimestre para el histórico")
        if coordination_id is not None and not scope.can_access(coordination_id):
            raise HTTPException(status_code=403, detail="No tiene permisos sobre la coordinación especificada")
        return preview_schedule_history(session, content, filename, schedule_year, schedule_quarter)

    # schedule_normalized scope validation
    if not scope.is_global and coordination_id is None:
        raise HTTPException(
            status_code=422,
            detail="Debe seleccionar una coordinación activa para la importación.",
        )

    if coordination_id is not None:
        if not scope.can_access(coordination_id):
            raise HTTPException(
                status_code=403,
                detail="No tiene permisos sobre la coordinación especificada.",
            )
        coord = session.get(Coordination, coordination_id)
        if not coord or not coord.is_active:
            raise HTTPException(status_code=404, detail="Coordinación no encontrada o inactiva.")

    try:
        preview = import_service.preview_import_for_coordination(
            session=session,
            file_bytes=content,
            filename=filename,
            import_type=import_type,
            coordination_id=coordination_id,
            is_global=scope.is_global,
        )
        return preview
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error al analizar el archivo Excel: {str(e)}")


@router.post("/commit", response_model=ImportCommitResponse, dependencies=[Depends(require_roles(*ROLE_WRITE))])
async def commit_import(
    session: SessionDep,
    scope: AccessScopeDep,
    current_user: CurrentUserDep,
    file: UploadFile = File(...),
    import_type: str = Form(...),
    coordination_id: int | None = Form(default=None),
    mode: str = Form("safe_merge"),
    schedule_year: int | None = Form(default=None),
    schedule_quarter: int | None = Form(default=None),
) -> ImportCommitResponse:
    filename = file.filename or ""
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=400,
            detail="Formato de archivo no soportado. Solo se admite el archivo Excel normalizado .xlsx",
        )

    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {str(e)}")

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    if import_type not in ALLOWED_IMPORT_TYPES:
        raise HTTPException(status_code=400, detail=f"Tipo de importación inválido: {import_type}")

    if import_type == "schedule_history":
        if schedule_year is None or not 2000 <= schedule_year <= 2100 or schedule_quarter not in {1, 2, 3, 4}:
            raise HTTPException(status_code=422, detail="Debe seleccionar año y trimestre para el histórico")
        if coordination_id is not None and not scope.can_access(coordination_id):
            raise HTTPException(status_code=403, detail="No tiene permisos sobre la coordinación especificada")
        return commit_schedule_history(session, content, filename, schedule_year, schedule_quarter)

    # schedule_normalized scope validation
    if not scope.is_global and coordination_id is None:
        raise HTTPException(
            status_code=422,
            detail="Debe seleccionar una coordinación activa para la importación.",
        )

    if coordination_id is not None:
        if not scope.can_access(coordination_id):
            raise HTTPException(
                status_code=403,
                detail="No tiene permisos sobre la coordinación especificada.",
            )
        coord = session.get(Coordination, coordination_id)
        if not coord or not coord.is_active:
            raise HTTPException(status_code=404, detail="Coordinación no encontrada o inactiva.")

    try:
        result = import_service.commit_workbook_for_coordination(
            session=session,
            file_bytes=content,
            import_type=import_type,
            coordination_id=coordination_id,
            user_id=current_user.id,
            filename=filename,
            mode=mode,
            is_global=scope.is_global,
        )
        return result
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=422, detail=f"Error al procesar e importar los datos: {str(e)}")


@router.get("/history", response_model=list[ImportBatchRead], dependencies=[Depends(require_roles(*ROLE_READ))])
def get_import_history(
    session: SessionDep,
    scope: AccessScopeDep,
    limit: int = 50,
    offset: int = 0,
) -> list[ImportBatchRead]:
    stmt = select(ImportBatch).order_by(ImportBatch.created_at.desc()).offset(offset).limit(limit)
    if not scope.is_global:
        if not scope.coordination_ids:
            return []
        stmt = stmt.where(ImportBatch.coordination_id.in_(scope.coordination_ids))
    batches = session.exec(stmt).all()
    return [ImportBatchRead.model_validate(b) for b in batches]


@router.get("/history/{batch_id}", response_model=ImportBatchDetailRead, dependencies=[Depends(require_roles(*ROLE_READ))])
def get_import_batch_detail(
    batch_id: int,
    session: SessionDep,
    scope: AccessScopeDep,
) -> ImportBatchDetailRead:
    batch = session.get(ImportBatch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Lote de importación no encontrado.")
    if not scope.can_access(batch.coordination_id):
        raise HTTPException(status_code=403, detail="No tiene acceso a los registros de esta coordinación.")
    records = session.exec(
        select(ImportBatchRecord).where(ImportBatchRecord.batch_id == batch_id).order_by(ImportBatchRecord.id.asc()).limit(200)
    ).all()
    detail = ImportBatchDetailRead.model_validate(batch)
    detail.records = [r.model_dump() for r in records]
    return detail


@router.get("/template-info", response_model=TemplateInfoResponse, dependencies=[Depends(require_roles(*ROLE_READ))])
def get_template_info() -> TemplateInfoResponse:
    return TemplateInfoResponse(
        supported_formats=[".xlsx"],
        supported_import_types=ALLOWED_IMPORT_TYPES,
        required_sheets=[
            "LISTA INSTRUCTORES",
            "AMBIENTES",
            "FICHAS",
        ],
        optional_sheets=[
            "TRIMESTRE",
            "TEC CADENA",
            "TEC REGULAR",
            "TECNICO",
            "AUXILIAR",
        ],
    )
