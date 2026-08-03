from datetime import date

from fastapi import HTTPException


def quarter_for_date(value: date) -> int:
    """Return the calendar quarter for a date."""
    return ((value.month - 1) // 3) + 1


def validate_schedule_period(value: date, year: int, quarter: int) -> None:
    """Reject a schedule date that does not belong to its selected period."""
    if value.year != year or quarter_for_date(value) != quarter:
        raise HTTPException(
            status_code=422,
            detail=(
                f"La fecha {value.isoformat()} no pertenece al trimestre "
                f"{quarter} del año {year}."
            ),
        )
