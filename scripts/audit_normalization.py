"""Aggregate-only quality audit. Does not alter MotherDuck or export person records."""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
from core.config import DB
from core.database import _rows
from core.sql import query_sql


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts/normalization-audit.json")
    args = parser.parse_args()
    load_dotenv(ROOT / "server/.env")
    report = {
        "read_only": True,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "checks": {},
    }
    for name in ["candidate_integrity", "result_grain", "vote_grain", "orphan_people"]:
        report["checks"][name] = _rows(query_sql("domain/sql/" + name + ".sql", database=DB))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf8")
    print(json.dumps(report, ensure_ascii=True))


if __name__ == "__main__":
    main()
