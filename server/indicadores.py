"""Camada central de indicadores eleitorais e diagnósticos para o Arquivo da Democracia.

Todas as consultas são estritamente somente de leitura contra o MotherDuck v4.
Não gera dados fictícios nem simulações eleitorais.
"""
from __future__ import annotations
import math
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix='/api/indicadores', tags=['indicadores'])

UFS_VALIDAS = ('CE', 'MA', 'MS', 'RJ', 'RN', 'RS')
ANOS_VALIDOS = set(range(2002, 2026, 2))
CARGOS_PROPORCIONAIS = ('VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL')
CARGOS_TODOS = ('VEREADOR', 'PREFEITO', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'SENADOR', 'GOVERNADOR', 'PRESIDENTE')


def _get_runner():
    from core.dependencies import execute as _rows
    from core.config import DB
    return _rows, DB


def _clean_num(v: Any, dec: int = 2) -> Optional[float]:
    if v is None:
        return None
    try:
        val = float(v)
        if math.isnan(val) or math.isinf(val):
            return None
        return round(val, dec)
    except (TypeError, ValueError):
        return None


def diagnostico_base() -> Dict[str, Any]:
    """Diagnóstico exaustivo da base de dados MotherDuck v4 em tempo de execução."""
    _rows, db = _get_runner()
    # Fail before reporting connection status; table failures must never turn green.
    _rows(f'SELECT COUNT(*) n FROM {db}.main.Candidatura')
    
    tabelas_principais = [
        'Candidato', 'Candidatura', 'Cargo', 'Censo_Municipio',
        'Despesa_Candidatura', 'Eleicao', 'Municipio', 'Participacao_Eleitoral',
        'Partido', 'Patrimonio_Candidato', 'Resultado_Candidatura', 'Votos_Partido_Municipio'
    ]
    
    # 1. Contagens das tabelas
    contagens_tabelas = {}
    for tab in tabelas_principais:
        try:
            r = _rows(f'SELECT COUNT(*) n FROM {db}.main.{tab}')
            contagens_tabelas[tab] = r[0]['n']
        except Exception:
            contagens_tabelas[tab] = {'erro': 'Consulta indisponível ou sem permissão'}

    # 2. Views do Q9
    views_q9 = {}
    for v in ['vw_q9_resumo_categorias', 'vw_q9_regras_categorias', 'vw_q9_despesas_normalizadas']:
        try:
            r = _rows(f'SELECT COUNT(*) n FROM {db}.main.{v}')
            views_q9[v] = r[0]['n']
        except Exception:
            views_q9[v] = None

    # 3. Cobertura territorial por UF
    cobertura_ufs = {}
    try:
        m_rows = _rows(f'''
            SELECT m.uf, COUNT(DISTINCT m.id_municipio) municipios,
                   COUNT(c.id_candidatura) candidaturas
            FROM {db}.main.Municipio m
            LEFT JOIN {db}.main.Candidatura c ON c.id_municipio = m.id_municipio
            GROUP BY m.uf ORDER BY m.uf
        ''')
        for r in m_rows:
            cobertura_ufs[r['uf']] = {
                'municipios': r['municipios'],
                'candidaturas': r['candidaturas']
            }
    except Exception:
        cobertura_ufs = {'erro': 'Consulta indisponível ou sem permissão'}

    # 4. Cobertura por ano e cargo
    cobertura_eleicoes = []
    try:
        e_rows = _rows(f'''
            SELECT ano, UPPER(cargo) cargo, COUNT(*) pleitos
            FROM {db}.main.Eleicao
            WHERE tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
            GROUP BY 1, 2 ORDER BY 1 DESC, 2
        ''')
        cobertura_eleicoes = e_rows
    except Exception:
        pass

    return {
        'status': 'parcial' if any(isinstance(v, dict) for v in contagens_tabelas.values()) else 'conectado',
        'database': 'pipeline_bdr_der_completo_v4',
        'alias': db,
        'read_only': True,
        'consultado_em': datetime.now(timezone.utc).isoformat(),
        'tabelas_principais': contagens_tabelas,
        'views_q9': views_q9,
        'cobertura_territorial': cobertura_ufs,
        'ufs_auditadas': list(UFS_VALIDAS),
        'cobertura_eleicoes': cobertura_eleicoes,
        'schema': _rows("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_catalog=current_database() ORDER BY table_name,ordinal_position"),
        'cobertura_ano_cargo_uf': _rows(f'''SELECT e.ano,UPPER(e.cargo) cargo,c.uf,COUNT(DISTINCT c.id_candidatura) candidaturas
          FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
          WHERE e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' GROUP BY 1,2,3 ORDER BY 1,2,3'''),
        'classificacoes_resultado': _rows(f'SELECT resultado,turno,COUNT(*) registros FROM {db}.main.Resultado_Candidatura GROUP BY 1,2 ORDER BY 1,2'),
        'receitas_eleitorais': {
            'disponiveis': False,
            'motivo': 'A base MotherDuck v4 contém apenas despesas eleitorais; tabelas de receitas públicas/privadas não constam deste acervo.'
        }
    }


def indicador_resultado(ano: int = 2024, cargo: str = 'VEREADOR', uf: Optional[str] = None,
                        municipio: Optional[str] = None, partido: Optional[str] = None) -> Dict[str, Any]:
    """Indicadores de candidaturas e resultado eleitoral (sucesso, votos e taxas)."""
    _rows, db = _get_runner()
    cargo = cargo.upper().strip()
    uf = uf.upper().strip() if uf else ''
    partido = partido.upper().strip() if partido else ''
    mun_id = str(municipio).strip() if municipio else ''

    sql = f'''
        WITH base AS (
            SELECT c.id_candidatura, c.id_partido, p.sigla partido,
                   c.uf, c.id_municipio,
                   r.votos,
                   CASE 
                       WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 'ELEITO'
                       WHEN UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO') THEN 'NÃO ELEITO'
                       WHEN UPPER(r.resultado) = 'SUPLENTE' THEN 'SUPLENTE'
                       ELSE 'INDEFINIDO'
                   END situacao
            FROM {db}.main.Candidatura c
            JOIN {db}.main.Eleicao e ON c.id_eleicao = e.id_eleicao
            LEFT JOIN {db}.main.Partido p ON c.id_partido = p.id_partido
            LEFT JOIN {db}.main.Resultado_Candidatura r ON c.id_candidatura = r.id_candidatura AND r.turno = 1
            WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
              AND (? = '' OR c.uf = ?)
              AND (? = '' OR c.id_municipio = ?)
              AND (? = '' OR UPPER(p.sigla) = ?)
            QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
        )
        SELECT 
            COUNT(*) total_candidaturas,
            COUNT(*) FILTER(WHERE situacao = 'ELEITO') eleitos,
            COUNT(*) FILTER(WHERE situacao = 'NÃO ELEITO') nao_eleitos,
            COUNT(*) FILTER(WHERE situacao = 'SUPLENTE') suplentes,
            COUNT(*) FILTER(WHERE situacao = 'INDEFINIDO') indefinidos,
            COUNT(*) FILTER(WHERE situacao IN ('ELEITO', 'NÃO ELEITO', 'SUPLENTE')) definidos,
            ROUND(100.0 * COUNT(*) FILTER(WHERE situacao = 'ELEITO') / 
                  NULLIF(COUNT(*) FILTER(WHERE situacao IN ('ELEITO', 'NÃO ELEITO', 'SUPLENTE')), 0), 2) taxa_eleicao_pct,
            COALESCE(SUM(votos), 0) votos_nominais_totais,
            ROUND(MEDIAN(votos) FILTER(WHERE situacao = 'ELEITO'), 1) mediana_votos_eleitos,
            ROUND(MEDIAN(votos) FILTER(WHERE situacao != 'ELEITO'), 1) mediana_votos_nao_eleitos
        FROM base
    '''
    rows = _rows(sql, [ano, cargo, uf, uf, mun_id, mun_id, partido, partido])
    summary = rows[0] if rows else {}

    # Por partido
    sql_partidos = f'''
        WITH base AS (
            SELECT c.id_candidatura, p.sigla partido,
                   r.votos,
                   CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 
                        WHEN UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') THEN 0
                        ELSE NULL END eleito
            FROM {db}.main.Candidatura c
            JOIN {db}.main.Eleicao e ON c.id_eleicao = e.id_eleicao
            LEFT JOIN {db}.main.Partido p ON c.id_partido = p.id_partido
            LEFT JOIN {db}.main.Resultado_Candidatura r ON c.id_candidatura = r.id_candidatura AND r.turno = 1
            WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
              AND (? = '' OR c.uf = ?)
              AND (? = '' OR c.id_municipio = ?)
            QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
        )
        SELECT partido,
               COUNT(*) candidaturas,
               COUNT(*) FILTER(WHERE eleito = 1) eleitos,
               COUNT(*) FILTER(WHERE eleito IS NOT NULL) definidos,
               ROUND(100.0 * COUNT(*) FILTER(WHERE eleito = 1) / NULLIF(COUNT(*) FILTER(WHERE eleito IS NOT NULL), 0), 2) taxa_pct,
               COALESCE(SUM(votos), 0) votos_nominais
        FROM base
        WHERE partido IS NOT NULL
        GROUP BY 1 ORDER BY eleitos DESC, votos_nominais DESC LIMIT 30
    '''
    partidos_rows = _rows(sql_partidos, [ano, cargo, uf, uf, mun_id, mun_id])

    return {
        'recorte': {'ano': ano, 'cargo': cargo, 'uf': uf or 'seis UFs', 'municipio': mun_id, 'partido': partido},
        'resumo': summary,
        'bancadas_partido': partidos_rows,
        'fonte': 'Candidatura, Eleicao, Resultado_Candidatura, Partido',
        'database': 'pipeline_bdr_der_completo_v4'
    }


def indicador_gastos(ano: int = 2024, cargo: str = 'VEREADOR', uf: Optional[str] = None,
                     municipio: Optional[str] = None, partido: Optional[str] = None) -> Dict[str, Any]:
    """Indicadores de gastos de campanha, custo agregado por cadeira e quartis."""
    _rows, db = _get_runner()
    cargo = cargo.upper().strip()
    uf = uf.upper().strip() if uf else ''
    partido = partido.upper().strip() if partido else ''
    mun_id = str(municipio).strip() if municipio else ''

    sql = f'''
        WITH base AS (
            SELECT c.id_candidatura, c.gastos_campanha_total gastos, r.votos,
                   CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1
                        WHEN UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') THEN 0
                        ELSE NULL END eleito
            FROM {db}.main.Candidatura c
            JOIN {db}.main.Eleicao e ON c.id_eleicao = e.id_eleicao
            LEFT JOIN {db}.main.Partido p ON c.id_partido = p.id_partido
            LEFT JOIN {db}.main.Resultado_Candidatura r ON c.id_candidatura = r.id_candidatura AND r.turno = 1
            WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
              AND (? = '' OR c.uf = ?)
              AND (? = '' OR c.id_municipio = ?)
              AND (? = '' OR UPPER(p.sigla) = ?)
            QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
        ),
        valid AS (
            SELECT *, NTILE(4) OVER(ORDER BY gastos, id_candidatura) faixa
            FROM base
            WHERE gastos >= 0 AND eleito IS NOT NULL
        )
        SELECT 
            COUNT(*) candidaturas_analisadas,
            ROUND(SUM(gastos), 2) gasto_total_declarado,
            ROUND(MEDIAN(gastos), 2) mediana_geral,
            ROUND(SUM(gastos) / NULLIF(COUNT(*) FILTER(WHERE eleito = 1), 0), 2) gasto_agregado_por_cadeira,
            ROUND(MEDIAN(gastos) FILTER(WHERE eleito = 1), 2) mediana_eleitos,
            ROUND(MEDIAN(gastos) FILTER(WHERE eleito = 0), 2) mediana_nao_eleitos,
            COUNT(*) FILTER(WHERE eleito = 1) eleitos,
            COUNT(*) FILTER(WHERE eleito = 0) nao_eleitos
        FROM base
    '''
    rows = _rows(sql, [ano, cargo, uf, uf, mun_id, mun_id, partido, partido])
    summary = rows[0] if rows else {}

    # Faixas/quartis de gasto
    sql_quartis = f'''
        WITH base AS (
            SELECT c.id_candidatura, c.gastos_campanha_total gastos,
                   CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1
                        WHEN UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') THEN 0
                        ELSE NULL END eleito
            FROM {db}.main.Candidatura c
            JOIN {db}.main.Eleicao e ON c.id_eleicao = e.id_eleicao
            LEFT JOIN {db}.main.Partido p ON c.id_partido = p.id_partido
            LEFT JOIN {db}.main.Resultado_Candidatura r ON c.id_candidatura = r.id_candidatura AND r.turno = 1
            WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
              AND (? = '' OR c.uf = ?)
              AND (? = '' OR c.id_municipio = ?)
              AND (? = '' OR UPPER(p.sigla) = ?)
            QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
        ),
        valid AS (
            SELECT *, NTILE(4) OVER(ORDER BY gastos, id_candidatura) quartil
            FROM base WHERE gastos >= 0 AND eleito IS NOT NULL
        )
        SELECT quartil,
               COUNT(*) candidaturas,
               SUM(eleito) eleitos,
               ROUND(100.0 * AVG(eleito), 2) taxa_eleicao_pct,
               ROUND(MIN(gastos), 2) minimo,
               ROUND(MAX(gastos), 2) maximo,
               ROUND(MEDIAN(gastos), 2) mediana
        FROM valid GROUP BY 1 ORDER BY 1
    '''
    quartis = _rows(sql_quartis, [ano, cargo, uf, uf, mun_id, mun_id, partido, partido])

    return {
        'recorte': {'ano': ano, 'cargo': cargo, 'uf': uf or 'seis UFs', 'municipio': mun_id, 'partido': partido},
        'resumo': summary,
        'quartis': quartis,
        'metodo': 'Valores nominais declarados. Custo por cadeira = soma de todas as despesas ÷ total de cadeiras conquistadas.',
        'database': 'pipeline_bdr_der_completo_v4'
    }


def indicador_patrimonio(ano: int = 2024, cargo: str = 'VEREADOR', uf: Optional[str] = None,
                         municipio: Optional[str] = None) -> Dict[str, Any]:
    """Indicadores de patrimônio declarado, cobertura, decis e quartis (Q2)."""
    _rows, db = _get_runner()
    cargo = cargo.upper().strip()
    uf = uf.upper().strip() if uf else ''
    mun_id = str(municipio).strip() if municipio else ''

    sql_cobertura = f'''
        WITH base AS (
            SELECT c.id_candidatura, c.patrimonio,
                   CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1
                        WHEN UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') THEN 0
                        ELSE NULL END eleito
            FROM {db}.main.Candidatura c
            JOIN {db}.main.Eleicao e ON c.id_eleicao = e.id_eleicao
            LEFT JOIN {db}.main.Resultado_Candidatura r ON c.id_candidatura = r.id_candidatura AND r.turno = 1
            WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
              AND (? = '' OR c.uf = ?)
              AND (? = '' OR c.id_municipio = ?)
            QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
        )
        SELECT 
            COUNT(*) total,
            COUNT(*) FILTER(WHERE patrimonio IS NOT NULL AND patrimonio >= 0) validos,
            COUNT(*) FILTER(WHERE patrimonio < 0) negativos,
            COUNT(*) FILTER(WHERE patrimonio IS NULL) nao_informados,
            COUNT(*) FILTER(WHERE patrimonio >= 0 AND eleito IS NOT NULL) validos_com_resultado,
            ROUND(100.0 * COUNT(*) FILTER(WHERE patrimonio >= 0) / NULLIF(COUNT(*), 0), 2) cobertura_pct,
            ROUND(MEDIAN(patrimonio) FILTER(WHERE patrimonio >= 0), 2) mediana_geral,
            ROUND(MEDIAN(patrimonio) FILTER(WHERE patrimonio >= 0 AND eleito = 1), 2) mediana_eleitos,
            ROUND(MEDIAN(patrimonio) FILTER(WHERE patrimonio >= 0 AND eleito = 0), 2) mediana_nao_eleitos
        FROM base
    '''
    cob = _rows(sql_cobertura, [ano, cargo, uf, uf, mun_id, mun_id])[0]

    # Quartis de patrimônio
    sql_quartis = f'''
        WITH base AS (
            SELECT c.id_candidatura, c.patrimonio,
                   CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1
                        WHEN UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') THEN 0
                        ELSE NULL END eleito
            FROM {db}.main.Candidatura c
            JOIN {db}.main.Eleicao e ON c.id_eleicao = e.id_eleicao
            LEFT JOIN {db}.main.Resultado_Candidatura r ON c.id_candidatura = r.id_candidatura AND r.turno = 1
            WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
              AND (? = '' OR c.uf = ?)
              AND (? = '' OR c.id_municipio = ?)
            QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
        ),
        q AS (
            SELECT *, NTILE(4) OVER(ORDER BY patrimonio, id_candidatura) quartil
            FROM base WHERE patrimonio >= 0 AND eleito IS NOT NULL
        )
        SELECT quartil,
               COUNT(*) candidaturas,
               SUM(eleito) eleitos,
               ROUND(100.0 * AVG(eleito), 2) taxa_eleicao_pct,
               ROUND(MIN(patrimonio), 2) minimo,
               ROUND(MAX(patrimonio), 2) maximo,
               ROUND(MEDIAN(patrimonio), 2) mediana
        FROM q GROUP BY 1 ORDER BY 1
    '''
    quartis = _rows(sql_quartis, [ano, cargo, uf, uf, mun_id, mun_id])

    return {
        'recorte': {'ano': ano, 'cargo': cargo, 'uf': uf or 'seis UFs', 'municipio': mun_id},
        'cobertura': cob,
        'quartis': quartis,
        'metodo': 'Quartis de patrimônio declarado não negativo com resultado definido no primeiro turno.',
        'database': 'pipeline_bdr_der_completo_v4'
    }


def indicador_legenda(cargo: str = 'VEREADOR', uf: Optional[str] = None) -> Dict[str, Any]:
    """Indicador de participação do voto de legenda vs voto nominal (Q5)."""
    _rows, db = _get_runner()
    cargo = cargo.upper().strip()
    uf = uf.upper().strip() if uf else ''
    
    anos = (2020, 2024) if cargo == 'VEREADOR' else (2018, 2022)
    
    sql = f'''
        SELECT e.ano,
               SUM(v.votos_legenda) legenda,
               SUM(v.votos_nominais) nominais,
               SUM(v.votos_legenda + v.votos_nominais) total_votos,
               ROUND(100.0 * SUM(v.votos_legenda) / NULLIF(SUM(v.votos_legenda + v.votos_nominais), 0), 2) pct_legenda
        FROM {db}.main.Votos_Partido_Municipio v
        JOIN {db}.main.Eleicao e USING(id_eleicao)
        JOIN {db}.main.Municipio m USING(id_municipio)
        WHERE UPPER(e.cargo) = ? AND e.ano IN (?, ?) AND e.turno = 1 AND v.turno = 1
          AND (? = '' OR m.uf = ?)
        GROUP BY 1 ORDER BY 1
    '''
    evolucao = _rows(sql, [cargo, anos[0], anos[1], uf, uf])
    
    # Detalhamento por partido no ano mais recente
    sql_partidos = f'''
        SELECT p.sigla partido,
               SUM(v.votos_legenda) legenda,
               SUM(v.votos_nominais) nominais,
               SUM(v.votos_legenda + v.votos_nominais) total_votos,
               ROUND(100.0 * SUM(v.votos_legenda) / NULLIF(SUM(v.votos_legenda + v.votos_nominais), 0), 2) pct_legenda
        FROM {db}.main.Votos_Partido_Municipio v
        JOIN {db}.main.Eleicao e USING(id_eleicao)
        JOIN {db}.main.Partido p USING(id_partido)
        JOIN {db}.main.Municipio m USING(id_municipio)
        WHERE UPPER(e.cargo) = ? AND e.ano = ? AND e.turno = 1 AND v.turno = 1
          AND (? = '' OR m.uf = ?)
        GROUP BY 1 HAVING total_votos > 1000
        ORDER BY total_votos DESC LIMIT 20
    '''
    partidos = _rows(sql_partidos, [cargo, anos[1], uf, uf])

    return {
        'recorte': {'cargo': cargo, 'anos': list(anos), 'uf': uf or 'seis UFs'},
        'evolucao': evolucao,
        'partidos_ano_recente': partidos,
        'metodo': 'Votos de legenda ÷ (votos de legenda + nominais); 1º turno ordinário.',
        'database': 'pipeline_bdr_der_completo_v4'
    }


def indicador_transicoes(uf: Optional[str] = None) -> Dict[str, Any]:
    """Transições de partidos líderes nos municípios entre 2020 e 2024 (Q7)."""
    _rows, db = _get_runner()
    uf = uf.upper().strip() if uf else ''

    sql = f'''
        WITH votes AS (
            SELECT e.ano, v.id_municipio, v.id_partido,
                   SUM(v.votos_nominais + v.votos_legenda) total
            FROM {db}.main.Votos_Partido_Municipio v
            JOIN {db}.main.Eleicao e USING(id_eleicao)
            WHERE e.ano IN (2020, 2024) AND UPPER(e.cargo) = 'VEREADOR' AND e.turno = 1 AND v.turno = 1
              AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
            GROUP BY 1, 2, 3
        ),
        ranked AS (
            SELECT *, DENSE_RANK() OVER(PARTITION BY ano, id_municipio ORDER BY total DESC) pos
            FROM votes WHERE total > 0
        ),
        leaders AS (
            SELECT *, COUNT(*) OVER(PARTITION BY ano, id_municipio) leader_count
            FROM ranked WHERE pos = 1
        )
        SELECT m.id_municipio id, m.nome, m.uf,
               p.sigla origem, q.sigla destino,
               CASE WHEN p.sigla = q.sigla THEN 1 ELSE 0 END manteve
        FROM leaders a
        JOIN leaders b ON a.id_municipio = b.id_municipio AND a.ano = 2020 AND b.ano = 2024
        JOIN {db}.main.Municipio m ON m.id_municipio = a.id_municipio
        JOIN {db}.main.Partido p ON p.id_partido = a.id_partido
        JOIN {db}.main.Partido q ON q.id_partido = b.id_partido
        WHERE a.leader_count = 1 AND b.leader_count = 1
          AND (? = '' OR m.uf = ?)
        ORDER BY m.uf, m.nome
    '''
    municipios = _rows(sql, [uf, uf])
    
    total = len(municipios)
    manteve = sum(1 for m in municipios if m['manteve'] == 1)
    trocou = total - manteve

    # Matriz agregada origem -> destino
    transicoes_map = {}
    for m in municipios:
        key = (m['origem'], m['destino'])
        transicoes_map[key] = transicoes_map.get(key, 0) + 1
    
    matriz = [{'origem': k[0], 'destino': k[1], 'quantidade': v}
              for k, v in sorted(transicoes_map.items(), key=lambda x: -x[1])[:25]]

    return {
        'recorte': {'anos': [2020, 2024], 'cargo': 'VEREADOR', 'uf': uf or 'seis UFs'},
        'total_municipios_comparaveis': total,
        'mesmo_partido': manteve,
        'partido_diferente': trocou,
        'taxa_estabilidade_pct': round(100.0 * manteve / total, 2) if total else None,
        'principais_transicoes': matriz,
        'municipios': municipios,
        'metodo': 'Partido com maior soma de votos nominais + legenda para vereador no 1º turno; líderes empatados excluídos.',
        'database': 'pipeline_bdr_der_completo_v4'
    }


def indicador_territorio(ano: int = 2024, uf: Optional[str] = None) -> Dict[str, Any]:
    """Indicadores municipais de IDHM, PIB per capita e Abstenção (Q3)."""
    _rows, db = _get_runner()
    uf = uf.upper().strip() if uf else ''

    sql = f'''
        SELECT m.id_municipio id, m.nome, m.uf,
               c.populacao, c.idhm,
               ROUND(c.pib / NULLIF(c.populacao, 0), 2) pib_per_capita,
               p.eleitorado_apto eleitorado,
               p.abstencoes,
               ROUND(100.0 * p.taxa_abstencao, 2) abstencao_pct
        FROM {db}.main.Municipio m
        JOIN {db}.main.Participacao_Eleitoral p USING(id_municipio)
        LEFT JOIN {db}.main.Censo_Municipio c ON c.id_municipio = m.id_municipio AND c.ano_referencia = 2022
        WHERE p.ano_participacao = ?
          AND (? = '' OR m.uf = ?)
        ORDER BY m.uf, m.nome
    '''
    rows = _rows(sql, [ano, uf, uf])

    # Correlações por UF
    sql_corr = f'''
        WITH base AS (
            SELECT p.ano_participacao ano, m.uf, c.idhm,
                   c.pib / NULLIF(c.populacao, 0) pib_pc,
                   p.taxa_abstencao * 100 AS abstencao
            FROM {db}.main.Participacao_Eleitoral p
            JOIN {db}.main.Censo_Municipio c ON c.id_municipio = p.id_municipio AND c.ano_referencia = 2022
            JOIN {db}.main.Municipio m ON m.id_municipio = p.id_municipio
            WHERE p.ano_participacao = ?
        )
        SELECT uf,
               COUNT(*) municipios,
               ROUND(CORR(idhm, abstencao), 4) r_idhm,
               ROUND(CORR(pib_pc, abstencao), 4) r_pib_pc,
               ROUND(AVG(abstencao), 2) abstencao_media
        FROM base
        GROUP BY 1 ORDER BY 1
    '''
    correlacoes_por_uf = _rows(sql_corr, [ano])

    # Correlação geral do recorte
    valid_idhm = [(r['idhm'], r['abstencao_pct']) for r in rows if r['idhm'] is not None and r['abstencao_pct'] is not None]
    r_idhm_geral = None
    if len(valid_idhm) > 2:
        xs, ys = zip(*valid_idhm)
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        var_x = sum((x - mx) ** 2 for x in xs)
        var_y = sum((y - my) ** 2 for y in ys)
        cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
        if var_x > 0 and var_y > 0:
            r_idhm_geral = round(cov / math.sqrt(var_x * var_y), 4)

    return {
        'recorte': {'ano': ano, 'uf': uf or 'seis UFs'},
        'total_municipios': len(rows),
        'correlacao_idhm_abstencao_geral': r_idhm_geral,
        'correlacoes_por_uf': correlacoes_por_uf,
        'municipios': rows,
        'metodo': 'Censo 2022 (população e PIB); IDHM referente ao Censo 2010; abstenção oficial TSE do 1º turno.',
        'database': 'pipeline_bdr_der_completo_v4'
    }


def indicador_escolaridade(ano: int = 2024, cargo: str = 'VEREADOR', uf: Optional[str] = None) -> Dict[str, Any]:
    """Indicador de escolaridade declarada e taxa de eleição (Q4)."""
    _rows, db = _get_runner()
    cargo = cargo.upper().strip()
    uf = uf.upper().strip() if uf else ''

    sql = f'''
        WITH b AS (
            SELECT c.id_candidatura,
                   COALESCE(NULLIF(TRIM(c.escolaridade_candidatura), ''), 'NÃO INFORMADA') escolaridade,
                   r.resultado
            FROM {db}.main.Candidatura c
            JOIN {db}.main.Eleicao e USING(id_eleicao)
            LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura = c.id_candidatura AND r.turno = 1
            WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.turno = 1
              AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
              AND (? = '' OR c.uf = ?)
            QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
        )
        SELECT escolaridade,
               COUNT(*) candidaturas,
               COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%') eleitos,
               COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%' OR UPPER(resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')) definidos,
               ROUND(100.0 * COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%') /
                     NULLIF(COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%' OR UPPER(resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 0), 2) taxa_eleicao_pct
        FROM b
        GROUP BY 1 ORDER BY candidaturas DESC
    '''
    rows = _rows(sql, [ano, cargo, uf, uf])
    return {
        'recorte': {'ano': ano, 'cargo': cargo, 'uf': uf or 'seis UFs'},
        'rows': rows,
        'metodo': 'Escolaridade declarada. Taxa = eleitos ÷ candidaturas com resultado definido. Não afere escolaridade do eleitorado.',
        'database': 'pipeline_bdr_der_completo_v4'
    }


def indicador_juventude(cargo: str = 'VEREADOR', uf: Optional[str] = None) -> Dict[str, Any]:
    """Indicador de presença jovem entre candidaturas e eleitos (Q6)."""
    _rows, db = _get_runner()
    cargo = cargo.upper().strip()
    uf = uf.upper().strip() if uf else ''

    sql = f'''
        WITH x AS (
            SELECT e.ano, UPPER(e.cargo) cargo,
                   date_diff('year', p.dt_nascimento, e.data) - 
                   CASE WHEN strftime(e.data, '%m-%d') < strftime(p.dt_nascimento, '%m-%d') THEN 1 ELSE 0 END idade,
                   CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END eleito
            FROM {db}.main.Candidatura c
            JOIN {db}.main.Candidato p USING(id_candidato)
            JOIN {db}.main.Eleicao e USING(id_eleicao)
            LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura = c.id_candidatura AND r.turno = 1
            WHERE e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND UPPER(e.cargo) = ?
              AND (? = '' OR c.uf = ?)
            QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
        )
        SELECT ano,
               COUNT(*) candidaturas,
               COUNT(*) FILTER(WHERE idade BETWEEN 18 AND 29) candidaturas_jovens,
               ROUND(100.0 * COUNT(*) FILTER(WHERE idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER(WHERE idade IS NOT NULL), 0), 2) pct_jovens_candidaturas,
               COUNT(*) FILTER(WHERE eleito = 1) eleitos,
               COUNT(*) FILTER(WHERE eleito = 1 AND idade BETWEEN 18 AND 29) eleitos_jovens,
               ROUND(100.0 * COUNT(*) FILTER(WHERE eleito = 1 AND idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER(WHERE eleito = 1 AND idade IS NOT NULL), 0), 2) pct_jovens_eleitos
        FROM x
        WHERE ano IN (2018, 2020, 2022, 2024)
        GROUP BY 1 ORDER BY 1
    '''
    rows = _rows(sql, [cargo, uf, uf])
    return {
        'recorte': {'cargo': cargo, 'uf': uf or 'seis UFs'},
        'serie': rows,
        'metodo': 'Idade calculada pela data de nascimento e data da eleição. Faixa jovem: 18 a 29 anos. Ausência de nascimento excluída dos percentuais.',
        'database': 'pipeline_bdr_der_completo_v4'
    }


def indicador_trajetorias() -> Dict[str, Any]:
    """Indicadores de continuidade e trajetória histórica 2002–2024 (Q10)."""
    _rows, db = _get_runner()
    sql = f'''
        WITH observed AS (
            SELECT c.id_candidato,c.id_candidatura,c.id_partido,e.ano,UPPER(e.cargo) cargo,r.resultado
            FROM {db}.main.Candidatura c
            JOIN {db}.main.Eleicao e USING(id_eleicao)
            LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura = c.id_candidatura
            WHERE e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND e.ano BETWEEN 2002 AND 2024
            AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
            QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidato,e.ano,UPPER(e.cargo),c.uf,c.id_municipio
              ORDER BY e.turno DESC,r.turno DESC,c.id_candidatura)=1
        ), s AS (
            SELECT id_candidato,COUNT(DISTINCT ano) n_anos,COUNT(DISTINCT id_partido) n_partidos,
                   COUNT(DISTINCT cargo) n_cargos,
                   COUNT(DISTINCT CASE WHEN UPPER(resultado) LIKE 'ELEITO%' THEN id_candidatura END) vitorias
            FROM observed
            GROUP BY 1
        )
        SELECT 
            COUNT(*) total_pessoas,
            COUNT(*) FILTER(WHERE n_anos > 1) multi_anos,
            COUNT(*) FILTER(WHERE n_anos >= 3) tres_ou_mais_anos,
            COUNT(*) FILTER(WHERE n_partidos > 1) multi_partidos,
            COUNT(*) FILTER(WHERE n_cargos > 1) multi_cargos,
            COUNT(*) FILTER(WHERE vitorias >= 2) multi_vitorias,
            ROUND(100.0 * COUNT(*) FILTER(WHERE n_anos > 1) / NULLIF(COUNT(*), 0), 2) pct_retorno,
            ROUND(100.0 * COUNT(*) FILTER(WHERE n_partidos > 1) / NULLIF(COUNT(*), 0), 2) pct_troca_partido
        FROM s
    '''
    rows = _rows(sql)
    return {
        'recorte': {'periodo': '2002–2024', 'escopo': 'todas as candidaturas ordinárias das seis UFs'},
        'resumo': rows[0] if rows else {},
        'metodo': 'Pessoas identificadas pelo id_candidato do acervo. Não mede mandatos exercidos; apenas candidaturas observadas.',
        'database': 'pipeline_bdr_der_completo_v4'
    }


def indicador_propaganda() -> Dict[str, Any]:
    """Indicador de investimentos em propaganda eleitoral e materiais (Q9)."""
    _rows, db = _get_runner()
    try:
        view_sql = f'''
            SELECT grupo_despesa AS categoria,
                   SUM(registros_agregados) AS registros,
                   ROUND(SUM(valor_contratado), 2) AS total
            FROM {db}.main.vw_q9_resumo_categorias
            WHERE grupo_despesa IS NOT NULL AND grupo_despesa NOT IN ('Não informada', 'Não classificada — revisar')
            GROUP BY 1 ORDER BY total DESC LIMIT 24
        '''
        rows = _rows(view_sql)
        if rows:
            return {
                'source': 'vw_q9_resumo_categorias',
                'rows': rows,
                'metodo': 'Categorização padronizada de despesas eleitorais da base v4.',
                'database': 'pipeline_bdr_der_completo_v4'
            }
    except Exception:
        pass

    sql_fallback = f'''
        SELECT categoria, COUNT(*) registros, ROUND(SUM(valor), 2) total
        FROM {db}.main.Despesa_Candidatura
        WHERE categoria ILIKE '%SANTINH%' OR categoria ILIKE '%ADESIV%'
           OR categoria ILIKE '%BANDEIRA%' OR categoria ILIKE '%IMPRESS%'
        GROUP BY 1 ORDER BY total DESC LIMIT 24
    '''
    return {
        'source': 'Despesa_Candidatura',
        'rows': _rows(sql_fallback),
        'metodo': 'Filtro por termos de publicidade e material gráfico em Despesa_Candidatura.',
        'database': 'pipeline_bdr_der_completo_v4'
    }


def indicador_receitas() -> Dict[str, Any]:
    """Indicador de receitas públicas e privadas (Q8) - INDISPONÍVEL com explicação metodológica."""
    return {
        'status': 'indisponivel',
        'disponivel': False,
        'mensagem': (
            'A base de dados MotherDuck v4 contém apenas a tabela Despesa_Candidatura. '
            'Não existem tabelas de receitas eleitorais declaradas (doações de pessoas físicas, '
            'recursos próprios, Fundo Eleitoral ou Fundo Partidário) no acervo. '
            'Despesas não informam a origem do financiamento; nenhuma simulação ou aproximação '
            'substitui a prestação de contas de receitas do TSE.'
        ),
        'database': 'pipeline_bdr_der_completo_v4',
        'fontes_necessarias': ['Receitas_Candidatos_TSE', 'Origem_Recursos_Campanha']
    }


# Rotas da API
@router.get('/diagnostico')
def get_diagnostico():
    try:
        return diagnostico_base()
    except Exception:
        raise HTTPException(503, 'Não foi possível consultar a v4. Verifique configuração e permissões no servidor.')


@router.get('/resultado')
def get_resultado(ano: int = 2024, cargo: str = 'VEREADOR', uf: Optional[str] = None,
                  municipio: Optional[str] = None, partido: Optional[str] = None):
    return indicador_resultado(ano, cargo, uf, municipio, partido)


@router.get('/gastos')
def get_gastos(ano: int = 2024, cargo: str = 'VEREADOR', uf: Optional[str] = None,
               municipio: Optional[str] = None, partido: Optional[str] = None):
    return indicador_gastos(ano, cargo, uf, municipio, partido)


@router.get('/patrimonio')
def get_patrimonio(ano: int = 2024, cargo: str = 'VEREADOR', uf: Optional[str] = None,
                   municipio: Optional[str] = None):
    return indicador_patrimonio(ano, cargo, uf, municipio)


@router.get('/legenda')
def get_legenda(cargo: str = 'VEREADOR', uf: Optional[str] = None):
    return indicador_legenda(cargo, uf)


@router.get('/transicoes')
def get_transicoes(uf: Optional[str] = None):
    return indicador_transicoes(uf)


@router.get('/territorio')
def get_territorio(ano: int = 2024, uf: Optional[str] = None):
    return indicador_territorio(ano, uf)


@router.get('/escolaridade')
def get_escolaridade(ano: int = 2024, cargo: str = 'VEREADOR', uf: Optional[str] = None):
    return indicador_escolaridade(ano, cargo, uf)


@router.get('/juventude')
def get_juventude(cargo: str = 'VEREADOR', uf: Optional[str] = None):
    return indicador_juventude(cargo, uf)


@router.get('/trajetorias')
def get_trajetorias():
    return indicador_trajetorias()


@router.get('/propaganda')
def get_propaganda():
    return indicador_propaganda()


@router.get('/receitas')
def get_receitas():
    return indicador_receitas()

