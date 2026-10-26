"""Consultas de leitura para a investigação sobre votos de legenda (Q5)."""

from core.sql import query_sql
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

router = APIRouter(prefix="/api/legenda-investigacao", tags=["legenda-investigacao"])
UFS = ("CE", "MA", "MS", "RJ", "RN", "RS")
YEARS = {
    "VEREADOR": (2020, 2024),
    "DEPUTADO ESTADUAL": (2018, 2022),
    "DEPUTADO FEDERAL": (2018, 2022),
}


def validate(cargo, uf, partido, municipio):
    cargo = cargo.strip().upper()
    uf = uf.strip().upper()
    partido = partido.strip().upper()
    municipio = municipio.strip()
    if cargo not in YEARS:
        raise HTTPException(422, "Selecione um cargo proporcional disponível.")
    if uf and uf not in UFS:
        raise HTTPException(422, "UF fora dos seis estados disponíveis.")
    if len(partido) > 35 or (partido and not all(c.isalnum() or c in " .-" for c in partido)):
        raise HTTPException(422, "Sigla partidária inválida.")
    if municipio and (not uf or not municipio.isdigit() or len(municipio) > 12):
        raise HTTPException(422, "Selecione primeiro uma UF e um código municipal válido.")
    return cargo, uf, partido, municipio


def read(sql, params):
    from core.dependencies import execute as _rows
    from core.config import DB

    try:
        return _rows(sql.replace("{db}", DB), params)
    except Exception:
        raise HTTPException(503, "Não foi possível consultar os votos de legenda na base v4.")


@router.get("/serie")
def serie(cargo: str = "VEREADOR", uf: str = "", partido: str = "", municipio: str = ""):
    cargo, uf, partido, municipio = validate(cargo, uf, partido, municipio)
    # Primeiro agregamos as linhas da própria tabela de votos. Cada voto entra
    # uma única vez; percentual só é calculado após somar legenda e nominais.
    sql = query_sql(
        "questions/q05_votos_legenda/sql/compatibility/legenda_investigacao_serie_01.sql"
    )
    years = YEARS[cargo]
    rows = read(sql, [*years, cargo, uf, uf, partido, partido, municipio, municipio])
    return {
        "rows": rows,
        "scope": {
            "cargo": cargo,
            "anos": years,
            "uf": uf,
            "partido": partido,
            "municipio": municipio,
        },
        "database": "pipeline_bdr_der_completo_v4",
        "source": "live",
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "method": "Votos de legenda ÷ (votos de legenda + votos nominais); primeiro turno, eleições ordinárias, seis UFs. Cada cargo é comparado apenas com o mesmo cargo.",
    }
