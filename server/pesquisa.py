"""HTTP compatibility facade; calculations and SQL belong to questions/q01...q10."""

from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from catalogo import read
from core.config import DB, DATA_DIR
from questions.shared.context import ResearchContext
from questions.shared.scope import scope_filter, candidate_scope, PROPORTIONAL, SCHOOLS
from questions.shared.statistics import percent, wilson, correlation
from questions.shared.repository import municipal_data as _municipal_data
from questions import registry

router = APIRouter(prefix="/api/pesquisa", tags=["pesquisa"])
DATA = DATA_DIR


def context():
    return ResearchContext(read, DATA)


def cost(f):
    return registry.calculate(1, f, context())


def wealth(f):
    return registry.calculate(2, f, context())


def municipal_data(f):
    return _municipal_data(f, read)


def territory(f, metric, target):
    return registry.calculate(3, f, context(), metric=metric, target=target)


def electorate(f, question, youth, universe):
    return registry.calculate(question, f, context(), youth=youth, universe=universe)


def party_series(f, question, historico=False):
    return registry.calculate(question, f, context(), historico=historico)


def financing(f):
    return registry.calculate(8, f, context())


def trajectories(f):
    return registry.calculate(10, f, context())


@router.get("/{question}")
def research(
    question: int,
    ano: int = 2024,
    cargo: str = "VEREADOR",
    uf: str = "",
    partido: str = "",
    municipio: str = "",
    metric: str = "populacao",
    target: str = "abstencao",
    youth: str = "16_24",
    universe: str = "18mais",
    historico: str = "0",
):
    if historico not in ("0", "1"):
        raise HTTPException(422, "Opção de histórico inválida.")
    if question not in (1, 2, 3, 4, 5, 6, 7, 8, 10):
        raise HTTPException(422, "Pergunta não atendida por este endpoint.")
    f = scope_filter(ano, cargo, uf, partido, municipio)
    if question == 1:
        data = cost(f)
    elif question == 2:
        data = wealth(f)
    elif question == 3:
        data = territory(f, metric, target)
    elif question in (4, 6):
        data = electorate(f, question, youth, universe)
    elif question in (5, 7):
        data = party_series(f, question, historico == "1")
    elif question == 8:
        data = financing(f)
    else:
        data = trajectories(f)
    return {
        "question": question,
        "scope": {
            k: v for k, v in f.items() if k in ("ano", "cargo", "uf", "partido", "municipio")
        },
        "settings": {
            "metric": metric,
            "target": target,
            "youth": youth,
            "universe": universe,
            "historico": historico,
        },
        "source": "live",
        "database": DB,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "status": "disponivel",
        **data,
    }


@router.get("/{question}/municipios")
def research_municipalities(
    question: int,
    ano: int = 2024,
    cargo: str = "VEREADOR",
    uf: str = "",
    partido: str = "",
    municipio: str = "",
):
    f = scope_filter(ano, cargo, uf, partido, municipio)
    if cargo not in ("VEREADOR", "PREFEITO"):
        raise HTTPException(
            422,
            "O mapa de candidaturas requer cargo municipal; cadeiras de deputados pertencem à UF.",
        )
    if question not in (1, 2, 5, 8):
        raise HTTPException(422, "Mapa não disponível para esta pergunta neste endpoint.")
    return registry.municipalities(question, f, context())
