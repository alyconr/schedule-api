from fastapi import APIRouter

from app.api.routes import health, schedules


api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(schedules.router)
