"""Camada central de indicadores eleitorais e diagnósticos para o Arquivo da Democracia.

Todas as consultas são estritamente somente de leitura contra o MotherDuck v4.
Não gera dados fictícios nem simulações eleitorais.
"""
from __future__ import annotations
from core.sql import query_sql
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
    _rows(query_sql('compatibility/sql/indicadores/indicadores_diagnostico_base_01.sql', fragment_0=db))
    
    tabelas_principais = [
        'Candidato', 'Candidatura', 'Cargo', 'Censo_Municipio',
        'Despesa_Candidatura', 'Eleicao', 'Municipio', 'Participacao_Eleitoral',
        'Partido', 'Patrimonio_Candidato', 'Resultado_Candidatura', 'Votos_Partido_Municipio'
    ]
    
    # 1. Contagens das tabelas
    contagens_tabelas = {}
    for tab in tabelas_principais:
        try:
            r = _rows(query_sql('compatibility/sql/indicadores/indicadores_diagnostico_base_07.sql', fragment_0=db, fragment_1=tab))
            contagens_tabelas[tab] = r[0]['n']
        except Exception:
            contagens_tabelas[tab] = {'erro': 'Consulta indisponível ou sem permissão'}

    # 2. Views do Q9
    views_q9 = {}
    for v in ['vw_q9_resumo_categorias', 'vw_q9_regras_categorias', 'vw_q9_despesas_normalizadas']:
        try:
            r = _rows(query_sql('compatibility/sql/indicadores/indicadores_diagnostico_base_08.sql', fragment_0=db, fragment_1=v))
            views_q9[v] = r[0]['n']
        except Exception:
            views_q9[v] = None

    # 3. Cobertura territorial por UF
    cobertura_ufs = {}
    try:
        m_rows = _rows(query_sql('compatibility/sql/indicadores/indicadores_diagnostico_base_02.sql', fragment_0=db, fragment_1=db))
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
        e_rows = _rows(query_sql('compatibility/sql/indicadores/indicadores_diagnostico_base_03.sql', fragment_0=db))
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
        'schema': _rows(query_sql('compatibility/sql/indicadores/indicadores_diagnostico_base_04.sql')),
        'cobertura_ano_cargo_uf': _rows(query_sql('compatibility/sql/indicadores/indicadores_diagnostico_base_05.sql', fragment_0=db, fragment_1=db)),
        'classificacoes_resultado': _rows(query_sql('compatibility/sql/indicadores/indicadores_diagnostico_base_06.sql', fragment_0=db)),
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

    sql = query_sql('compatibility/sql/indicadores/indicadores_indicador_resultado_01.sql', fragment_0=db, fragment_1=db, fragment_2=db, fragment_3=db)
    rows = _rows(sql, [ano, cargo, uf, uf, mun_id, mun_id, partido, partido])
    summary = rows[0] if rows else {}

    # Por partido
    sql_partidos = query_sql('compatibility/sql/indicadores/indicadores_indicador_resultado_02.sql', fragment_0=db, fragment_1=db, fragment_2=db, fragment_3=db)
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

    sql = query_sql('compatibility/sql/indicadores/indicadores_indicador_gastos_01.sql', fragment_0=db, fragment_1=db, fragment_2=db, fragment_3=db)
    rows = _rows(sql, [ano, cargo, uf, uf, mun_id, mun_id, partido, partido])
    summary = rows[0] if rows else {}

    # Faixas/quartis de gasto
    sql_quartis = query_sql('compatibility/sql/indicadores/indicadores_indicador_gastos_02.sql', fragment_0=db, fragment_1=db, fragment_2=db, fragment_3=db)
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

    sql_cobertura = query_sql('compatibility/sql/indicadores/indicadores_indicador_patrimonio_01.sql', fragment_0=db, fragment_1=db, fragment_2=db)
    cob = _rows(sql_cobertura, [ano, cargo, uf, uf, mun_id, mun_id])[0]

    # Quartis de patrimônio
    sql_quartis = query_sql('compatibility/sql/indicadores/indicadores_indicador_patrimonio_02.sql', fragment_0=db, fragment_1=db, fragment_2=db)
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
    
    sql = query_sql('compatibility/sql/indicadores/indicadores_indicador_legenda_01.sql', fragment_0=db, fragment_1=db, fragment_2=db)
    evolucao = _rows(sql, [cargo, anos[0], anos[1], uf, uf])
    
    # Detalhamento por partido no ano mais recente
    sql_partidos = query_sql('compatibility/sql/indicadores/indicadores_indicador_legenda_02.sql', fragment_0=db, fragment_1=db, fragment_2=db, fragment_3=db)
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

    sql = query_sql('compatibility/sql/indicadores/indicadores_indicador_transicoes_01.sql', fragment_0=db, fragment_1=db, fragment_2=db, fragment_3=db, fragment_4=db)
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

    sql = query_sql('compatibility/sql/indicadores/indicadores_indicador_territorio_01.sql', fragment_0=db, fragment_1=db, fragment_2=db)
    rows = _rows(sql, [ano, uf, uf])

    # Correlações por UF
    sql_corr = query_sql('compatibility/sql/indicadores/indicadores_indicador_territorio_02.sql', fragment_0=db, fragment_1=db, fragment_2=db)
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

    sql = query_sql('compatibility/sql/indicadores/indicadores_indicador_escolaridade_01.sql', fragment_0=db, fragment_1=db, fragment_2=db)
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

    sql = query_sql('compatibility/sql/indicadores/indicadores_indicador_juventude_01.sql', fragment_0=db, fragment_1=db, fragment_2=db, fragment_3=db)
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
    sql = query_sql('compatibility/sql/indicadores/indicadores_indicador_trajetorias_01.sql', fragment_0=db, fragment_1=db, fragment_2=db)
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
        view_sql = query_sql('compatibility/sql/indicadores/indicadores_indicador_propaganda_02.sql', fragment_0=db)
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

    sql_fallback = query_sql('compatibility/sql/indicadores/indicadores_indicador_propaganda_01.sql', fragment_0=db)
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

