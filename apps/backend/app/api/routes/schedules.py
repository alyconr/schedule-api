from fastapi import APIRouter

from app.schemas.schedules import ScheduleValidationRequest, ScheduleValidationResponse
from app.services.schedule_validation import validate_schedule


router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.post("/validate", response_model=ScheduleValidationResponse)
def validate_schedule_draft(payload: ScheduleValidationRequest) -> ScheduleValidationResponse:
    return ScheduleValidationResponse(**validate_schedule(payload.model_dump()))
