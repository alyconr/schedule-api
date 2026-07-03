from fastapi import APIRouter

from app.api.routes import (
    health,
    schedules,
    contract_types,
    instructors,
    training_programs,
    competencies,
    learning_results,
    groups,
    environments,
    time_blocks,
    auth,
    users,
    roles,
)


api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(roles.router)
api_router.include_router(schedules.router)
api_router.include_router(contract_types.router)
api_router.include_router(instructors.router)
api_router.include_router(training_programs.router)
api_router.include_router(competencies.router)
api_router.include_router(learning_results.router)
api_router.include_router(groups.router)
api_router.include_router(environments.router)
api_router.include_router(time_blocks.router)