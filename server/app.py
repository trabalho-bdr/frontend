"""API read-only do MotherDuck para o Arquivo da Democracia.
Nunca envie token ao navegador. O serviço expõe apenas consultas parametrizadas.
"""

from __future__ import annotations
from core.sql import query_sql
import os
import re
import threading
import time
from copy import deepcopy
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Arquivo da Democracia — API MotherDuck", version="1.0.0")
from comparacoes import router as comparacoes_router
from questao1 import router as questao1_router
from questao2 import router as questao2_router

app.include_router(comparacoes_router)
app.include_router(questao1_router)
app.include_router(questao2_router)
from indicadores import router as indicadores_router, diagnostico_base

app.include_router(indicadores_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)
from core import database
from core.config import DB, UFS
from core.dependencies import configure_query_runner

_lock = database._lock
_query_cache = database._query_cache
_open = database._open
_rows = database._rows
ALLOWED_UF = set(UFS)
YEARS = set(range(2002, 2025, 2))
configure_query_runner(lambda sql, params=(): _rows(sql, params))


def _year(value: int | None):
    if value is not None and value not in YEARS:
        raise HTTPException(400, "Ano não permitido")
    return value


def _uf(value: str | None):
    if value and value.upper() not in ALLOWED_UF:
        raise HTTPException(400, "UF fora da cobertura desta base")
    return value.upper() if value else None


@app.get("/api/diagnostico")
def diagnostico():
    try:
        return diagnostico_base()
    except Exception as exc:
        return JSONResponse(
            {
                "status": "erro",
                "motivo": "Não foi possível consultar a v4. Verifique a configuração e as permissões do servidor.",
            },
            status_code=503,
        )


@app.get("/api/health")
def health():
    try:
        result = _rows(query_sql("compatibility/sql/app/app_health_01.sql", fragment_0=DB))
        return {
            "mode": "live",
            "connected": True,
            "database": "pipeline_bdr_der_completo_v4",
            "municipalities": result[0]["n"],
            "coverage": "RS, MA, CE, RN, RJ, MS",
        }
    except Exception as exc:
        return JSONResponse(
            {
                "mode": "unavailable",
                "connected": False,
                "message": "Consulta detalhada temporariamente indisponível",
            },
            status_code=503,
        )


@app.get("/api/overview")
def overview():
    tables = {
        "applications": "Candidatura",
        "people": "Candidato",
        "expenses": "Despesa_Candidatura",
        "patrimony": "Patrimonio_Candidato",
        "partyVotes": "Votos_Partido_Municipio",
        "coverage": "Municipio",
    }
    parts = [
        query_sql(
            "compatibility/sql/app/app_overview_01.sql",
            fragment_0=k,
            fragment_1=DB,
            fragment_2=table,
        )
        for k, table in tables.items()
    ]
    rows = _rows(" UNION ALL ".join(parts))
    return {
        "source": "live",
        "values": {r["field"]: r["value"] for r in rows},
        "states": 6,
        "disclaimer": "Cobertura parcial de 6 UFs, não nacional.",
    }


@app.get("/api/candidates")
def candidates(
    search: str = Query("", min_length=0, max_length=80),
    ano: int = 2024,
    uf: str | None = None,
    partido: str = Query("", max_length=35),
    cargo: str = Query("", max_length=50),
    resultado: str = Query("", max_length=35),
    limit: int = Query(12, ge=1, le=36),
    offset: int = Query(0, ge=0, le=1000000),
    ordem: str = "votos",
    municipio: str = "",
):
    _year(ano)
    uf = _uf(uf)
    if municipio and cargo.upper() not in ("VEREADOR", "PREFEITO"):
        raise HTTPException(400, "Município só pode delimitar uma disputa municipal.")
    # Whitelist de ordenação: nenhum identificador SQL é aceito diretamente da URL.
    if resultado not in ("", "ELEITO", "NÃO ELEITO", "SUPLENTE"):
        raise HTTPException(400, "Resultado não reconhecido")
    orders = {
        "votos": "r.votos DESC NULLS LAST",
        "gastos": "c.gastos_campanha_total DESC NULLS LAST",
        "custo_voto": "c.gastos_campanha_total/NULLIF(r.votos,0) DESC NULLS LAST",
    }
    if ordem not in orders:
        raise HTTPException(400, "Ordenação desconhecida")
    order = orders[ordem]
    # Busca completa paginada; filtros como parâmetros preparados.
    sql = query_sql(
        "compatibility/sql/app/app_candidates_01.sql",
        fragment_0=DB,
        fragment_1=DB,
        fragment_2=DB,
        fragment_3=DB,
        fragment_4=DB,
        fragment_5=order,
    )
    params = [
        ano,
        *([f"%{search}%"] * 4),
        uf,
        uf,
        partido,
        partido,
        cargo,
        cargo,
        resultado,
        resultado,
        resultado,
        resultado,
        municipio,
        municipio,
        limit,
        offset,
    ]
    rows = _rows(sql, params)
    return {
        "rows": [{k: v for k, v in row.items() if k != "total_encontrado"} for row in rows],
        "total": rows[0]["total_encontrado"] if rows else 0,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/candidate-expenses/{candidate_id}")
def candidate_expenses(
    candidate_id: str,
    categoria: str = Query("", max_length=300),
    limit: int = Query(40, ge=1, le=100),
    offset: int = Query(0, ge=0, le=1000000),
):
    """Livro de lançamentos da candidatura. Não são arquivos de notas fiscais."""
    if not re.fullmatch(r"[0-9a-f]{32}", candidate_id):
        raise HTTPException(400, "Identificador inválido")
    person = _rows(
        query_sql(
            "compatibility/sql/app/app_candidate_expenses_01.sql",
            fragment_0=DB,
            fragment_1=DB,
            fragment_2=DB,
            fragment_3=DB,
            fragment_4=DB,
        ),
        [candidate_id],
    )
    if not person:
        raise HTTPException(404, "Candidatura não encontrada")
    summary = _rows(
        query_sql("compatibility/sql/app/app_candidate_expenses_02.sql", fragment_0=DB),
        [candidate_id],
    )
    stats = _rows(
        query_sql("compatibility/sql/app/app_candidate_expenses_03.sql", fragment_0=DB),
        [candidate_id],
    )
    selected = _rows(
        query_sql("compatibility/sql/app/app_candidate_expenses_04.sql", fragment_0=DB),
        [candidate_id, categoria, categoria],
    )
    entries = _rows(
        query_sql("compatibility/sql/app/app_candidate_expenses_05.sql", fragment_0=DB),
        [candidate_id, categoria, categoria, limit, offset],
    )
    return {
        "candidate": person[0],
        "categories": summary,
        "entries": entries,
        "stats": stats[0],
        "total_filtered": selected[0]["quantidade"],
        "limit": limit,
        "offset": offset,
        "document_type": "EXTRATO_VISUAL",
        "disclaimer": "Documento visual produzido pelo portal com dados de Despesa_Candidatura. NÃO é nota fiscal, cupom fiscal nem comprovante oficial.",
    }


def _resolve_db(table_name: str) -> str:
    _rows(
        query_sql(
            "compatibility/sql/app/app__resolve_db_01.sql", fragment_0=DB, fragment_1=table_name
        )
    )
    return DB


@app.get("/api/anos")
def anos():
    return {"anos": [2022, 2024]}


@app.get("/api/q3/{uf}/{ano}")
def q3_municipios(uf: str, ano: int):
    uf_val = _uf(uf)
    if not uf_val:
        raise HTTPException(400, "UF obrigatória")
    _year(ano)
    db_m = _resolve_db("Municipio")
    db_p = _resolve_db("Participacao_Eleitoral")
    db_c = _resolve_db("Censo_Municipio")
    sql = query_sql(
        "compatibility/sql/app/app_q3_municipios_01.sql",
        fragment_0=db_m,
        fragment_1=db_p,
        fragment_2=db_c,
    )
    linhas = _rows(sql, [uf_val, ano])
    saida = {str(r["id_municipio"]).zfill(7): r for r in linhas}
    return {"uf": uf_val, "ano": ano, "municipios": saida}


@app.get("/api/municipios")
def municipios(
    search: str = Query("", max_length=75),
    uf: str | None = None,
    limit: int = Query(35, ge=1, le=1500),
):
    uf = _uf(uf)
    db_m = _resolve_db("Municipio")
    db_c = _resolve_db("Censo_Municipio")
    db_p = _resolve_db("Participacao_Eleitoral")
    return _rows(
        query_sql(
            "compatibility/sql/app/app_municipios_01.sql",
            fragment_0=db_m,
            fragment_1=db_c,
            fragment_2=db_p,
        ),
        [f"%{search}%", uf, uf, limit],
    )


# Todos os templates SQL abaixo são fixos. Os filtros de ano nunca são interpolados na instrução SQL.
QUERY = {
    1: query_sql(
        "compatibility/sql/app/app_definitions_01.sql", fragment_0=DB, fragment_1=DB, fragment_2=DB
    ),
    2: query_sql(
        "compatibility/sql/app/app_definitions_02.sql", fragment_0=DB, fragment_1=DB, fragment_2=DB
    ),
    3: query_sql(
        "compatibility/sql/app/app_definitions_03.sql", fragment_0=DB, fragment_1=DB, fragment_2=DB
    ),
    4: query_sql(
        "compatibility/sql/app/app_definitions_04.sql", fragment_0=DB, fragment_1=DB, fragment_2=DB
    ),
    5: query_sql("compatibility/sql/app/app_definitions_05.sql", fragment_0=DB, fragment_1=DB),
    6: query_sql(
        "compatibility/sql/app/app_definitions_06.sql", fragment_0=DB, fragment_1=DB, fragment_2=DB
    ),
    7: query_sql("compatibility/sql/app/app_definitions_07.sql", fragment_0=DB, fragment_1=DB),
    9: query_sql("compatibility/sql/app/app_definitions_08.sql", fragment_0=DB),
    10: query_sql(
        "compatibility/sql/app/app_definitions_09.sql", fragment_0=DB, fragment_1=DB, fragment_2=DB
    ),
}


@app.get("/api/analysis/{question}")
def analysis(question: int):
    if question == 8:
        return {
            "question": 8,
            "status": "indisponivel",
            "rows": [],
            "message": "Não existe tabela de receitas eleitorais públicas/privadas no v4.",
        }
    if question == 9:
        try:
            view_sql = query_sql("compatibility/sql/app/app_analysis_01.sql", fragment_0=DB)
            rows = _rows(view_sql)
            if rows:
                return {
                    "question": 9,
                    "status": "ok",
                    "rows": rows,
                    "database": "pipeline_bdr_der_completo_v4",
                    "mode": "live",
                    "source": "vw_q9_resumo_categorias",
                }
        except Exception:
            pass
        return {
            "question": 9,
            "status": "ok",
            "rows": _rows(QUERY[9]),
            "database": "pipeline_bdr_der_completo_v4",
            "mode": "live",
            "source": "Despesa_Candidatura",
        }
    if question not in QUERY:
        raise HTTPException(404, "Investigação não encontrada")
    return {
        "question": question,
        "status": "ok",
        "rows": _rows(QUERY[question]),
        "database": "pipeline_bdr_der_completo_v4",
        "mode": "live",
    }


@app.get("/api/despesas/resumo-categorias")
def despesas_resumo_categorias():
    """Consome a view vw_q9_resumo_categorias com o detalhamento dos grupos de despesa."""
    try:
        rows = _rows(
            query_sql("compatibility/sql/app/app_despesas_resumo_categorias_01.sql", fragment_0=DB)
        )
        return {"source": "vw_q9_resumo_categorias", "total_grupos": len(rows), "rows": rows}
    except Exception as exc:
        raise HTTPException(
            503, f"View vw_q9_resumo_categorias indisponível no banco conectado: {exc}"
        )


@app.get("/api/despesas/regras")
def despesas_regras():
    """Regras de categorização da view vw_q9_regras_categorias."""
    try:
        rows = _rows(query_sql("compatibility/sql/app/app_despesas_regras_01.sql", fragment_0=DB))
        return {"source": "vw_q9_regras_categorias", "rows": rows}
    except Exception as exc:
        raise HTTPException(503, f"View vw_q9_regras_categorias indisponível: {exc}")


@app.get("/api/descobertas")
def descobertas(ano: int = 2024, cargo: str = "VEREADOR", uf: str | None = None):
    """Rankings comparáveis por cargo/ano; sem extrapolação nacional."""
    _year(ano)
    uf = _uf(uf)
    offices = {
        "VEREADOR",
        "PREFEITO",
        "DEPUTADO ESTADUAL",
        "DEPUTADO FEDERAL",
        "SENADOR",
        "GOVERNADOR",
        "PRESIDENTE",
    }
    cargo = cargo.upper().strip()
    if cargo not in offices:
        raise HTTPException(400, "Cargo desconhecido")
    if cargo == "PRESIDENTE" and ano not in (2018, 2022):
        raise HTTPException(400, "Eleições para Presidente ocorreram em 2018 e 2022.")
    lideres = _rows(
        query_sql(
            "compatibility/sql/app/app_descobertas_01.sql",
            fragment_0=DB,
            fragment_1=DB,
            fragment_2=DB,
            fragment_3=DB,
        ),
        [ano, cargo, uf, uf],
    )
    # Sem criar ranking de 'melhores' municípios se ano solicitado não tiver participação correspondente.
    alta, baixa, ufs = [], [], []
    if ano in (2022, 2024):
        base = query_sql(
            "compatibility/sql/app/app_descobertas_02.sql", fragment_0=DB, fragment_1=DB
        )
        alta = _rows(base.format(order="DESC"), [ano, uf, uf])
        baixa = _rows(base.format(order="ASC"), [ano, uf, uf])
        ufs = _rows(
            query_sql("compatibility/sql/app/app_descobertas_03.sql", fragment_0=DB, fragment_1=DB),
            [ano, uf, uf],
        )
    return {
        "ano": ano,
        "cargo": cargo,
        "uf": uf,
        "leaders": lideres,
        "abstencaoAlta": alta,
        "abstencaoBaixa": baixa,
        "porEstado": ufs,
        "limiar_eleitores": 10000,
        "coverage": "CE, MA, MS, RJ, RN, RS",
        "methodology": "Votos por candidatura e cargo, pleitos ordinários. Abstenção municipal com >= 10 mil eleitores aptos. Percentuais estaduais ponderados por eleitorado.",
    }


@app.get("/api/adesivaria")
def adesivaria(
    ano: int = 2024,
    uf: str | None = None,
    partido: str = Query("", max_length=35),
    cargo: str = "VEREADOR",
    abrangencia: str = "",
    municipio: str = "",
    material: str = "todos",
    limit: int = 12,
    offset: int = 0,
    offset_votos: int = 0,
    offset_categorias: int = 0,
):
    from adesivaria import summary

    return summary(
        ano,
        uf or "",
        partido,
        cargo,
        abrangencia,
        municipio,
        material,
        limit,
        offset,
        offset_votos,
        offset_categorias,
    )


@app.get("/api/adesivaria/candidatura/{candidate_id}")
def adesivaria_candidate(
    candidate_id: str,
    ano: int = 2024,
    uf: str = "",
    partido: str = Query("", max_length=35),
    cargo: str = "VEREADOR",
    abrangencia: str = "",
    municipio: str = "",
    material: str = "todos",
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0, le=1000000),
):
    from adesivaria import candidate

    return candidate(
        candidate_id, ano, uf, partido, cargo, abrangencia, municipio, material, limit, offset
    )


@app.exception_handler(RuntimeError)
def runtime_error(_, exc: RuntimeError):
    return JSONResponse(
        {
            "error": "MotherDuck indisponível",
            "reason": "Verifique a conexão e a configuração do servidor.",
        },
        status_code=503,
    )


# Pain?is migrados: reutilizam a conex?o configurada deste portal.
from bdr_paineis import main as bdr_paineis


def _consultar_paineis(sql, params=()):
    try:
        with _lock:
            cur = _open().cursor()
            try:
                cur.execute('USE "pipeline_bdr_der_completo_v4".main')
                result = cur.execute(sql, list(params))
                columns = [item[0] for item in result.description]
                return [
                    dict(zip(columns, (float(v) if isinstance(v, Decimal) else v for v in row)))
                    for row in result.fetchall()
                ]
            finally:
                cur.close()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "N?o foi poss?vel consultar este recorte do acervo.")


def _coluna_ano_paineis():
    rows = _consultar_paineis('DESCRIBE "Participacao_Eleitoral"')
    columns = {row["column_name"].lower() for row in rows}
    return "ano" if "ano" in columns else "ano_participacao"


bdr_paineis.configure(_consultar_paineis, DB, _coluna_ano_paineis)
app.include_router(bdr_paineis.app.router, prefix="/api/bdr")

from exhibition import router as exhibition_router

app.include_router(exhibition_router)
from legenda_investigacao import router as legenda_investigacao_router

app.include_router(legenda_investigacao_router)
from contexto import router as contexto_router

app.include_router(contexto_router)
from catalogo import router as catalogo_router

app.include_router(catalogo_router)

from pesquisa import router as pesquisa_router

app.include_router(pesquisa_router)
