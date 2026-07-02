from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.core.config import get_settings
from app.db import get_session
from app.schemas.health import DatabaseHealthResponse, HealthResponse


router = APIRouter(prefix="/health", tags=["health"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=HealthResponse)
def read_health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        environment=settings.app_env,
        database_configured=bool(settings.database_url),
    )


@router.get("/db", response_model=DatabaseHealthResponse)
def read_database_health(session: SessionDep) -> DatabaseHealthResponse:
    try:
        session.exec(text("SELECT 1")).one()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="database unavailable") from exc
    return DatabaseHealthResponse(status="ok")
