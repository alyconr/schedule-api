from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session

from app.api.deps import require_roles, ROLE_READ, ROLE_WRITE
from app.db import get_session
from app.schemas.imports import (
    ImportPreviewResponse,
    ImportCommitResponse,
    TemplateInfoResponse
)
from app.services import import_service
from app.services.schedule_history_import import commit_schedule_history, preview_schedule_history

router = APIRouter(prefix="/imports", tags=["imports"])
SessionDep = Annotated[Session, Depends(get_session)]
ALLOWED_IMPORT_TYPES = ["schedule_normalized", "schedule_history"]


@router.post("/preview", response_model=ImportPreviewResponse, dependencies=[Depends(require_roles(*ROLE_WRITE))])
async def preview_import(
    session: SessionDep,
    file: UploadFile = File(...),
    import_type: str = Form(...),
    schedule_year: int | None = Form(default=None),
    schedule_quarter: int | None = Form(default=None),
) -> ImportPreviewResponse:
    filename = file.filename or ""
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Solo se admite el archivo Excel normalizado .xlsx")

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
        return preview_schedule_history(session, content, filename, schedule_year, schedule_quarter)

    try:
        preview = import_service.preview_workbook(content, filename, import_type)
        return preview
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error al analizar el archivo Excel: {str(e)}")


@router.post("/commit", response_model=ImportCommitResponse, dependencies=[Depends(require_roles(*ROLE_WRITE))])
async def commit_import(
    session: SessionDep,
    file: UploadFile = File(...),
    import_type: str = Form(...),
    mode: str = Form("upsert"),
    schedule_year: int | None = Form(default=None),
    schedule_quarter: int | None = Form(default=None),
) -> ImportCommitResponse:
    filename = file.filename or ""
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Solo se admite el archivo Excel normalizado .xlsx")

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
        return commit_schedule_history(session, content, filename, schedule_year, schedule_quarter)

    try:
        result = import_service.commit_workbook(session, content, import_type, filename=filename, mode=mode)
        return result
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=422, detail=f"Error al procesar e importar los datos: {str(e)}")


@router.get("/template-info", response_model=TemplateInfoResponse, dependencies=[Depends(require_roles(*ROLE_READ))])
def get_template_info() -> TemplateInfoResponse:
    return TemplateInfoResponse(
        supported_formats=[".xlsx"],
        supported_import_types=ALLOWED_IMPORT_TYPES,
        required_sheets=[
            "LISTA INSTRUCTORES",
            "AMBIENTES",
            "FICHAS",
            "Semaforo con RA cadena",
            "Semaforo con RA Oferta Abierta",
        ],
        optional_sheets=[]
    )
