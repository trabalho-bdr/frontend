"""Read-only comparison of migrated question contracts against the functional baseline.
Run locally with server credentials; reports counts/status only, never person records.
"""

import argparse
import math
import json
import subprocess
import sys
from pathlib import Path
from types import ModuleType
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
load_dotenv(ROOT / "server/.env")
import app  # configures the shared query runner
import pesquisa


def comparable(value):
    if isinstance(value, dict):
        return {key: comparable(item) for key, item in value.items() if key != "extracted_at"}
    if isinstance(value, list):
        return [comparable(item) for item in value]
    return value


def differences(a, b, path=""):
    if isinstance(a, dict) and isinstance(b, dict):
        return [
            item
            for key in a.keys() | b.keys()
            for item in differences(a.get(key), b.get(key), path + "/" + str(key))
        ]
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            return [dict(path=path, issue="length")]
        return [
            item
            for index, (left, right) in enumerate(zip(a, b))
            for item in differences(left, right, path + "/" + str(index))
        ]
    if isinstance(a, float) or isinstance(b, float):
        if (
            isinstance(a, (int, float))
            and isinstance(b, (int, float))
            and math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-8)
        ):
            return []
    return [] if a == b else [dict(path=path, before=a, after=b)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", default="026596e")
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts/research-equivalence.json")
    args = parser.parse_args()
    source = subprocess.check_output(
        ["git", "show", args.baseline + ":server/pesquisa.py"], cwd=ROOT
    ).decode("utf8")
    baseline = ModuleType("research_baseline")
    baseline.__file__ = str(ROOT / "server/pesquisa.py")
    exec(compile(source, baseline.__file__, "exec"), baseline.__dict__)
    report = {
        "baseline": args.baseline,
        "read_only": True,
        "numeric_tolerance": {"relative": 1e-12, "absolute": 1e-8},
        "checks": [],
    }
    scope = dict(ano=2024, cargo="VEREADOR", uf="MA", municipio="2112209", partido="")
    for question in [1, 2, 3, 4, 5, 6, 7, 8, 10]:
        try:
            before = baseline.research(question, **scope)
            after = pesquisa.research(question, **scope)
            equal = not differences(comparable(before), comparable(after))
            row = dict(
                question=question,
                equivalent=equal,
                rows=len(after.get("rows", [])),
                status=after["status"],
            )
            if not equal:
                row["differences"] = differences(comparable(before), comparable(after))[:12]
        except Exception as error:
            row = dict(question=question, equivalent=False, error_type=type(error).__name__)
        report["checks"].append(row)
        print(json.dumps(row), flush=True)
    report["success"] = all(row["equivalent"] for row in report["checks"])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf8")
    return 0 if report["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
