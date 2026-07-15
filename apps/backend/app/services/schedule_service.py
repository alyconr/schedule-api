from datetime import date, timedelta


def derive_contract_type(name: str) -> str:
    name_lower = name.lower()
    if any(value in name_lower for value in ("planta", "carrera administrativa", "nombramiento provisional", "nombramiento ordinario")):
        return "planta"
    if "contratista" in name_lower:
        return "contratista"
    return "otro"


def get_week_range(d: date) -> tuple[date, date]:
    monday = d - timedelta(days=d.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


WEEKDAY_LABELS = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo",
}


def weekday_label(weekday: int) -> str:
    return WEEKDAY_LABELS.get(weekday, "")
