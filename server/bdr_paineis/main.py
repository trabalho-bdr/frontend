"""API somente leitura do mapa de apuração (FastAPI + DuckDB/MotherDuck).

Rodar na raiz do repositório: uv run uvicorn frontend.main:app --port 8000
Variáveis: BDR_BANCO (banco DER local ou md:pipeline_bdr_der_completo_v3),
MOTHERDUCK_TOKEN (somente no servidor), BDR_CORS (origens separadas por vírgula).
"""
import logging
import os
import threading
import time
from functools import lru_cache
from pathlib import Path

import duckdb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .consultas_apuracao import consulta
from . import q2, q9, q9_evolucao

RAIZ = Path(__file__).resolve().parents[1]

def _obter_banco_padrao():
    env_banco = os.environ.get("BDR_BANCO")
    if env_banco:
        return env_banco if env_banco.startswith("md:") or env_banco == ":memory:" else str((RAIZ / env_banco).resolve())
    for caminho in (
        "dados_bdr/saida/pipeline_bdr_der_completo_v3.duckdb",
        "pipeline_bdr_der/dados_bdr/saida/pipeline_bdr_der_completo_v3.duckdb",
    ):
        arquivo = RAIZ / caminho
        if os.path.isfile(arquivo):
            return str(arquivo)
    return "md:pipeline_bdr_der_completo_v3"

BANCO = _obter_banco_padrao()
UFS = {"CE", "MA", "MS", "RJ", "RN", "RS"}
log = logging.getLogger("api")
app = FastAPI(title="Apuração BDR", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_methods=["GET"], allow_headers=[],
                   allow_origins=os.environ.get("BDR_CORS", "http://localhost:5173").split(","))
_con, _lock = None, threading.Lock()


def _configurar_search_path(cursor):
    """Prefere o DER quando existe; bancos novos podem ter somente main."""
    try:
        cursor.execute("SET search_path = 'der_bdr,main'")
    except duckdb.CatalogException:
        cursor.execute("SET search_path = 'main'")


def _conexao():
    """Uma conexão por processo; cada requisição usa seu próprio cursor (thread-safe no DuckDB)."""
    global _con
    with _lock:
        if _con is None:
            if BANCO.startswith("md:"):
                token = os.environ.get("MOTHERDUCK_TOKEN") or os.environ.get("motherduck_token")
                if not token:
                    raise RuntimeError("Configure MOTHERDUCK_TOKEN no processo da API para consultar o banco online")
                os.environ["motherduck_token"] = token
                _con = duckdb.connect(BANCO)
                _configurar_search_path(_con)
            else:
                _con = duckdb.connect(BANCO, read_only=True)
        return _con


def _consultar(sql, params=()):
    try:
        cur = _conexao().cursor()
        try:
            if BANCO.startswith("md:"):
                # Os cursores DuckDB não herdam o search_path da conexão.
                _configurar_search_path(cur)
            cur.execute(sql, list(params))
            colunas = [d[0] for d in cur.description]
            return [dict(zip(colunas, r)) for r in cur.fetchall()]
        finally:
            cur.close()
    except Exception:  # não vaza detalhes internos nem credenciais
        log.exception("falha de consulta")
        detalhe = ("Banco online não configurado: defina MOTHERDUCK_TOKEN no processo da API"
                   if BANCO.startswith("md:") and not (os.environ.get("MOTHERDUCK_TOKEN") or os.environ.get("motherduck_token"))
                   else "Dados indisponíveis no momento")
        raise HTTPException(503, detalhe)


def _limpo(v):
    if isinstance(v, float) and v != v:
        return None
    return float(v) if hasattr(v, "as_tuple") else v


_col_ano = None

def _obter_coluna_ano():
    global _col_ano
    if _col_ano is None:
        try:
            cols = [c[0].lower() for c in _conexao().execute('DESCRIBE "Participacao_Eleitoral"').fetchall()]
            _col_ano = "ano" if "ano" in cols else "ano_participacao"
        except Exception:
            _col_ano = "ano"
    return _col_ano


@app.get("/anos")
def anos():
    col = _obter_coluna_ano()
    r = _consultar(f'SELECT DISTINCT {col} AS ano FROM "Participacao_Eleitoral" WHERE {col} IS NOT NULL ORDER BY 1')
    return {"anos": [x["ano"] for x in r]}


@app.get("/q3/{uf}/{ano}")
def q3(uf: str, ano: int):
    """Indicadores municipais (Q3) de uma UF/ano. Chave = código IBGE (Municipio.id_municipio)."""
    uf = uf.upper()
    if uf not in UFS:
        raise HTTPException(422, "UF fora do recorte")
    if ano not in set(anos()["anos"]):
        raise HTTPException(422, "Ano sem dados de participação")
    sql = consulta("q3_municipios")
    if _obter_coluna_ano() == "ano":
        sql = sql.replace("p.ano_participacao", "p.ano")
    linhas = _consultar(sql, [ano, uf])
    saida = {str(r["id_municipio"]).zfill(7): {k: _limpo(v) for k, v in r.items()} for r in linhas}
    return {"uf": uf, "ano": ano, "municipios": saida}


@app.get("/legenda/opcoes")
def opcoes_legenda():
    if _tem_view_legenda():
        linhas = _consultar('''
            SELECT ano, cargo FROM "vw_legenda_municipio_partido"
            GROUP BY ano, cargo HAVING sum(votos_legenda) > 0
            ORDER BY ano DESC, cargo
        ''')
    else:
        linhas = _consultar('''
        SELECT e.ano, e.cargo
        FROM "Votos_Partido_Municipio" v
        JOIN "Eleicao" e ON e.id_eleicao = v.id_eleicao
        WHERE v.turno = 1 AND e.turno = 1 AND e.ano IS NOT NULL
          AND e.cargo IN ('Deputado Federal', 'Deputado Estadual', 'Vereador')
        GROUP BY e.ano, e.cargo HAVING sum(coalesce(v.votos_legenda, 0)) > 0
        ORDER BY e.ano DESC, e.cargo
        ''')
    return {"opcoes": linhas}


def _tem_view_legenda():
    return bool(_consultar('''
        SELECT 1 AS presente FROM information_schema.tables
        WHERE table_catalog = current_database()
          AND table_schema IN ('der_bdr', 'main')
          AND lower(table_name) = 'vw_legenda_municipio_partido'
        LIMIT 1
    '''))


@app.get("/legenda/{uf}/{ano}")
def votos_legenda(uf: str, ano: int, cargo: str):
    uf = uf.upper()
    if uf not in UFS:
        raise HTTPException(422, "UF fora do recorte")
    if (ano, cargo) not in {(r["ano"], r["cargo"]) for r in opcoes_legenda()["opcoes"]}:
        raise HTTPException(422, "Ano ou cargo sem votos partidários")
    if _tem_view_legenda():
        linhas = _consultar('''
            SELECT id_municipio, municipio, id_partido, partido,
                   sum(votos_legenda)::BIGINT AS votos_legenda,
                   sum(votos_nominais)::BIGINT AS votos_nominais
            FROM "vw_legenda_municipio_partido"
            WHERE uf = ? AND ano = ? AND cargo = ?
            GROUP BY id_municipio, municipio, id_partido, partido
            ORDER BY municipio, partido
        ''', [uf, ano, cargo])
    else:
        linhas = _consultar('''
        SELECT m.id_municipio, m.nome AS municipio, pa.id_partido, pa.sigla AS partido,
               sum(coalesce(v.votos_legenda, 0))::BIGINT AS votos_legenda,
               sum(coalesce(v.votos_nominais, 0))::BIGINT AS votos_nominais
        FROM "Votos_Partido_Municipio" v
        JOIN "Eleicao" e ON e.id_eleicao = v.id_eleicao
        JOIN "Municipio" m ON m.id_municipio = v.id_municipio
        JOIN "Partido" pa ON pa.id_partido = v.id_partido
        WHERE m.uf = ? AND e.ano = ? AND e.cargo = ? AND v.turno = 1 AND e.turno = 1
        GROUP BY m.id_municipio, m.nome, pa.id_partido, pa.sigla
        ORDER BY m.nome, pa.sigla
        ''', [uf, ano, cargo])
    return {"uf": uf, "ano": ano, "cargo": cargo, "linhas": linhas}


@app.get("/q2/opcoes")
def opcoes_q2():
    return q2.opcoes(_consultar)


@lru_cache(maxsize=24)
def _municipios_q2_cache(banco, ano, cargo, uf):
    return q2.municipios(_consultar, ano, cargo, uf)


@app.get("/q2/municipios")
def municipios_q2(ano: int | None = None, cargo: str | None = None, uf: str | None = None, atualizar: bool = False):
    if atualizar:
        _municipios_q2_cache.cache_clear()
    return _municipios_q2_cache(BANCO, ano, cargo, uf)


@lru_cache(maxsize=96)
def _resumo_q2_cache(banco, ano, cargo, uf, municipio):
    return q2.resumo(_consultar, ano, cargo, uf, municipio)


@app.get("/q2/patrimonio")
def patrimonio_q2(ano: int | None = None, cargo: str | None = None, uf: str | None = None,
                  municipio: str | None = None, atualizar: bool = False):
    if atualizar:
        _resumo_q2_cache.cache_clear()
    return _resumo_q2_cache(BANCO, ano, cargo, uf, municipio)


@app.get("/q9/opcoes")
def opcoes_q9():
    return q9.opcoes(_consultar)


@app.get("/q9/partidos")
def partidos_q9(cargo: str, uf: str | None = None):
    return q9_evolucao.partidos(_consultar, cargo, uf)


@lru_cache(maxsize=32)
def _evolucao_q9_cache(banco, cargo, uf, id_partido, id_candidato, criterio, janela):
    return q9_evolucao.resumo(_consultar, cargo, uf, id_partido, id_candidato, criterio)


@app.get("/q9/evolucao")
def evolucao_q9(cargo: str, uf: str | None = None, id_partido: str | None = None,
                id_candidato: str | None = None, criterio: str = 'sugeridas', atualizar: bool = False):
    if atualizar:
        _evolucao_q9_cache.cache_clear()
    return _evolucao_q9_cache(BANCO, cargo, uf, id_partido, id_candidato, criterio, int(time.monotonic() // 180))


@lru_cache(maxsize=24)
def _resumo_q9_cache(banco, ano, cargo, uf, criterio, janela, id_candidatura=None):
    return q9.resumo(_consultar, ano, cargo, uf, criterio, id_candidatura)


@app.get("/q9/candidatos")
def candidatos_q9(ano: int, cargo: str, busca: str, uf: str | None = None):
    return q9.candidatos(_consultar, ano, cargo, busca, uf)


@app.get("/q9/despesas")
def despesas_q9(ano: int, cargo: str, uf: str | None = None,
                criterio: str = 'sugeridas', atualizar: bool = False, id_candidatura: str | None = None):
    if atualizar:
        _resumo_q9_cache.cache_clear()
    return _resumo_q9_cache(BANCO, ano, cargo, uf, criterio, int(time.monotonic() // 180), id_candidatura)
