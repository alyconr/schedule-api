from dataclasses import dataclass
from datetime import date
from typing import Any, Optional

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.academic import AcademicPeriod


@dataclass(frozen=True)
class ResolvedPeriod:
    year: int
    quarter: int
    is_institutional: bool = False
    period_name: Optional[str] = None


def quarter_for_date(value: date) -> int:
    """Return the calendar quarter for a date."""
    return ((value.month - 1) // 3) + 1


def resolve_schedule_period(
    value: date,
    session: Optional[Session] = None,
) -> ResolvedPeriod:
    """
    Determine the year and quarter for a given date.
    If an active AcademicPeriod contains the date, returns the institutional period.
    Otherwise, falls back to the calendar quarter.
    """
    if session is not None:
        stmt = (
            select(AcademicPeriod)
            .where(AcademicPeriod.is_active == True)  # noqa: E712
            .where(AcademicPeriod.start_date <= value)
            .where(AcademicPeriod.end_date >= value)
        )
        period = session.exec(stmt).first()
        if period is not None:
            return ResolvedPeriod(
                year=period.year,
                quarter=period.quarter_number,
                is_institutional=True,
                period_name=period.name,
            )

    return ResolvedPeriod(
        year=value.year,
        quarter=quarter_for_date(value),
        is_institutional=False,
    )


def validate_schedule_period(
    arg1: Any,
    arg2: Any,
    arg3: Any = None,
    arg4: Any = None,
    session: Optional[Session] = None,
) -> None:
    """
    Reject a schedule date that does not belong to its selected period.

    Supports both calling conventions:
      - validate_schedule_period(value: date, year: int, quarter: int, session: Session = None)
      - validate_schedule_period(session: Session, value: date, year: int, quarter: int)

    Rule:
      1. If an active AcademicPeriod exists for (year, quarter), validate that
         start_date <= value <= end_date.
      2. Fallback: If no AcademicPeriod is configured for (year, quarter), validate
         against the calendar quarter.
    """
    if isinstance(arg1, Session) or hasattr(arg1, "exec"):
        sess = arg1
        val: date = arg2
        yr: int = arg3
        qtr: int = arg4
    else:
        val = arg1
        yr = arg2
        qtr = arg3
        sess = session if session is not None else (arg4 if isinstance(arg4, Session) or hasattr(arg4, "exec") else None)

    if sess is not None:
        stmt = (
            select(AcademicPeriod)
            .where(AcademicPeriod.year == yr)
            .where(AcademicPeriod.quarter_number == qtr)
            .where(AcademicPeriod.is_active == True)  # noqa: E712
        )
        period = sess.exec(stmt).first()
        if period is not None:
            if not (period.start_date <= val <= period.end_date):
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"La fecha {val.isoformat()} no pertenece al periodo institucional "
                        f"'{period.name}' ({period.start_date.isoformat()} a {period.end_date.isoformat()})."
                    ),
                )
            return

    # Fallback to calendar quarter
    if val.year != yr or quarter_for_date(val) != qtr:
        raise HTTPException(
            status_code=422,
            detail=(
                f"La fecha {val.isoformat()} no pertenece al trimestre "
                f"{qtr} del año {yr}."
            ),
        )
