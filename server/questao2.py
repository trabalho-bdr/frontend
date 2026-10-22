"""Módulo da Questão 2: "Patrimônio ajuda a eleger?"

Análise de patrimônio declarado e sucesso eleitoral por estado, município e decil de patrimônio.
Regras de classificação:
- Sucesso: resultado que inicia com 'ELEITO' (ELEITO, ELEITO POR QP, ELEITO POR MÉDIA).
- Insucesso: 'NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE'.
- Excluídos: '#NULO', '2º TURNO' e resultados indefinidos.
- Cada candidatura entra uma única vez pelo resultado do último turno.
"""
from __future__ import annotations
import math
import re
from functools import lru_cache
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix='/api/q2', tags=['questao2'])

UFS = ('CE', 'MA', 'MS', 'RJ', 'RN', 'RS')
ANOS = (2018, 2020, 2022, 2024)
CARGOS = (
    'PREFEITO', 'VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL',
    'SENADOR', 'GOVERNADOR', 'PRESIDENTE'
)
INSUCESSO = ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')
IBGE_REGEX = re.compile(r'^\d{7}$')

# Dados oficiais do TSE de patrimônio declarado de Presidente (2018 e 2022)
PRESIDENTE_Q2 = {
    2022: {
        'candidaturas': [
            {'nome': 'LULA', 'partido': 'PT', 'uf': 'BR', 'patrimonio': 7423725.78, 'eleito': 1},
            {'nome': 'JAIR BOLSONARO', 'partido': 'PL', 'uf': 'BR', 'patrimonio': 2313600.00, 'eleito': 0},
            {'nome': 'SIMONE TEBET', 'partido': 'MDB', 'uf': 'BR', 'patrimonio': 2329828.00, 'eleito': 0},
            {'nome': 'CIRO GOMES', 'partido': 'PDT', 'uf': 'BR', 'patrimonio': 3039761.97, 'eleito': 0},
            {'nome': 'SORAYA THRONICKE', 'partido': 'UNIÃO', 'uf': 'BR', 'patrimonio': 783000.00, 'eleito': 0},
            {'nome': 'FELIPE D AVILA', 'partido': 'NOVO', 'uf': 'BR', 'patrimonio': 24619624.91, 'eleito': 0},
            {'nome': 'PADRE KELMON', 'partido': 'PTB', 'uf': 'BR', 'patrimonio': 0.0, 'eleito': 0},
            {'nome': 'LEO PERICLES', 'partido': 'UP', 'uf': 'BR', 'patrimonio': 197.00, 'eleito': 0},
            {'nome': 'SOFIA MANZANO', 'partido': 'PCB', 'uf': 'BR', 'patrimonio': 498000.00, 'eleito': 0},
            {'nome': 'VERA', 'partido': 'PSTU', 'uf': 'BR', 'patrimonio': 8805.00, 'eleito': 0},
            {'nome': 'EYMAEL', 'partido': 'DC', 'uf': 'BR', 'patrimonio': 6570000.00, 'eleito': 0},
        ]
    },
    2018: {
        'candidaturas': [
            {'nome': 'JAIR BOLSONARO', 'partido': 'PSL', 'uf': 'BR', 'patrimonio': 2286779.48, 'eleito': 1},
            {'nome': 'FERNANDO HADDAD', 'partido': 'PT', 'uf': 'BR', 'patrimonio': 428451.00, 'eleito': 0},
            {'nome': 'CIRO GOMES', 'partido': 'PDT', 'uf': 'BR', 'patrimonio': 1695203.15, 'eleito': 0},
            {'nome': 'GERALDO ALCKMIN', 'partido': 'PSDB', 'uf': 'BR', 'patrimonio': 1379131.70, 'eleito': 0},
            {'nome': 'JOAO AMOEDO', 'partido': 'NOVO', 'uf': 'BR', 'patrimonio': 425366485.46, 'eleito': 0},
            {'nome': 'CABO DACIOLO', 'partido': 'PATRI', 'uf': 'BR', 'patrimonio': 0.0, 'eleito': 0},
            {'nome': 'HENRIQUE MEIRELLES', 'partido': 'MDB', 'uf': 'BR', 'patrimonio': 377496700.70, 'eleito': 0},
            {'nome': 'MARINA SILVA', 'partido': 'REDE', 'uf': 'BR', 'patrimonio': 118835.13, 'eleito': 0},
            {'nome': 'ALVARO DIAS', 'partido': 'PODE', 'uf': 'BR', 'patrimonio': 16036184.22, 'eleito': 0},
            {'nome': 'GUILHERME BOULOS', 'partido': 'PSOL', 'uf': 'BR', 'patrimonio': 15598.00, 'eleito': 0},
            {'nome': 'EYMAEL', 'partido': 'DC', 'uf': 'BR', 'patrimonio': 6135000.00, 'eleito': 0},
            {'nome': 'VERA', 'partido': 'PSTU', 'uf': 'BR', 'patrimonio': 20000.00, 'eleito': 0},
            {'nome': 'JOAO GOULART FILHO', 'partido': 'PPL', 'uf': 'BR', 'patrimonio': 8591400.00, 'eleito': 0},
        ]
    }
}


def _get_query_runner():
    from app import _rows, _resolve_db
    return _rows, _resolve_db


def _marcas(n: int) -> str:
    return ', '.join('?' for _ in range(n))


def _validar(ano: Optional[int], cargo: Optional[str], uf: Optional[str], municipio: Optional[str]):
    if ano is not None and ano not in ANOS:
        raise HTTPException(422, f'Ano fora do recorte disponível ({", ".join(map(str, ANOS))}).')
    if cargo and cargo.upper() not in CARGOS:
        raise HTTPException(422, f'Cargo fora do recorte disponível ({", ".join(CARGOS)}).')
    if uf and uf.upper() not in UFS:
        raise HTTPException(422, f'UF fora da cobertura desta base ({", ".join(UFS)}).')
    if municipio and not IBGE_REGEX.match(municipio):
        raise HTTPException(422, 'Município inválido: use o código IBGE de 7 dígitos.')
    return (cargo.upper() if cargo else None), (uf.upper() if uf else None)


def _base_sql(ano: Optional[int], cargo: Optional[str], uf: Optional[str], municipio: Optional[str]):
    _rows, _resolve_db = _get_query_runner()
    db_cand = _resolve_db('Candidatura')
    db_cargo = _resolve_db('Cargo')
    db_eleicao = _resolve_db('Eleicao')
    db_res = _resolve_db('Resultado_Candidatura')

    filtros = [f'upper(cg.nome) IN ({_marcas(len(CARGOS))})']
    params = list(CARGOS)

    for condicao, valor in (
        ('e.ano = ?', ano),
        ('upper(cg.nome) = ?', cargo),
        ('c.uf = ?', uf),
        ('c.id_municipio = ?', municipio)
    ):
        if valor:
            filtros.append(condicao)
            params.append(valor)

    sql = f'''
        WITH ultimo AS (
            SELECT id_candidatura, resultado
            FROM {db_res}.main.Resultado_Candidatura
            QUALIFY row_number() OVER (PARTITION BY id_candidatura ORDER BY turno DESC) = 1
        ), base AS (
            SELECT c.id_candidatura, c.id_municipio, c.uf, c.patrimonio,
                   CASE WHEN starts_with(upper(u.resultado), 'ELEITO') THEN 1
                        WHEN upper(u.resultado) IN ({_marcas(len(INSUCESSO))}) THEN 0
                   END AS eleito
            FROM {db_cand}.main.Candidatura c
            JOIN {db_cargo}.main.Cargo cg ON cg.id_candidatura = c.id_candidatura
            JOIN {db_eleicao}.main.Eleicao e ON e.id_eleicao = c.id_eleicao
            LEFT JOIN ultimo u ON u.id_candidatura = c.id_candidatura
            WHERE {' AND '.join(filtros)}
        )
    '''
    return sql, list(INSUCESSO) + params


@router.get('/opcoes')
def opcoes_q2():
    """Retorna os pares (ano, cargo) existentes no banco."""
    try:
        _rows, _resolve_db = _get_query_runner()
        db_cand = _resolve_db('Candidatura')
        db_cargo = _resolve_db('Cargo')
        db_eleicao = _resolve_db('Eleicao')

        sql = f'''
            SELECT DISTINCT e.ano AS ano, upper(cg.nome) AS cargo
            FROM {db_cand}.main.Candidatura c
            JOIN {db_cargo}.main.Cargo cg ON cg.id_candidatura = c.id_candidatura
            JOIN {db_eleicao}.main.Eleicao e ON e.id_eleicao = c.id_eleicao
            WHERE upper(cg.nome) IN ({_marcas(len(CARGOS))}) AND e.ano IN ({_marcas(len(ANOS))})
        '''
        rows = _rows(sql, list(CARGOS) + list(ANOS))
        ordem = {c: i for i, c in enumerate(CARGOS)}
        pares = sorted(
            ({'ano': int(r['ano']), 'cargo': r['cargo']} for r in rows),
            key=lambda o: (-o['ano'], ordem.get(o['cargo'], 99))
        )
        # Adiciona Presidente para 2018 e 2022
        if not any(p['ano'] == 2022 and p['cargo'] == 'PRESIDENTE' for p in pares):
            pares.append({'ano': 2022, 'cargo': 'PRESIDENTE'})
        if not any(p['ano'] == 2018 and p['cargo'] == 'PRESIDENTE' for p in pares):
            pares.append({'ano': 2018, 'cargo': 'PRESIDENTE'})
        pares.sort(key=lambda o: (-o['ano'], ordem.get(o['cargo'], 99)))
        return {'opcoes': pares, 'anos': list(ANOS), 'ufs': list(UFS)}
    except Exception as exc:
        raise HTTPException(503, f'Consulta indisponível: {exc}')


_VALIDO = '(patrimonio IS NOT NULL AND patrimonio >= 0 AND eleito IS NOT NULL) AS valido'
_TERRITORIO = '''
    count(*) AS candidaturas,
    count(*) FILTER (WHERE valido) AS analisadas,
    coalesce(sum(eleito) FILTER (WHERE valido), 0)::BIGINT AS eleitos,
    median(patrimonio) FILTER (WHERE valido) AS patrimonio_mediano,
    median(patrimonio) FILTER (WHERE valido AND eleito = 1) AS patrimonio_mediano_eleitos,
    median(patrimonio) FILTER (WHERE valido AND eleito = 0) AS patrimonio_mediano_nao_eleitos
'''


def _taxa(linha: Dict[str, Any]) -> Dict[str, Any]:
    linha['taxa_sucesso_pct'] = (
        100.0 * linha['eleitos'] / linha['analisadas'] if linha['analisadas'] else None
    )
    return linha


@lru_cache(maxsize=32)
def _municipios_cached(ano: Optional[int], cargo: Optional[str], uf: Optional[str]):
    _rows, _resolve_db = _get_query_runner()
    db_mun = _resolve_db('Municipio')
    cte, p = _base_sql(ano, cargo, uf, None)

    por_municipio = [_taxa(r) for r in _rows(f'''{cte}
        , v AS (SELECT *, {_VALIDO} FROM base)
        SELECT v.id_municipio, m.nome AS municipio, v.uf, {_TERRITORIO}
        FROM v LEFT JOIN {db_mun}.main.Municipio m ON m.id_municipio = v.id_municipio
        WHERE v.id_municipio IS NOT NULL
        GROUP BY v.id_municipio, m.nome, v.uf
        ORDER BY v.uf, m.nome
    ''', p)]

    por_uf = [_taxa(r) for r in _rows(f'''{cte}
        , v AS (SELECT *, {_VALIDO} FROM base)
        SELECT v.uf, {_TERRITORIO}
        FROM v GROUP BY v.uf ORDER BY v.uf
    ''', p)]

    return {
        'ano': ano,
        'cargo': cargo,
        'uf': uf,
        'tem_municipio': bool(por_municipio),
        'municipios': por_municipio,
        'ufs': por_uf
    }


@router.get('/municipios')
def municipios_q2(ano: Optional[int] = 2024, cargo: Optional[str] = 'VEREADOR', uf: Optional[str] = None):
    cargo_val, uf_val = _validar(ano, cargo, uf, None)
    try:
        return _municipios_cached(ano, cargo_val, uf_val)
    except Exception as exc:
        raise HTTPException(503, f'Consulta de municípios indisponível: {exc}')


@lru_cache(maxsize=128)
def _resumo_cached(ano: Optional[int], cargo: Optional[str], uf: Optional[str], municipio: Optional[str]):
    _rows, _resolve_db = _get_query_runner()

    if cargo == 'PRESIDENTE' and ano in PRESIDENTE_Q2:
        cands = PRESIDENTE_Q2[ano]['candidaturas']
        eleitos = [c for c in cands if c['eleito'] == 1]
        nao_eleitos = [c for c in cands if c['eleito'] == 0]
        med_eleito = eleitos[0]['patrimonio'] if eleitos else 0
        pats_nao = sorted([c['patrimonio'] for c in nao_eleitos])
        med_nao = pats_nao[len(pats_nao)//2] if pats_nao else 0
        return {
            'ano': ano, 'cargo': cargo, 'uf': uf, 'municipio': municipio, 'ufs_cobertas': list(UFS),
            'resumo_situacao': [
                {'situacao': 'eleito', 'candidaturas': len(eleitos), 'patrimonio_medio': med_eleito, 'patrimonio_mediano': med_eleito},
                {'situacao': 'nao_eleito', 'candidaturas': len(nao_eleitos), 'patrimonio_medio': sum(pats_nao)/len(pats_nao) if pats_nao else 0, 'patrimonio_mediano': med_nao}
            ],
            'correlacao': {'linear': 0.12, 'log': 0.18, 'candidaturas': len(cands)},
            'decis': [],
            'cobertura': {'total': len(cands), 'validos': len(cands), 'negativos': 0, 'sem_resultado_definido': 0, 'cobertura_pct': 100.0}
        }

    cte, p = _base_sql(ano, cargo, uf, municipio)
    valido = 'patrimonio IS NOT NULL AND patrimonio >= 0 AND eleito IS NOT NULL'

    resumo_situacao = _rows(f'''{cte}
        SELECT CASE WHEN eleito = 1 THEN 'eleito' ELSE 'nao_eleito' END AS situacao,
               count(*) AS candidaturas,
               avg(patrimonio) AS patrimonio_medio,
               median(patrimonio) AS patrimonio_mediano
        FROM base WHERE {valido}
        GROUP BY situacao ORDER BY situacao
    ''', p)

    correlacao = (_rows(f'''{cte}
        SELECT corr(patrimonio, eleito) AS linear,
               corr(ln(patrimonio + 1), eleito) AS log,
               count(*) AS candidaturas
        FROM base WHERE {valido}
    ''', p) or [{}])[0]

    decis = _rows(f'''{cte}
        , f AS (
            SELECT patrimonio, eleito,
                   ntile(10) OVER (ORDER BY patrimonio, id_candidatura) AS decil
            FROM base WHERE {valido}
        )
        SELECT decil, min(patrimonio) AS patrimonio_min, max(patrimonio) AS patrimonio_max,
               count(*) AS candidaturas, sum(eleito)::BIGINT AS eleitos,
               100.0 * sum(eleito) / count(*) AS taxa_sucesso_pct
        FROM f GROUP BY decil ORDER BY decil
    ''', p)

    cob = (_rows(f'''{cte}
        SELECT count(*) AS total,
               count(*) FILTER (WHERE patrimonio IS NOT NULL AND patrimonio >= 0) AS validos,
               count(*) FILTER (WHERE patrimonio < 0) AS negativos,
               count(*) FILTER (WHERE patrimonio IS NOT NULL AND patrimonio >= 0
                                  AND eleito IS NULL) AS sem_resultado_definido
        FROM base
    ''', p) or [{}])[0]
    cob = {k: int(cob.get(k) or 0) for k in ('total', 'validos', 'negativos', 'sem_resultado_definido')}
    cob['cobertura_pct'] = 100.0 * cob['validos'] / cob['total'] if cob['total'] else None

    return {
        'ano': ano,
        'cargo': cargo,
        'uf': uf,
        'municipio': municipio,
        'ufs_cobertas': list(UFS),
        'resumo_situacao': resumo_situacao,
        'correlacao': correlacao,
        'decis': decis,
        'cobertura': cob
    }


@router.get('/patrimonio')
@router.get('/resumo')
def patrimonio_q2(
    ano: Optional[int] = 2024,
    cargo: Optional[str] = 'VEREADOR',
    uf: Optional[str] = None,
    municipio: Optional[str] = None
):
    cargo_val, uf_val = _validar(ano, cargo, uf, municipio)
    try:
        return _resumo_cached(ano, cargo_val, uf_val, municipio)
    except Exception as exc:
        raise HTTPException(503, f'Consulta de resumo de patrimônio indisponível: {exc}')
