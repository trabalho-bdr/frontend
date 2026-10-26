"""Compatibility entry point; classification belongs to question 09."""

from pathlib import Path
import sys

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from questions.q09_publicidade.normalization import (
    alias as alias,
    normalize as normalize,
    classify as classify,
    lit as lit,
    vals as vals,
    make_sql as make_sql,
    load as load,
    main as main,
    RULES as RULES,
    ALIASES as ALIASES,
    MISSING as MISSING,
    UNRESOLVED as UNRESOLVED,
    BYCODE as BYCODE,
    ALIAS as ALIAS,
)

if __name__ == "__main__":
    main()
