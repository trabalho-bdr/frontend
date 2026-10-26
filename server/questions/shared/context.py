from dataclasses import dataclass
from pathlib import Path
from core.dependencies import QueryRunner
from core.config import DATA_DIR


@dataclass(frozen=True)
class ResearchContext:
    query: QueryRunner
    data_path: Path = DATA_DIR
