import re
from typing import Optional

ROMAN_NUMERALS: dict[str, int] = {
    "i": 1,
    "ii": 2,
    "iii": 3,
    "iv": 4,
    "v": 5,
    "vi": 6,
    "vii": 7,
    "viii": 8,
    "ix": 9,
    "x": 10,
    "xi": 11,
    "xii": 12,
}


def parse_roman_numeral(token: str) -> Optional[int]:
    """Parse a roman numeral token (case-insensitive) between I and XII."""
    if not token:
        return None
    cleaned = token.strip().lower()
    return ROMAN_NUMERALS.get(cleaned)


def parse_trimester_label(value: object) -> tuple[Optional[str], Optional[int]]:
    """
    Parse a trimester label from cell value.
    Supports formats like:
      - 'TRIMESTRE I', 'I TRIMESTRE', 'TRIMESTRE VII', 'VII TRIMESTRE', '7', 'TRIMESTRE 7'
      - Ranges: 'TRIMESTRE I - II', 'I - II' (preserves raw label, returns first trimester number)
    Returns: (raw_label, trimester_number)
    """
    if value is None:
        return None, None
    raw = str(value).strip()
    if not raw:
        return None, None

    # Normalize for regex
    normalized = " ".join(raw.lower().replace("_", " ").replace("-", " - ").split())

    # Try matching trimester keywords or standalone roman/digit
    # 1. Look for patterns like 'trimestre vii', 'trim 7', 't1'
    match = re.search(r"(?:trimestre|trim|t)?\s*([0-9]+|[ivx]+)(?:\s*(?:a|-|al)\s*([0-9]+|[ivx]+))?", normalized)
    if match:
        token = match.group(1)
        if token.isdigit():
            number = int(token)
            return raw, number
        roman_num = parse_roman_numeral(token)
        if roman_num is not None:
            return raw, roman_num

    # 2. Look for patterns like 'vii trimestre'
    match_rev = re.search(r"\b([ivx]+|[0-9]+)\s*trimestre\b", normalized)
    if match_rev:
        token = match_rev.group(1)
        if token.isdigit():
            return raw, int(token)
        roman_num = parse_roman_numeral(token)
        if roman_num is not None:
            return raw, roman_num

    # 3. Direct match if the whole string is just a number or roman numeral
    if normalized.isdigit():
        return raw, int(normalized)
    roman_num = parse_roman_numeral(normalized)
    if roman_num is not None:
        return raw, roman_num

    return raw, None
