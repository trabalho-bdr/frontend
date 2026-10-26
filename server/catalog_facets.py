"""Presentation keys shared by facet lists and SQL predicates; source records stay intact."""

import re, unicodedata

FIELDS = ("escolaridade", "genero", "raca", "ocupacao")
from domain.normalization import MISSING_CODES, text_key

MISSING = MISSING_CODES


def facet_key(field, value):
    key = text_key(value)
    if key in MISSING:
        return "SEMINFORMACAONAFONTE"
    if field == "escolaridade" and key.startswith("ENSINO"):
        key = key[6:]
    return key


def facet_sql(field):
    key = "regexp_replace(strip_accents(UPPER(COALESCE(" + field + ",''))), '[^A-Z0-9]', '', 'g')"
    missing = ",".join("'" + v + "'" for v in MISSING)
    school = (
        " WHEN " + key + " LIKE 'ENSINO%' THEN SUBSTR(" + key + ",7)"
        if field == "escolaridade"
        else ""
    )
    return (
        "CASE WHEN "
        + key
        + " IN ("
        + missing
        + ") THEN 'SEMINFORMACAONAFONTE'"
        + school
        + " ELSE "
        + key
        + " END"
    )


def facet_options(field, values):
    groups = {}
    for value in values:
        groups.setdefault(facet_key(field, value), []).append(value or "")
    labels = []
    for key, variants in groups.items():
        if key == "SEMINFORMACAONAFONTE":
            label = "Sem informação na fonte"
        else:
            # Prefer the accented spelling; never merge different occupation descriptions.
            label = max(variants, key=lambda v: (sum(ord(c) > 127 for c in v), len(v), v)).strip()
            label = re.sub(r"\s*,\s*", ", ", label)
            if field == "escolaridade" and label.upper().startswith("ENSINO "):
                label = label[7:]
            label = label.capitalize()
        labels.append(label)
    return sorted(
        labels,
        key=lambda label: (
            facet_key(field, label) == "SEMINFORMACAONAFONTE",
            facet_key(field, label),
        ),
    )
