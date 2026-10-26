"""Versioned display contracts. Raw source values are never overwritten."""

import json
import re
import unicodedata
from pathlib import Path

SHARED = Path(__file__).resolve().parents[2] / "shared"
NORMALIZATION = json.loads((SHARED / "normalization.json").read_text(encoding="utf8"))
PARTY_CONTRACT = json.loads((SHARED / "parties.json").read_text(encoding="utf8"))
MISSING_CODES = tuple(NORMALIZATION["missingCodes"])


def text_key(value):
    text = "" if value is None else str(value)
    text = "".join(
        c for c in unicodedata.normalize("NFD", text.upper()) if unicodedata.category(c) != "Mn"
    )
    return re.sub("[^A-Z0-9]", "", text)


def source_value(value):
    key = text_key(value)
    if key in MISSING_CODES:
        return NORMALIZATION["missingLabel"]
    if key in NORMALIZATION["restrictedCodes"]:
        return NORMALIZATION["restrictedLabel"]
    return str(value).strip()
