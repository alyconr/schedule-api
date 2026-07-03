from datetime import date, timedelta


def derive_contract_type(name: str) -> str:
    name_lower = name.lower()
    if "planta" in name_lower:
        return "planta"
    if "contratista" in name_lower:
        return "contratista"
    return "otro"


def get_week_range(d: date) -> tuple[date, date]:
    monday = d - timedelta(days=d.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday