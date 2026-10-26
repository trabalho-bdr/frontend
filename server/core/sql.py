"""Load versioned SQL; interpolate internal fragments, bind user values separately."""

from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@lru_cache(maxsize=256)
def _read(relative):
    path = (ROOT / relative).resolve()
    if not path.is_relative_to(ROOT) or path.suffix != ".sql":
        raise ValueError("SQL path must stay inside server/")
    return path.read_text(encoding="utf8")


def query_sql(relative, **fragments):
    statement = _read(relative)
    for name, value in fragments.items():
        token = "__SQL_" + name + "__"
        if token not in statement:
            raise ValueError("Unknown SQL fragment: " + name)
        statement = statement.replace(token, str(value))
    if "__SQL_" in statement:
        raise ValueError("Missing SQL fragment")
    return statement
