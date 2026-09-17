import hashlib
import re
import unicodedata
from typing import Optional

from app.services.imports.column_resolver import normalize_header


def get_stable_hash(text: str) -> str:
    """Generate an 8-character stable uppercase MD5 hash from text."""
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:8].upper()


def strip_accents(text: str) -> str:
    """Strip diacritics / accents from text using NFD normalization."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


INSTITUTIONAL_PREFIXES = (
    "ESPECIALIZACION TECNOLOGICA EN ",
    "ESPECIALIZACION TECNICA EN ",
    "TECNOLOGO EN ",
    "TECNICO EN ",
    "AUXILIAR EN ",
    "OPERARIO EN ",
    "CURSO ESPECIAL EN ",
)

PROGRAM_ALIASES: dict[str, str] = {}


def canonical_program_key(value: object) -> str:
    """
    Canonicalize a program name:
      - Strip whitespace & uppercase
      - Strip accents
      - Remove punctuation (preserve alphanumeric and spaces)
      - Strip leading institutional prefixes (e.g. TECNOLOGO EN, TECNICO EN, AUXILIAR EN)
      - Remove optional trailing program version/code if formatted as ' - 123456' or ' (123456)'
      - Check against explicit PROGRAM_ALIASES
    """
    if value is None:
        return ""
    text = str(value).strip().upper()
    text = strip_accents(text)
    text = re.sub(r"^[(\[\"']+|[)\]\"']+$", "", text)
    text = re.sub(r"[\s\-_]+\(?\d{5,8}\)?$", "", text).strip()
    text = re.sub(r"[^\w\s]", " ", text)
    text = " ".join(text.split())

    for prefix in INSTITUTIONAL_PREFIXES:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
            break

    return PROGRAM_ALIASES.get(text, text)


def normalize_program_name(value: object) -> str:
    """Return a clean display name for a program."""
    if value is None:
        return ""
    return " ".join(str(value).strip().upper().strip(" .;:,").split())


def build_program_code(program_name: str) -> str:
    """
    Build a unique stable program code based on the canonical program key.
    Ensures that 'TÉCNICO EN ASESORÍA COMERCIAL' and 'ASESORIA COMERCIAL'
    produce the exact same program code.
    """
    canon = canonical_program_key(program_name)
    return f"PROG-{get_stable_hash(canon)}"


def normalize_text_key(value: object) -> str:
    """Normalize general text into a trimmed uppercase accent-free string."""
    if value is None:
        return ""
    text = strip_accents(str(value).strip().upper())
    return " ".join(re.sub(r"[^\w\s]", " ", text).split())


def build_ra_code(
    program_code: str,
    scope: Optional[str],
    trimester_number: Optional[int],
    ra_description: str,
    prefix: str = "CAD",
    trimester_label: Optional[str] = None,
) -> str:
    """
    Build a stable RAP code incorporating program code, scope, trimester, and description.
    Prevents collision when different programs have identical RAP descriptions.
    Enforces max_length <= 50.
    """
    norm_desc = normalize_text_key(ra_description)
    tri_str = str(trimester_number or "0")
    scope_str = (scope or "GEN").upper()
    ra_identity = f"{program_code}|{scope_str}|{tri_str}|{norm_desc}"
    hash_str = get_stable_hash(ra_identity)

    if trimester_label:
        tri_token = normalize_header(trimester_label).upper()
    else:
        tri_token = f"TRIMESTRE_{tri_str}"

    code = f"{prefix}-{tri_token}-RAP-{hash_str}"
    return code[:50]


def build_topic_code(
    program_code: str,
    scope: Optional[str],
    trimester_number: Optional[int],
    topic_name: str,
    prefix: str = "CAD",
    trimester_label: Optional[str] = None,
) -> str:
    """
    Build a stable Topic code incorporating program, scope, trimester, and topic name.
    Does NOT depend on Excel row number for persistence.
    Enforces max_length <= 50.
    """
    norm_name = normalize_text_key(topic_name)
    tri_str = str(trimester_number or trimester_label or "")
    scope_str = (scope or "GEN").upper()
    topic_identity = f"{program_code}|{scope_str}|{tri_str}|{norm_name}"
    hash_str = get_stable_hash(topic_identity)
    code = f"TEM-{prefix}-{hash_str}"
    return code[:50]


def build_relation_id(
    program_code: str,
    scope: Optional[str],
    trimester_number: Optional[int],
    ra_code_or_desc: str,
    topic_code_or_name: str,
    prefix: str = "CAD",
    trimester_label: Optional[str] = None,
) -> str:
    """
    Build a stable LearningResultTopic relation ID.
    Enforces max_length <= 120.
    """
    tri_str = str(trimester_number or trimester_label or "")
    scope_str = (scope or "GEN").upper()
    relation_identity = f"{program_code}|{scope_str}|{tri_str}|{ra_code_or_desc}|{topic_code_or_name}"
    hash_str = get_stable_hash(relation_identity)
    relation_id = f"REL-{prefix}-{hash_str}"
    return relation_id[:120]
