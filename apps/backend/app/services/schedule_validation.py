from datetime import time
from typing import Any


def _overlaps(start: time, end: time, other_start: time, other_end: time) -> bool:
    return start < other_end and other_start < end


def _validation(rule_code: str, severity: str, message: str, field: str | None = None) -> dict[str, Any]:
    return {
        "rule_code": rule_code,
        "severity": severity,
        "message": message,
        "is_blocking": severity == "BLOCKING",
        "field": field,
    }


def validate_schedule(payload: dict[str, Any]) -> dict[str, Any]:
    validations: list[dict[str, Any]] = []
    is_additional_hours = payload.get("is_additional_hours", False)

    if not is_additional_hours and payload["end_time"] <= payload["start_time"]:
        validations.append(
            _validation("INVALID_TIME_RANGE", "BLOCKING", "La hora final debe ser mayor a la hora inicial.", "end_time")
        )

    inactive_checks = (
        ("instructor_active", "INSTRUCTOR_INACTIVE", "El instructor esta inactivo."),
        ("group_active", "GROUP_INACTIVE", "La ficha esta inactiva."),
        ("environment_active", "ENVIRONMENT_INACTIVE", "El ambiente esta inactivo."),
    )
    for field, code, message in inactive_checks:
        if is_additional_hours and field in {"group_active", "environment_active"}:
            continue
        if not payload[field]:
            validations.append(_validation(code, "BLOCKING", message, field))

    if not is_additional_hours and payload["learning_result_id"] not in payload["program_learning_result_ids"]:
        validations.append(
            _validation(
                "LEARNING_RESULT_NOT_IN_PROGRAM",
                "BLOCKING",
                "El RAP no pertenece al programa de la ficha.",
                "learning_result_id",
            )
        )

    if not is_additional_hours:
        _validate_overlaps(payload, validations)
        _validate_plant_schedule_window(payload, validations)
    _validate_weekly_hours(payload, validations)

    if not is_additional_hours and payload["environment_capacity"] < payload["group_learners"]:
        validations.append(
            _validation(
                "ENVIRONMENT_CAPACITY_LOW",
                "WARNING",
                "La capacidad del ambiente es inferior al numero de aprendices.",
                "environment_capacity",
            )
        )

    if any(item["is_blocking"] for item in validations):
        status = "blocked"
    elif validations:
        status = "warning"
    else:
        status = "valid"

    return {"status": status, "validations": validations}


def _validate_overlaps(payload: dict[str, Any], validations: list[dict[str, Any]]) -> None:
    for existing in payload["existing_schedules"]:
        same_day = existing["date"] == payload["date"]
        same_time = _overlaps(payload["start_time"], payload["end_time"], existing["start_time"], existing["end_time"])
        if not same_day or not same_time:
            continue

        if existing["instructor_id"] == payload["instructor_id"]:
            validations.append(
                _validation("INSTRUCTOR_OVERLAP", "BLOCKING", "El instructor ya tiene programacion en esa franja.")
            )

        if existing["group_id"] == payload["group_id"]:
            validations.append(_validation("GROUP_OVERLAP", "BLOCKING", "La ficha ya tiene programacion en esa franja."))
            if existing["learning_result_id"] == payload["learning_result_id"]:
                validations.append(
                    _validation(
                        "GROUP_RAP_DUPLICATED",
                        "BLOCKING",
                        "La ficha ya tiene ese RAP programado en el mismo bloque.",
                        "learning_result_id",
                    )
                )

        physical_environment = payload["environment_type"] == "fisico" and existing["environment_type"] == "fisico"
        if physical_environment and existing["environment_id"] == payload["environment_id"]:
            validations.append(_validation("ENVIRONMENT_OVERLAP", "BLOCKING", "El ambiente fisico ya esta ocupado."))


def _validate_weekly_hours(payload: dict[str, Any], validations: list[dict[str, Any]]) -> None:
    total_hours = payload["instructor_weekly_hours"] + payload["duration_hours"]
    contract_type = payload["instructor_contract_type"]

    if contract_type == "planta":
        if total_hours > 32:
            validations.append(
                _validation(
                    "PLANT_INSTRUCTOR_MAX_HOURS",
                    "BLOCKING",
                    "El instructor de planta supera las 32 horas semanales permitidas.",
                    "duration_hours",
                )
            )
        elif total_hours > 30:
            validations.append(
                _validation(
                    "PLANT_INSTRUCTOR_EXTRA_HOURS",
                    "WARNING",
                    "El instructor de planta supera 30 horas; las horas adicionales deben quedar identificadas.",
                    "duration_hours",
                )
            )
        elif total_hours < 30:
            missing = 30 - total_hours
            validations.append(
                _validation(
                    "PLANT_INSTRUCTOR_MISSING_HOURS",
                    "WARNING",
                    f"El instructor de planta tiene {missing:g} horas pendientes para completar 30.",
                    "duration_hours",
                )
            )

    if contract_type == "contratista":
        if total_hours < 40:
            missing = 40 - total_hours
            validations.append(
                _validation(
                    "CONTRACTOR_MISSING_HOURS",
                    "WARNING",
                    f"El contratista tiene {missing:g} horas pendientes para completar 40.",
                    "duration_hours",
                )
            )
        elif total_hours > 40:
            validations.append(
                _validation(
                    "CONTRACTOR_OVER_40_HOURS",
                    "WARNING",
                    "El contratista supera 40 horas semanales; requiere revision de coordinacion.",
                    "duration_hours",
                )
            )


def _validate_plant_schedule_window(payload: dict[str, Any], validations: list[dict[str, Any]]) -> None:
    if payload["instructor_contract_type"] != "planta":
        return
    if payload["date"].isoweekday() >= 6:
        validations.append(
            _validation(
                "PLANT_INSTRUCTOR_WEEKEND",
                "BLOCKING",
                "Los instructores de planta no pueden programarse los fines de semana.",
                "date",
            )
        )
    if payload["end_time"] > time(18, 0):
        validations.append(
            _validation(
                "PLANT_INSTRUCTOR_NIGHT_SHIFT",
                "BLOCKING",
                "Los instructores de planta no pueden programarse en horario nocturno después de las 18:00.",
                "end_time",
            )
        )
