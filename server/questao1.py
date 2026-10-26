"""Módulo da Questão 1: "Qual o custo financeiro por cadeira?"

Reportagem interativa sobre gastos de campanha, representação e votação.
Metodologia rigorosa:
- Valores monetários são nominais.
- Gasto agregado por cadeira = soma das despesas declaradas no recorte / candidaturas eleitas.
- Despesa declarada por voto = despesa da candidatura / votos nominais (somente votos > 0).
- Eleições suplementares são excluídas.
- Suplentes e resultados indefinidos têm tratamento estatístico explícito.
- Correlações e associações não implicam relação causal.
- Disponível para Presidente nos anos de eleição presidencial (2018 e 2022).
"""
from __future__ import annotations
import math
import re
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix='/api/questao1', tags=['questao1'])

DB = 'pipeline_bdr_der_completo_v4'
UF_VALIDAS = {'CE', 'MA', 'MS', 'RJ', 'RN', 'RS'}
CARGOS_VALIDOS = {'VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'PRESIDENTE'}
ANOS_VALIDOS = {2018, 2020, 2022, 2024}
PERFIL_EXPRESSIONS = {
    'escolaridade': "coalesce(nullif(trim(c.escolaridade_candidatura), ''), 'Não informado')",
    'idade': "CASE WHEN c.idade_eleicao IS NULL THEN 'Não informado' WHEN c.idade_eleicao < 30 THEN '18–29 anos' WHEN c.idade_eleicao < 45 THEN '30–44 anos' WHEN c.idade_eleicao < 60 THEN '45–59 anos' ELSE '60 anos ou mais' END",
    'patrimonio': "CASE WHEN c.patrimonio IS NULL OR c.patrimonio < 0 THEN 'Não informado' WHEN c.patrimonio = 0 THEN 'R$ 0 declarado' WHEN c.patrimonio <= 100000 THEN 'Até R$ 100 mil' WHEN c.patrimonio <= 1000000 THEN 'R$ 100 mil a R$ 1 milhão' ELSE 'Mais de R$ 1 milhão' END",
    'gasto': "CASE WHEN c.gastos_campanha_total IS NULL OR c.gastos_campanha_total < 0 THEN 'Não informado' WHEN c.gastos_campanha_total = 0 THEN 'R$ 0 declarado' WHEN c.gastos_campanha_total <= 10000 THEN 'Até R$ 10 mil' WHEN c.gastos_campanha_total <= 100000 THEN 'R$ 10 mil a R$ 100 mil' ELSE 'Mais de R$ 100 mil' END",
}

# Dados auditados oficiais do TSE para a eleição presidencial (2018 e 2022)


def _valida_recorte(ano: int, cargo: str, uf: str | None = None, municipio_id: str | None = None):
    cargo = (cargo or '').strip().upper()
    uf = (uf or '').strip().upper()
    municipio_id = (municipio_id or '').strip()

    if ano not in ANOS_VALIDOS:
        raise HTTPException(400, f'Ano {ano} inválido. Anos permitidos: {sorted(ANOS_VALIDOS)}')
    if cargo not in CARGOS_VALIDOS:
        raise HTTPException(400, f'Cargo {cargo} inválido. Cargos permitidos: {sorted(CARGOS_VALIDOS)}')

    # Validação de comparabilidade de pleitos
    if cargo == 'VEREADOR' and ano not in (2020, 2024):
        raise HTTPException(400, f'Eleições municipais para Vereador ocorrem em 2020 e 2024.')
    if cargo in ('DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'PRESIDENTE') and ano not in (2018, 2022):
        raise HTTPException(400, f'Eleições gerais para {cargo} ocorrem em 2018 e 2022.')

    if cargo == 'PRESIDENTE':
        # Eleição presidencial é nacional, não é restrita a uma das 6 UFs
        uf = ''
        municipio_id = ''
    elif uf and uf not in UF_VALIDAS:
        raise HTTPException(400, f'UF {uf} fora da cobertura disponível ({sorted(UF_VALIDAS)})')

    if municipio_id and not re.fullmatch(r'\d{6,8}', municipio_id):
        raise HTTPException(400, 'Código de município inválido')

    # Cargo estadual/federal não possui recorte municipal estrito
    if cargo != 'VEREADOR':
        municipio_id = ''

    return ano, cargo, uf, municipio_id


def _rows(sql, params):
    from app import _rows as run
    return run(sql, params)


@router.get('/partidos')
def get_partidos(ano: int = 2024, cargo: str = 'VEREADOR', uf: str = ''):
    ano, cargo, uf, _ = _valida_recorte(ano, cargo, uf)
    if cargo == 'PRESIDENTE':
        return {'partidos': []}
    sql = f"""SELECT DISTINCT p.sigla partido FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        JOIN {DB}.main.Partido p USING(id_partido)
        WHERE e.ano=? AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
          AND c.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR c.uf=?)
        ORDER BY p.sigla"""
    return {'partidos': [row['partido'] for row in _rows(sql, [ano, cargo, uf, uf])]}


@router.get('/eleitos')
def get_eleitos(ano: int = 2024, cargo: str = 'VEREADOR', uf: str = '', municipio_id: str = '',
                partido: str = '', perfil: str = '', grupo: str = '',
                limit: int = Query(72, ge=1, le=72)):
    """Nomes com resultado de eleito para identificar cadeiras da maquete.

    O limite serve apenas à visualização; a contagem integral vem do overview.
    """
    ano, cargo, uf, municipio_id = _valida_recorte(ano, cargo, uf, municipio_id)
    if cargo == 'PRESIDENTE':
        return {'rows': [], 'limit': limit, 'criterio': 'A maquete representa disputas legislativas.'}
    filtros = ["e.ano = ?", "UPPER(e.cargo) = ?", "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'",
               "UPPER(r.resultado) LIKE 'ELEITO%'", "c.uf IN ('CE','MA','MS','RJ','RN','RS')"]
    params = [ano, cargo]
    if uf:
        filtros.append('c.uf = ?')
        params.append(uf)
    if municipio_id:
        filtros.append('c.id_municipio = ?')
        params.append(municipio_id)
    if partido:
        filtros.append('UPPER(p.sigla) = ?')
        params.append(partido.strip().upper())
    if perfil or grupo:
        if perfil not in PERFIL_EXPRESSIONS or not grupo or len(grupo) > 120:
            raise HTTPException(400, 'Perfil selecionado inválido')
        filtros.append(f"({PERFIL_EXPRESSIONS[perfil]}) = ?")
        params.append(grupo)
    sql = f"""SELECT DISTINCT c.id_candidatura id, c.id_candidato, c.id_municipio municipio_id, c.nome_urna nome, p.sigla partido,
        c.uf, m.nome municipio, r.votos, r.resultado,
        c.gastos_campanha_total gastos, c.patrimonio, c.idade_eleicao idade,
        c.escolaridade_candidatura escolaridade, e.ano, UPPER(e.cargo) cargo
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        WHERE {' AND '.join(filtros)}
        ORDER BY r.votos DESC NULLS LAST, c.id_candidatura
        LIMIT ?"""
    rows = _rows(sql, [*params, limit])
    return {'rows': rows, 'limit': limit, 'criterio': 'Candidaturas eleitas do recorte, ordenadas por votos nominais. Lista limitada para a maquete.'}


@router.get('/explorar')
def get_explorar(ano: int = 2024, cargo: str = 'VEREADOR', uf: str = '',
                 municipio_id: str = '', partido: str = '', visao: str = 'estado',
                 indicador: str = 'agregado', perfil: str = 'gasto'):
    """Agregados da mesma coorte para as cinco leituras do custo de uma cadeira."""
    ano, cargo, uf, municipio_id = _valida_recorte(ano, cargo, uf, municipio_id)
    if cargo == 'PRESIDENTE':
        raise HTTPException(400, 'A investigação por cadeira aceita apenas cargos legislativos.')
    if visao not in ('estado', 'municipio', 'partido', 'perfil', 'evolucao'):
        raise HTTPException(400, 'Visão desconhecida')
    if indicador not in ('agregado', 'mediana', 'taxa'):
        raise HTTPException(400, 'Indicador desconhecido')
    if perfil not in PERFIL_EXPRESSIONS:
        raise HTTPException(400, 'Perfil desconhecido')
    if indicador == 'taxa' and (visao != 'perfil' or perfil != 'gasto'):
        raise HTTPException(400, 'A taxa por faixa de gasto exige a visão Perfil > Gasto')
    if visao == 'municipio' and (cargo != 'VEREADOR' or not uf):
        raise HTTPException(400, 'Selecione uma UF e vereador para comparar municípios')
    partido = (partido or '').strip().upper()
    if partido and (len(partido) > 35 or not re.fullmatch(r'[\wÀ-ÿ .-]+', partido)):
        raise HTTPException(400, 'Sigla partidária inválida')

    anos = (2020, 2024) if cargo == 'VEREADOR' else (2018, 2022)
    years = list(anos) if visao == 'evolucao' else [ano]
    filters = [f"e.ano IN ({','.join('?' for _ in years)})", 'UPPER(e.cargo) = ?',
               "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'",
               "c.uf IN ('CE','MA','MS','RJ','RN','RS')"]
    params = [*years, cargo]
    # Na visão por estado, manter as seis UFs para permitir comparação e destacar a selecionada.
    if uf and visao != 'estado':
        filters.append('c.uf = ?')
        params.append(uf)
    if municipio_id and visao not in ('estado', 'municipio'):
        filters.append('c.id_municipio = ?')
        params.append(municipio_id)
    if partido:
        filters.append('UPPER(p.sigla) = ?')
        params.append(partido)

    dimension = {
        'estado': 'c.uf',
        'municipio': "coalesce(m.nome, c.id_municipio)",
        'partido': "coalesce(p.sigla, 'Não informado')",
        'evolucao': 'cast(e.ano AS VARCHAR)',
        'perfil': PERFIL_EXPRESSIONS[perfil],
    }[visao]
    sql = f"""WITH base AS (
        SELECT {dimension} AS grupo, c.id_municipio municipio_id, c.id_candidatura,
          CASE WHEN isfinite(c.gastos_campanha_total) AND c.gastos_campanha_total >= 0
            THEN c.gastos_campanha_total END AS gasto,
          CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END AS eleito,
          CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' OR UPPER(r.resultado) IN
            ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 1 ELSE 0 END AS definido
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        WHERE {' AND '.join(filters)}
    ) SELECT grupo, {'municipio_id' if visao == 'municipio' else 'MIN(municipio_id)'} municipio_id,
        COUNT(*) candidaturas,
        COUNT(gasto) com_gasto, COUNT(*) FILTER (WHERE gasto IS NULL) sem_gasto,
        SUM(eleito) eleitos, SUM(definido) resultado_definido,
        ROUND(SUM(gasto),2) total_despesas,
        ROUND(SUM(gasto)/NULLIF(SUM(eleito),0),2) gasto_por_cadeira,
        ROUND(MEDIAN(gasto) FILTER (WHERE eleito=1),2) mediana_eleitos,
        ROUND(100.0*SUM(eleito)/NULLIF(SUM(definido),0),2) taxa_eleicao
      FROM base GROUP BY grupo{', municipio_id' if visao == 'municipio' else ''} ORDER BY grupo LIMIT 1200"""
    rows = _rows(sql, params)
    for row in rows:
        row['valor'] = row[{'agregado': 'gasto_por_cadeira', 'mediana': 'mediana_eleitos', 'taxa': 'taxa_eleicao'}[indicador]]
        row['parcial'] = bool(row['sem_gasto'])
    return {'ano': ano, 'cargo': cargo, 'uf': uf, 'municipio_id': municipio_id,
            'partido': partido, 'visao': visao, 'indicador': indicador, 'perfil': perfil,
            'anos_comparaveis': list(anos), 'rows': rows, 'source': 'live',
            'method': 'Primeiro turno ordinário; seis UFs. Despesa ausente não é zero. Gastos nominais.'}


@router.get('/overview')
def get_overview(
    ano: int = 2024,
    cargo: str = 'VEREADOR',
    uf: str = '',
    municipio_id: str = ''
):
    """Retorna indicadores agregados do custo por cadeira e estatísticas descritivas."""
    ano, cargo, uf, municipio_id = _valida_recorte(ano, cargo, uf, municipio_id)


    filtros = ["e.ano = ?", "UPPER(e.cargo) = ?", "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"]
    params = [ano, cargo]

    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)
    if municipio_id:
        filtros.append("c.id_municipio = ?")
        params.append(municipio_id)

    where_clause = " AND ".join(filtros)

    # 1. Agregação principal
    sql_main = f"""
        SELECT 
          COUNT(*) total_candidaturas,
          COUNT(c.gastos_campanha_total) candidaturas_com_gasto,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total = 0) candidaturas_gasto_zero,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > 0) candidaturas_gasto_positivo,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')) nao_eleitos,
          COUNT(*) FILTER (WHERE r.votos IS NOT NULL AND r.votos > 0) com_votos,
          ROUND(SUM(c.gastos_campanha_total), 2) total_despesas,
          ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) gasto_por_cadeira,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 2) mediana_gastos_eleitos,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) mediana_gastos_nao_eleitos,
          ROUND(MEDIAN(r.votos) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 2) mediana_votos_eleitos,
          ROUND(MEDIAN(r.votos) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) mediana_votos_nao_eleitos,
          ROUND(MEDIAN(c.gastos_campanha_total / NULLIF(r.votos, 0)) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%' AND c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_custo_voto_eleitos,
          ROUND(MEDIAN(c.gastos_campanha_total / NULLIF(r.votos, 0)) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') AND c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_custo_voto_nao_eleitos
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
    """
    res = _rows(sql_main, params)
    data = res[0] if res else {}

    # 2. Série temporal comparativa do mesmo cargo
    anos_serie = (2020, 2024) if cargo == 'VEREADOR' else (2018, 2022)
    serie_filtros = ["e.ano IN (?, ?)", "UPPER(e.cargo) = ?", "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"]
    serie_params = [*anos_serie, cargo]
    if uf:
        serie_filtros.append("c.uf = ?")
        serie_params.append(uf)
    if municipio_id:
        serie_filtros.append("c.id_municipio = ?")
        serie_params.append(municipio_id)

    sql_serie = f"""
        SELECT e.ano,
          ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) gasto_por_cadeira,
          ROUND(SUM(c.gastos_campanha_total), 2) total_despesas,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
          COUNT(*) total_candidaturas,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 2) mediana_eleitos
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {' AND '.join(serie_filtros)}
        GROUP BY 1 ORDER BY 1
    """
    serie_rows = _rows(sql_serie, serie_params)

    # 3. Distribuição territorial por UF (quando não filtrado por município)
    por_uf = []
    if not municipio_id:
        sql_uf = f"""
            SELECT c.uf,
              COUNT(*) candidaturas,
              COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
              ROUND(SUM(c.gastos_campanha_total), 2) total_despesas,
              ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) gasto_por_cadeira
            FROM {DB}.main.Candidatura c
            JOIN {DB}.main.Eleicao e USING(id_eleicao)
            LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
            WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
              AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
              AND (? = '' OR c.uf = ?)
            GROUP BY 1 ORDER BY gasto_por_cadeira DESC
        """
        por_uf = _rows(sql_uf, [ano, cargo, uf, uf])

    # 4. Descobertas dinâmicas ("O que os números revelam?")
    insights = []

    # Descoberta A: Eleito mais econômico por voto
    sql_econ = f"""
        SELECT c.nome_urna nome, p.sigla partido, c.uf, m.nome municipio,
          c.gastos_campanha_total gastos, r.votos,
          ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
          AND c.gastos_campanha_total IS NOT NULL AND c.gastos_campanha_total > 0
          AND r.votos IS NOT NULL AND r.votos > 0
          AND UPPER(r.resultado) LIKE 'ELEITO%'
        ORDER BY custo_voto ASC, r.votos DESC
        LIMIT 1
    """
    r_econ = _rows(sql_econ, params)
    if r_econ:
        cand = r_econ[0]
        local = f"{cand['municipio']}/{cand['uf']}" if cand.get('municipio') else cand['uf']
        insights.append({
            'tipo': 'eleito_mais_economico',
            'titulo': 'Menor despesa por voto entre eleitos',
            'destaque': f"R$ {cand['custo_voto']:.2f}".replace('.', ','),
            'candidato': f"{cand['nome']} ({cand['partido']} · {local})",
            'detalhe': f"Declarou R$ {cand['gastos']:,.2f} e recebeu {cand['votos']:,} votos.".replace(',', 'X').replace('.', ',').replace('X', '.'),
            'criterio': 'Candidatura eleita com votos > 0 e despesas informadas > 0 no recorte selecionado.',
            'limitacao': 'Valores declarados na prestação de contas eleitoral oficial.'
        })

    # Descoberta B: Não eleito que mais gastou
    sql_nao_eleito_top = f"""
        SELECT c.nome_urna nome, p.sigla partido, c.uf, m.nome municipio,
          c.gastos_campanha_total gastos, r.votos, r.resultado,
          ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
          AND c.gastos_campanha_total IS NOT NULL
          AND UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')
        ORDER BY c.gastos_campanha_total DESC
        LIMIT 1
    """
    r_nao = _rows(sql_nao_eleito_top, params)
    if r_nao:
        cand = r_nao[0]
        local = f"{cand['municipio']}/{cand['uf']}" if cand.get('municipio') else cand['uf']
        insights.append({
            'tipo': 'maior_gasto_nao_eleito',
            'titulo': 'Maior despesa entre não eleitos',
            'destaque': f"R$ {cand['gastos']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
            'candidato': f"{cand['nome']} ({cand['partido']} · {local})",
            'detalhe': f"Recebeu {cand['votos'] or 0:,} votos ({cand['resultado']}). Custo por voto de R$ {(cand['custo_voto'] or 0):.2f}.".replace(',', 'X').replace('.', ',').replace('X', '.'),
            'criterio': 'Candidatura não eleita ou suplente com maior volume de gastos declarados.',
            'limitacao': 'Grandes orçamentos aumentam alcance, mas não garantem quociente eleitoral.'
        })

    # Descoberta C: Comparação de medianas eleitos vs não eleitos
    med_eleitos = data.get('mediana_gastos_eleitos') or 0
    med_nao = data.get('mediana_gastos_nao_eleitos') or 0
    if med_eleitos > 0 and med_nao > 0:
        razao = med_eleitos / med_nao
        insights.append({
            'tipo': 'razao_medianas',
            'titulo': 'Disparidade entre eleitos e não eleitos',
            'destaque': f"{razao:.1f}× maior",
            'candidato': 'Mediana das candidaturas eleitas',
            'detalhe': f"A mediana de gastos dos eleitos foi R$ {med_eleitos:,.2f}, contra R$ {med_nao:,.2f} dos não eleitos.".replace(',', 'X').replace('.', ',').replace('X', '.'),
            'criterio': 'Razão entre medianas de despesas declaradas (robusto a valores atípicos/outliers).',
            'limitacao': 'Descreve diferença de distribuição financeira, sem estabelecer relação causal.'
        })

    # Descoberta D (se aplicável): Variação temporal entre as duas eleições do mesmo cargo
    if len(serie_rows) == 2 and serie_rows[0].get('gasto_por_cadeira') and serie_rows[1].get('gasto_por_cadeira'):
        v1 = serie_rows[0]['gasto_por_cadeira']
        v2 = serie_rows[1]['gasto_por_cadeira']
        variacao_pct = ((v2 - v1) / v1) * 100
        ano1 = serie_rows[0]['ano']
        ano2 = serie_rows[1]['ano']
        insights.append({
            'tipo': 'variacao_temporal',
            'titulo': f'Evolução do custo por cadeira ({ano1} → {ano2})',
            'destaque': f"{'+' if variacao_pct >= 0 else ''}{variacao_pct:.1f}%",
            'candidato': f"Variação nominal no cargo de {cargo.capitalize()}",
            'detalhe': f"Passou de R$ {v1:,.2f} ({ano1}) para R$ {v2:,.2f} ({ano2}).".replace(',', 'X').replace('.', ',').replace('X', '.'),
            'criterio': 'Comparação direta entre as duas eleições consecutivas disponíveis para o mesmo cargo.',
            'limitacao': 'Valores nominais sem correção inflacionária automática.'
        })

    return {
        'ano': ano,
        'cargo': cargo,
        'uf': uf,
        'municipio_id': municipio_id,
        'data': data,
        'serie_temporal': serie_rows,
        'por_uf': por_uf,
        'insights': insights[:3],
        'metadados': {
            'formula': 'Soma das despesas declaradas no recorte ÷ Candidaturas eleitas no mesmo recorte',
            'explicacao': 'Dividimos todas as despesas declaradas no recorte pela quantidade de candidaturas eleitas. O resultado representa uma média agregada de gasto por cadeira, não o gasto individual de cada eleito.',
            'aviso_maquete': 'As 72 cadeiras do modelo 3D constituem uma maquete cenográfica e simbólica para visualização e exploração; a contagem real de eleitos do recorte é informada numericamente no painel.',
            'unidade': 'R$ (Valores nominais declarados ao TSE)',
            'cobertura': '6 UFs auditadas (CE, MA, MS, RJ, RN, RS)'
        }
    }


@router.get('/ranking')
def get_ranking(
    ano: int = 2024,
    cargo: str = 'VEREADOR',
    uf: str = '',
    municipio_id: str = '',
    partido: str = '',
    filtro_resultado: str = 'todos',
    ordem: str = 'custo_voto',
    limit: int = Query(12, ge=1, le=50),
    offset: int = Query(0, ge=0, le=500000)
):
    """Ranking paginado calculado diretamente no backend considerando todo o universo filtrado."""
    ano, cargo, uf, municipio_id = _valida_recorte(ano, cargo, uf, municipio_id)
    lim = int(limit.default if hasattr(limit, 'default') else limit)
    off = int(offset.default if hasattr(offset, 'default') else offset)

    partido = (partido or '').strip().upper()
    if partido and (len(partido) > 35 or not re.fullmatch(r'[\wÀ-ÿ .-]+', partido)):
        raise HTTPException(400, 'Sigla partidária inválida')

    if filtro_resultado not in ('todos', 'eleitos', 'nao_eleitos'):
        raise HTTPException(400, "filtro_resultado deve ser 'todos', 'eleitos' ou 'nao_eleitos'")

    ordens = {
        'custo_voto': 'custo_voto DESC NULLS LAST, r.votos DESC NULLS LAST',
        'gastos': 'c.gastos_campanha_total DESC NULLS LAST, r.votos DESC NULLS LAST',
        'votos': 'r.votos DESC NULLS LAST, c.gastos_campanha_total DESC NULLS LAST'
    }
    if ordem not in ordens:
        raise HTTPException(400, f"Ordem inválida. Opções: {list(ordens.keys())}")


    filtros = [
        "e.ano = ?",
        "UPPER(e.cargo) = ?",
        "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"
    ]
    params = [ano, cargo]

    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)
    if municipio_id:
        filtros.append("c.id_municipio = ?")
        params.append(municipio_id)
    if partido:
        filtros.append("UPPER(p.sigla) = ?")
        params.append(partido)

    # Filtro de resultado com preservação estrita de indefinidos
    if filtro_resultado == 'eleitos':
        filtros.append("UPPER(r.resultado) LIKE 'ELEITO%'")
    elif filtro_resultado == 'nao_eleitos':
        filtros.append("UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')")
    else:
        filtros.append("(UPPER(r.resultado) LIKE 'ELEITO%' OR UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE'))")

    if ordem == 'custo_voto':
        filtros.append("c.gastos_campanha_total IS NOT NULL AND c.gastos_campanha_total > 0")
        filtros.append("r.votos IS NOT NULL AND r.votos > 0")

    where_clause = " AND ".join(filtros)

    sql = f"""
        SELECT 
          c.id_candidatura id,
          c.nome_urna nome,
          c.numero_urna numero,
          p.sigla partido,
          c.uf,
          m.nome municipio,
          UPPER(e.cargo) cargo,
          e.ano,
          c.gastos_campanha_total gastos,
          r.votos,
          r.resultado,
          CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END eleito,
          ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto,
          COUNT(*) OVER() total_encontrado
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
        ORDER BY {ordens[ordem]}, c.nome_urna, c.id_candidatura
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    rows = _rows(sql, params)

    total = rows[0]['total_encontrado'] if rows else 0
    clean_rows = [{k: v for k, v in row.items() if k != 'total_encontrado'} for row in rows]

    return {
        'rows': clean_rows,
        'total': total,
        'limit': limit,
        'offset': offset,
        'ordem': ordem,
        'filtro_resultado': filtro_resultado,
        'criterio_ordenacao': (
            'Despesa declarada por voto (R$ / votos nominais) em candidaturas com votos e gastos > 0'
            if ordem == 'custo_voto' else
            'Despesa total declarada de campanha em ordem decrescente'
            if ordem == 'gastos' else
            'Votos nominais recebidos em ordem decrescente'
        )
    }


@router.get('/dispersao')
def get_dispersao(
    ano: int = 2024,
    cargo: str = 'VEREADOR',
    uf: str = '',
    municipio_id: str = '',
    partido: str = '',
    max_pontos: int = Query(900, ge=100, le=2000)
):
    """Dados para o gráfico de dispersão: Despesas declaradas × Votos nominais."""
    ano, cargo, uf, municipio_id = _valida_recorte(ano, cargo, uf, municipio_id)
    max_p = int(max_pontos.default if hasattr(max_pontos, 'default') else max_pontos)

    partido = (partido or '').strip().upper()
    if partido and (len(partido) > 35 or not re.fullmatch(r'[\wÀ-ÿ .-]+', partido)):
        raise HTTPException(400, 'Sigla partidária inválida')


    filtros = [
        "e.ano = ?",
        "UPPER(e.cargo) = ?",
        "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'",
        "(UPPER(r.resultado) LIKE 'ELEITO%' OR UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE'))"
    ]
    params = [ano, cargo]

    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)
    if municipio_id:
        filtros.append("c.id_municipio = ?")
        params.append(municipio_id)
    if partido:
        filtros.append("UPPER(p.sigla) = ?")
        params.append(partido)

    where_clause = " AND ".join(filtros)

    # 1. Estatísticas de correlação, medianas e contagens de exclusão
    sql_stats = f"""
        SELECT 
          COUNT(*) total_universo,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0) validos_scatter,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total IS NULL OR c.gastos_campanha_total <= 0 OR r.votos IS NULL OR r.votos <= 0) excluidos_zero_ou_nulo,
          ROUND(CORR(c.gastos_campanha_total, r.votos) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 4) r_linear,
          ROUND(CORR(log10(c.gastos_campanha_total), log10(r.votos)) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 4) r_log,
          ROUND(POW(CORR(log10(c.gastos_campanha_total), log10(r.votos)) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 2), 4) r2_log,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_gastos_scatter,
          ROUND(MEDIAN(r.votos) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_votos_scatter
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
    """
    stats_res = _rows(sql_stats, params)
    stats = stats_res[0] if stats_res else {}

    total_validos = stats.get('validos_scatter') or 0
    amostrado = total_validos > max_pontos

    cota_eleitos = max_pontos // 2
    cota_nao_eleitos = max_pontos - cota_eleitos

    sql_pontos = f"""
        WITH base AS (
          SELECT 
            c.id_candidatura id,
            c.nome_urna nome,
            c.numero_urna numero,
            p.sigla partido,
            c.uf,
            m.nome municipio,
            ROUND(c.gastos_campanha_total, 2) gastos,
            r.votos,
            r.resultado,
            CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END eleito,
            ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto
          FROM {DB}.main.Candidatura c
          JOIN {DB}.main.Eleicao e USING(id_eleicao)
          LEFT JOIN {DB}.main.Partido p USING(id_partido)
          LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
          JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
          WHERE {where_clause}
            AND c.gastos_campanha_total IS NOT NULL AND c.gastos_campanha_total > 0
            AND r.votos IS NOT NULL AND r.votos > 0
        ),
        ranked AS (
          SELECT *,
            ROW_NUMBER() OVER(PARTITION BY eleito ORDER BY hash(id)) rn
          FROM base
        )
        SELECT id, nome, numero, partido, uf, municipio, gastos, votos, resultado, eleito, custo_voto
        FROM ranked
        WHERE (eleito = 1 AND rn <= ?) OR (eleito = 0 AND rn <= ?)
        ORDER BY eleito DESC, gastos DESC
    """
    pontos = _rows(sql_pontos, [*params, cota_eleitos, cota_nao_eleitos])

    return {
        'pontos': pontos,
        'total_exibido': len(pontos),
        'total_universo': stats.get('total_universo', 0),
        'total_validos': total_validos,
        'excluidos_zero_ou_nulo': stats.get('excluidos_zero_ou_nulo', 0),
        'amostrado': amostrado,
        'max_pontos': max_pontos,
        'medianas': {
            'gastos': stats.get('mediana_gastos_scatter', 0),
            'votos': stats.get('mediana_votos_scatter', 0)
        },
        'correlacao': {
            'r_log': stats.get('r_log'),
            'r2_log': stats.get('r2_log'),
            'r_linear': stats.get('r_linear'),
            'n': total_validos,
            'metodo': 'Coeficiente de correlação de Pearson calculado nas escalas logarítmicas log10(despesas) × log10(votos) para candidaturas com valores estritamente positivos.',
            'aviso_causalidade': 'A associação estatística indica correlação na base analisada, NÃO relação causal de compra de votos ou garantia de vitória.'
        }
    }


@router.get('/dossie')
def get_dossie(
    ano: int = 2024,
    cargo: str = 'VEREADOR',
    uf: str = ''
):
    """Dados consolidados para os 7 gráficos da Questão 1 (Dossiê 01)."""
    ano, cargo, uf, _ = _valida_recorte(ano, cargo, uf)


    filtros = [
        "e.ano = ?",
        "UPPER(e.cargo) = ?",
        "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"
    ]
    params = [ano, cargo]
    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)
    where_clause = " AND ".join(filtros)

    # 1. Por partido
    sql_partido = f"""
        SELECT 
          p.sigla partido,
          COUNT(*) candidaturas,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')) nao_eleitos,
          ROUND(SUM(c.gastos_campanha_total), 2) gasto_total,
          ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_por_cadeira,
          ROUND(MIN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) min_gasto,
          ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) q1_gasto,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) mediana_gasto,
          ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) q3_gasto,
          ROUND(MAX(c.gastos_campanha_total), 2) max_gasto,
          ROUND(MAX(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) max_outlier_nao_eleito
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
        GROUP BY 1
        ORDER BY custo_por_cadeira DESC NULLS LAST
    """
    por_partido = _rows(sql_partido, params)

    # 2. Por UF
    sql_uf = f"""
        SELECT c.uf,
          COUNT(*) candidaturas,
          COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
          ROUND(SUM(c.gastos_campanha_total), 2) gasto_total,
          ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_por_cadeira,
          ROUND(MIN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) min_gasto,
          ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) q1_gasto,
          ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) mediana_gasto,
          ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) q3_gasto,
          ROUND(MAX(c.gastos_campanha_total), 2) max_gasto,
          ROUND(MAX(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) max_outlier_nao_eleito
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        GROUP BY 1 ORDER BY custo_por_cadeira DESC NULLS LAST
    """
    por_uf = _rows(sql_uf, [ano, cargo])

    # 3. Comparação de cargos (Deputado Estadual vs Deputado Federal no ano geral)
    ano_geral = ano if ano in (2018, 2022) else 2022
    sql_comp = f"""
        WITH est AS (
          SELECT p.sigla partido,
            COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos_estadual,
            ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_estadual
          FROM {DB}.main.Candidatura c
          JOIN {DB}.main.Eleicao e USING(id_eleicao)
          JOIN {DB}.main.Partido p USING(id_partido)
          LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
          WHERE e.ano = ? AND UPPER(e.cargo) = 'DEPUTADO ESTADUAL' AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
          GROUP BY 1
        ), fed AS (
          SELECT p.sigla partido,
            COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos_federal,
            ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_federal
          FROM {DB}.main.Candidatura c
          JOIN {DB}.main.Eleicao e USING(id_eleicao)
          JOIN {DB}.main.Partido p USING(id_partido)
          LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
          WHERE e.ano = ? AND UPPER(e.cargo) = 'DEPUTADO FEDERAL' AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
          GROUP BY 1
        )
        SELECT est.partido, est.custo_estadual, est.eleitos_estadual, fed.custo_federal, fed.eleitos_federal
        FROM est JOIN fed USING(partido)
        ORDER BY fed.custo_federal DESC NULLS LAST
    """
    comparacao_cargos = _rows(sql_comp, [ano_geral, ano_geral])

    # 4. Histograma dos eleitos em 7 faixas
    faixas = [
        ('Até R$ 2 mil', 0, 2000),
        ('R$ 2 mil–5 mil', 2000, 5000),
        ('R$ 5 mil–15 mil', 5000, 15000),
        ('R$ 15 mil–50 mil', 15000, 50000),
        ('R$ 50 mil–150 mil', 50000, 150000),
        ('R$ 150 mil–500 mil', 150000, 500000),
        ('Acima de R$ 500 mil', 500000, 999999999)
    ] if cargo == 'VEREADOR' else [
        ('Até R$ 100 mil', 0, 100000),
        ('R$ 100k–250k', 100000, 250000),
        ('R$ 250k–500k', 250000, 500000),
        ('R$ 500k–1 mi', 500000, 1000000),
        ('R$ 1 mi–2 mi', 1000000, 2000000),
        ('R$ 2 mi–3,5 mi', 2000000, 3500000),
        ('Acima de R$ 3,5 mi', 3500000, 999999999)
    ]
    sql_hist = f"""
        SELECT 
          COUNT(*) FILTER (WHERE c.gastos_campanha_total <= ?) b1,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b2,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b3,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b4,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b5,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b6,
          COUNT(*) FILTER (WHERE c.gastos_campanha_total > ?) b7
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause} AND UPPER(r.resultado) LIKE 'ELEITO%'
    """
    hist_params = [
        *params,
        faixas[0][2],
        faixas[1][1], faixas[1][2],
        faixas[2][1], faixas[2][2],
        faixas[3][1], faixas[3][2],
        faixas[4][1], faixas[4][2],
        faixas[5][1], faixas[5][2],
        faixas[6][1]
    ]
    hist_rows = _rows(sql_hist, hist_params)
    hist_res = hist_rows[0] if hist_rows else {}
    tot_hist = sum(hist_res.get(f'b{i+1}', 0) for i in range(7)) or 1
    histograma_eleitos = [
        {
            'faixa': faixas[i][0],
            'eleitos': hist_res.get(f'b{i+1}', 0),
            'percentual': round(100.0 * hist_res.get(f'b{i+1}', 0) / tot_hist, 2)
        }
        for i in range(7)
    ]

    # 5. Pontos para dispersão
    sql_pontos = f"""
        SELECT 
          c.id_candidatura id,
          c.nome_urna nome,
          c.numero_urna numero,
          p.sigla partido,
          c.uf,
          m.nome municipio,
          ROUND(c.gastos_campanha_total, 2) gastos,
          r.votos,
          r.resultado,
          CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END eleito,
          ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
          AND c.gastos_campanha_total IS NOT NULL AND c.gastos_campanha_total > 0
          AND r.votos IS NOT NULL AND r.votos > 0
        LIMIT 200
    """
    pontos_dispersao = _rows(sql_pontos, params)

    return {
        'ano': ano,
        'cargo': cargo,
        'uf': uf,
        'por_partido': por_partido,
        'por_uf': por_uf,
        'comparacao_cargos': comparacao_cargos,
        'histograma_eleitos': histograma_eleitos,
        'pontos_dispersao': pontos_dispersao
    }
