"""Módulo da Questão 6: "Juventude, candidaturas e representação política"

Reportagem analítica e investigativa sobre a composição etária das candidaturas,
renovação partidária e distribuição territorial no Brasil (2018–2024).

Metodologia e Rigor Analítico:
- Idade calculada na data de referência da eleição:
    date_diff('year', dt_nascimento, data_eleicao) ajustado pelo dia e mês.
- Faixas etárias:
    * 18 a 29 anos (Juventude - Estatuto da Juventude / CF/88)
    * 30 a 44 anos
    * 45 a 59 anos
    * 60 anos ou mais
    * Sem idade válida (datas nulas, < 18 ou > 105 anos)
- Denominadores e Distinção Obrigatória:
    * Participação percentual de candidaturas: candidaturas da faixa / candidaturas com idade válida.
    * Participação entre eleitos: eleitos da faixa / total de eleitos com idade válida.
    * Taxa de eleição: eleitos da faixa / candidaturas da faixa com resultado eleitoral definido
      (eleitos, não eleitos e suplentes; nulos e indefinidos excluídos do denominador).
    * Participação entre eleitos != Taxa de eleição de jovens.
- Comparabilidade Temporal:
    * Eleições municipais (Vereador): comparar 2020 e 2024.
    * Eleições gerais (Deputado Estadual / Federal): comparar 2018 e 2022.
- Dimensão do Eleitorado:
    * A base v3 não possui distribuição etária do eleitorado municipal.
    * A idade dos candidatos NÃO representa a idade dos eleitores.
    * A investigação partidária por perfil de eleitorado é mantida explicitamente
      como análise complementar pendente de dados adicionais de perfil do eleitorado (TSE).
"""
from __future__ import annotations
import re
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix='/api/questao6', tags=['questao6'])

DB = 'v3'
UF_VALIDAS = {'CE', 'MA', 'MS', 'RJ', 'RN', 'RS'}
CARGOS_VALIDOS = {'VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL'}
ANOS_VALIDOS = {2018, 2020, 2022, 2024}


def _valida_recorte(ano: int, cargo: str, uf: str | None = None):
    cargo = (cargo or '').strip().upper()
    uf = (uf or '').strip().upper()

    if ano not in ANOS_VALIDOS:
        raise HTTPException(400, f'Ano {ano} inválido. Anos permitidos: {sorted(ANOS_VALIDOS)}')
    if cargo not in CARGOS_VALIDOS:
        raise HTTPException(400, f'Cargo {cargo} inválido. Cargos permitidos: {sorted(CARGOS_VALIDOS)}')

    if cargo == 'VEREADOR' and ano not in (2020, 2024):
        raise HTTPException(400, 'Eleições municipais para Vereador ocorrem em 2020 e 2024.')
    if cargo in ('DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL') and ano not in (2018, 2022):
        raise HTTPException(400, f'Eleições gerais para {cargo} ocorrem em 2018 e 2022.')

    if uf and uf not in UF_VALIDAS:
        raise HTTPException(400, f'UF {uf} fora da cobertura disponível ({sorted(UF_VALIDAS)})')

    return ano, cargo, uf


def _rows(sql: str, params: list | tuple = ()):
    from app import _rows as run
    return run(sql, params)


@router.get('/overview')
def get_overview(ano: int = 2024, cargo: str = 'VEREADOR', uf: str = ''):
    """Retorna o retrato geracional: candidaturas por faixa, eleitos e taxa de eleição."""
    ano, cargo, uf = _valida_recorte(ano, cargo, uf)

    filtros = ["e.ano = ?", "UPPER(e.cargo) = ?", "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"]
    params = [ano, cargo]
    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)

    where_clause = " AND ".join(filtros)

    sql = f"""
    WITH base AS (
        SELECT 
            c.id_candidatura,
            c.uf,
            date_diff('year', p.dt_nascimento, e.data) - 
                CASE WHEN strftime(e.data, '%m-%d') < strftime(p.dt_nascimento, '%m-%d') THEN 1 ELSE 0 END AS idade,
            UPPER(r.resultado) LIKE 'ELEITO%' AS eleito,
            UPPER(r.resultado) IN ('ELEITO', 'ELEITO POR QP', 'ELEITO POR MÉDIA', 'NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') AS definido,
            r.votos
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Candidato p USING(id_candidato)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
    ),
    faixas AS (
        SELECT *,
            CASE 
                WHEN idade IS NULL OR idade < 18 OR idade > 105 THEN 'Sem idade válida'
                WHEN idade BETWEEN 18 AND 29 THEN '18 a 29 anos'
                WHEN idade BETWEEN 30 AND 44 THEN '30 a 44 anos'
                WHEN idade BETWEEN 45 AND 59 THEN '45 a 59 anos'
                ELSE '60 anos ou mais'
            END AS faixa,
            CASE 
                WHEN idade IS NULL OR idade < 18 OR idade > 105 THEN 5
                WHEN idade BETWEEN 18 AND 29 THEN 1
                WHEN idade BETWEEN 30 AND 44 THEN 2
                WHEN idade BETWEEN 45 AND 59 THEN 3
                ELSE 4
            END AS ordem
        FROM base
    )
    SELECT 
        faixa,
        ordem,
        COUNT(*) candidaturas,
        COUNT(*) FILTER (WHERE definido) definidos,
        COUNT(*) FILTER (WHERE eleito) eleitos,
        ROUND(100.0 * COUNT(*) FILTER (WHERE eleito) / NULLIF(COUNT(*) FILTER (WHERE definido), 0), 2) taxa_eleicao,
        ROUND(AVG(votos), 1) media_votos,
        ROUND(MEDIAN(idade) FILTER (WHERE idade BETWEEN 18 AND 105), 1) mediana_idade_faixa
    FROM faixas
    GROUP BY 1, 2
    ORDER BY 2
    """

    rows = _rows(sql, params)

    total_candidaturas = sum(r['candidaturas'] for r in rows)
    total_eleitos = sum(r['eleitos'] for r in rows)
    total_definidos = sum(r['definidos'] for r in rows)

    validas = sum(r['candidaturas'] for r in rows if r['ordem'] < 5)
    eleitos_validos = sum(r['eleitos'] for r in rows if r['ordem'] < 5)
    sem_idade = sum(r['candidaturas'] for r in rows if r['ordem'] == 5)

    # Calcular participações percentuais relativas ao total com idade válida
    faixas_formatadas = []
    for r in rows:
        ordem = r['ordem']
        eh_valida = ordem < 5
        pct_cand = round(100.0 * r['candidaturas'] / validas, 2) if (eh_valida and validas > 0) else None
        pct_eleitos = round(100.0 * r['eleitos'] / eleitos_validos, 2) if (eh_valida and eleitos_validos > 0) else None

        faixas_formatadas.append({
            'faixa': r['faixa'],
            'ordem': ordem,
            'candidaturas': r['candidaturas'],
            'pct_candidaturas': pct_cand,
            'eleitos': r['eleitos'],
            'pct_eleitos': pct_eleitos,
            'definidos': r['definidos'],
            'taxa_eleicao': r['taxa_eleicao'],
            'media_votos': r['media_votos'],
            'mediana_idade': r['mediana_idade_faixa']
        })

    jovem = next((f for f in faixas_formatadas if f['ordem'] == 1), None)
    faixa_maior_taxa = max([f for f in faixas_formatadas if f['ordem'] < 5 and f['taxa_eleicao'] is not None],
                           key=lambda x: x['taxa_eleicao'], default=None)
    faixa_maior_volume = max([f for f in faixas_formatadas if f['ordem'] < 5],
                             key=lambda x: x['candidaturas'], default=None)

    # Descobertas calculadas
    descobertas = []
    if jovem and validas > 0:
        descobertas.append({
            'titulo': 'Participação e Sucesso dos Jovens',
            'valor': f"{jovem['pct_candidaturas']}%",
            'subtitulo': f"dos candidatos com idade válida têm entre 18 e 29 anos ({jovem['candidaturas']:,} de {validas:,}).",
            'comparativo': f"Entre os eleitos, representam {jovem['pct_eleitos']}% ({jovem['eleitos']:,} de {eleitos_validos:,}).",
            'taxa': f"Taxa de eleição da juventude: {jovem['taxa_eleicao']}%."
        })
    if faixa_maior_taxa:
        descobertas.append({
            'titulo': 'Faixa com Maior Taxa de Vitória',
            'valor': f"{faixa_maior_taxa['taxa_eleicao']}%",
            'subtitulo': f"A faixa '{faixa_maior_taxa['faixa']}' registrou a maior conversão de candidaturas em cadeiras.",
            'comparativo': f"{faixa_maior_taxa['eleitos']:,} eleitos em {faixa_maior_taxa['definidos']:,} candidaturas definidas.",
            'taxa': None
        })
    if faixa_maior_volume:
        descobertas.append({
            'titulo': 'Predomínio Numérico das Candidaturas',
            'valor': f"{faixa_maior_volume['pct_candidaturas']}%",
            'subtitulo': f"A faixa '{faixa_maior_volume['faixa']}' concentra a maior fração dos concorrentes ({faixa_maior_volume['candidaturas']:,}).",
            'comparativo': f"Média de votos do grupo: {faixa_maior_volume['media_votos'] or 0:.0f} votos nominais.",
            'taxa': None
        })

    return {
        'recorte': {
            'ano': ano,
            'cargo': cargo,
            'uf': uf or '6 UFs agregadas',
            'cobertura': 'CE, MA, MS, RJ, RN, RS'
        },
        'totais': {
            'total_candidaturas': total_candidaturas,
            'validas': validas,
            'sem_idade': sem_idade,
            'total_eleitos': total_eleitos,
            'total_definidos': total_definidos,
            'taxa_eleicao_geral': round(100.0 * total_eleitos / total_definidos, 2) if total_definidos else 0.0
        },
        'faixas': faixas_formatadas,
        'descobertas': descobertas,
        'metodologia': {
            'denominador_pct_candidaturas': 'Total de candidaturas com idade válida na data da eleição.',
            'denominador_pct_eleitos': 'Total de eleitos com idade válida na data da eleição.',
            'denominador_taxa_eleicao': 'Candidaturas da respectiva faixa com resultado definido (eleito, não eleito, suplente).',
            'nota': 'Idades calculadas na data do pleito. Registros sem data ou com valores anômalos (< 18 ou > 105) formam grupo separado.'
        }
    }


@router.get('/partidos')
def get_partidos(
    ano: int = 2024,
    cargo: str = 'VEREADOR',
    uf: str = '',
    ordem: str = 'pct_jovens',
    min_candidaturas: int = 15,
    busca: str = ''
):
    """Retorna a composição etária por partido (barras empilhadas a 100%)."""
    ano, cargo, uf = _valida_recorte(ano, cargo, uf)

    filtros = ["e.ano = ?", "UPPER(e.cargo) = ?", "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"]
    params = [ano, cargo]
    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)

    where_clause = " AND ".join(filtros)

    ordens_permitidas = {
        'pct_jovens': 'pct_jovens DESC, total_candidaturas DESC',
        'jovens_eleitos': 'jovens_eleitos DESC, pct_jovens DESC',
        'taxa_eleicao_jovens': 'taxa_eleicao_jovens DESC NULLS LAST, jovens_eleitos DESC',
        'total_candidaturas': 'total_candidaturas DESC, sigla ASC',
        'sigla': 'sigla ASC'
    }
    sql_ordem = ordens_permitidas.get(ordem, ordens_permitidas['pct_jovens'])

    sql = f"""
    WITH base AS (
        SELECT 
            c.id_candidatura,
            COALESCE(p_part.sigla, 'SEM SIGLA') sigla,
            COALESCE(p_part.nome, 'Sem Partido Registrado') partido_nome,
            date_diff('year', p.dt_nascimento, e.data) - 
                CASE WHEN strftime(e.data, '%m-%d') < strftime(p.dt_nascimento, '%m-%d') THEN 1 ELSE 0 END AS idade,
            UPPER(r.resultado) LIKE 'ELEITO%' AS eleito,
            UPPER(r.resultado) IN ('ELEITO', 'ELEITO POR QP', 'ELEITO POR MÉDIA', 'NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') AS definido
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p_part USING(id_partido)
        LEFT JOIN {DB}.main.Candidato p USING(id_candidato)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
    ),
    agrupado AS (
        SELECT 
            sigla,
            partido_nome,
            COUNT(*) total_candidaturas,
            COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 105) validas,
            COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 29) jovens,
            COUNT(*) FILTER (WHERE idade BETWEEN 30 AND 44) adultos_30_44,
            COUNT(*) FILTER (WHERE idade BETWEEN 45 AND 59) maduros_45_59,
            COUNT(*) FILTER (WHERE idade >= 60 AND idade <= 105) idosos_60_mais,
            COUNT(*) FILTER (WHERE idade IS NULL OR idade < 18 OR idade > 105) sem_idade,
            ROUND(100.0 * COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 105), 0), 2) pct_jovens,
            ROUND(100.0 * COUNT(*) FILTER (WHERE idade BETWEEN 30 AND 44) / NULLIF(COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 105), 0), 2) pct_adultos,
            ROUND(100.0 * COUNT(*) FILTER (WHERE idade BETWEEN 45 AND 59) / NULLIF(COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 105), 0), 2) pct_maduros,
            ROUND(100.0 * COUNT(*) FILTER (WHERE idade >= 60 AND idade <= 105) / NULLIF(COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 105), 0), 2) pct_idosos,
            COUNT(*) FILTER (WHERE eleito) eleitos_total,
            COUNT(*) FILTER (WHERE eleito AND idade BETWEEN 18 AND 29) jovens_eleitos,
            COUNT(*) FILTER (WHERE definido AND idade BETWEEN 18 AND 29) jovens_definidos,
            ROUND(100.0 * COUNT(*) FILTER (WHERE eleito AND idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER (WHERE definido AND idade BETWEEN 18 AND 29), 0), 2) taxa_eleicao_jovens,
            ROUND(100.0 * COUNT(*) FILTER (WHERE eleito) / NULLIF(COUNT(*) FILTER (WHERE definido), 0), 2) taxa_eleicao_geral
        FROM base
        GROUP BY 1, 2
        HAVING COUNT(*) >= ?
    )
    SELECT * FROM agrupado
    WHERE (? = '' OR strip_accents(sigla) ILIKE strip_accents(?) OR strip_accents(partido_nome) ILIKE strip_accents(?))
    ORDER BY {sql_ordem}
    """

    rows = _rows(sql, params + [min_candidaturas, busca, f'%{busca}%', f'%{busca}%'])

    return {
        'recorte': {'ano': ano, 'cargo': cargo, 'uf': uf or '6 UFs'},
        'total_partidos': len(rows),
        'min_candidaturas_filtro': min_candidaturas,
        'partidos': rows
    }


@router.get('/municipios')
def get_municipios(ano: int = 2024, cargo: str = 'VEREADOR', uf: str = ''):
    """Retorna os dados territoriais de candidaturas jovens por município para o Atlas."""
    ano, cargo, uf = _valida_recorte(ano, cargo, uf)

    filtros = ["e.ano = ?", "UPPER(e.cargo) = ?", "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"]
    params = [ano, cargo]
    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)

    where_clause = " AND ".join(filtros)

    sql = f"""
    WITH base AS (
        SELECT 
            c.id_candidatura,
            c.id_municipio,
            m.nome AS municipio_nome,
            c.uf,
            date_diff('year', p.dt_nascimento, e.data) - 
                CASE WHEN strftime(e.data, '%m-%d') < strftime(p.dt_nascimento, '%m-%d') THEN 1 ELSE 0 END AS idade,
            UPPER(r.resultado) LIKE 'ELEITO%' AS eleito,
            UPPER(r.resultado) IN ('ELEITO', 'ELEITO POR QP', 'ELEITO POR MÉDIA', 'NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') AS definido
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        JOIN {DB}.main.Municipio m USING(id_municipio)
        LEFT JOIN {DB}.main.Candidato p USING(id_candidato)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
    ),
    mun AS (
        SELECT 
            id_municipio,
            municipio_nome,
            uf,
            COUNT(*) total_candidaturas,
            COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 105) validas,
            COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 29) jovens,
            ROUND(100.0 * COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 105), 0), 2) pct_jovens,
            COUNT(*) FILTER (WHERE eleito) total_eleitos,
            COUNT(*) FILTER (WHERE eleito AND idade BETWEEN 18 AND 29) jovens_eleitos,
            COUNT(*) FILTER (WHERE definido AND idade BETWEEN 18 AND 29) jovens_definidos,
            ROUND(100.0 * COUNT(*) FILTER (WHERE eleito AND idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER (WHERE definido AND idade BETWEEN 18 AND 29), 0), 2) taxa_eleicao_jovens
        FROM base
        GROUP BY 1, 2, 3
    )
    SELECT m.*, c.populacao
    FROM mun m
    LEFT JOIN {DB}.main.Censo_Municipio c ON c.id_municipio = m.id_municipio AND c.ano_referencia = 2022
    ORDER BY m.pct_jovens DESC, m.municipio_nome
    """

    rows = _rows(sql, params)

    # Calcular média ponderada do estado / conjunto (soma dos jovens / soma das validas)
    tot_jovens = sum(r['jovens'] for r in rows)
    tot_validas = sum(r['validas'] for r in rows)
    media_ponderada = round(100.0 * tot_jovens / tot_validas, 2) if tot_validas > 0 else 0.0

    return {
        'recorte': {'ano': ano, 'cargo': cargo, 'uf': uf or '6 UFs'},
        'total_municipios': len(rows),
        'media_ponderada_pct_jovens': media_ponderada,
        'totais': {
            'jovens': tot_jovens,
            'validas': tot_validas
        },
        'municipios': rows
    }


@router.get('/evolucao')
def get_evolucao(cargo: str = 'VEREADOR'):
    """Retorna a comparação temporal entre eleições equivalentes."""
    cargo = (cargo or '').strip().upper()
    if cargo not in CARGOS_VALIDOS:
        raise HTTPException(400, f'Cargo {cargo} inválido. Cargos permitidos: {sorted(CARGOS_VALIDOS)}')

    anos = (2020, 2024) if cargo == 'VEREADOR' else (2018, 2022)

    sql = f"""
    WITH base AS (
        SELECT 
            e.ano,
            UPPER(e.cargo) cargo,
            date_diff('year', p.dt_nascimento, e.data) - 
                CASE WHEN strftime(e.data, '%m-%d') < strftime(p.dt_nascimento, '%m-%d') THEN 1 ELSE 0 END AS idade,
            UPPER(r.resultado) LIKE 'ELEITO%' AS eleito,
            UPPER(r.resultado) IN ('ELEITO', 'ELEITO POR QP', 'ELEITO POR MÉDIA', 'NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') AS definido
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Candidato p USING(id_candidato)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE e.ano IN (?, ?) AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
    )
    SELECT 
        ano,
        COUNT(*) candidaturas,
        COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 105) validas,
        COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 29) jovens,
        ROUND(100.0 * COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER (WHERE idade BETWEEN 18 AND 105), 0), 2) pct_candidaturas_jovens,
        COUNT(*) FILTER (WHERE eleito) total_eleitos,
        COUNT(*) FILTER (WHERE eleito AND idade BETWEEN 18 AND 105) eleitos_validos,
        COUNT(*) FILTER (WHERE eleito AND idade BETWEEN 18 AND 29) jovens_eleitos,
        ROUND(100.0 * COUNT(*) FILTER (WHERE eleito AND idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER (WHERE eleito AND idade BETWEEN 18 AND 105), 0), 2) pct_eleitos_jovens,
        COUNT(*) FILTER (WHERE definido AND idade BETWEEN 18 AND 29) jovens_definidos,
        ROUND(100.0 * COUNT(*) FILTER (WHERE eleito AND idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER (WHERE definido AND idade BETWEEN 18 AND 29), 0), 2) taxa_eleicao_jovens
    FROM base
    GROUP BY 1
    ORDER BY 1
    """

    rows = _rows(sql, [anos[0], anos[1], cargo])

    var_cand_pp = None
    var_eleitos_pp = None
    var_taxa_pp = None

    if len(rows) == 2:
        r1, r2 = rows[0], rows[1]
        var_cand_pp = round(r2['pct_candidaturas_jovens'] - r1['pct_candidaturas_jovens'], 2)
        var_eleitos_pp = round(r2['pct_eleitos_jovens'] - r1['pct_eleitos_jovens'], 2)
        var_taxa_pp = round(r2['taxa_eleicao_jovens'] - r1['taxa_eleicao_jovens'], 2)

    return {
        'cargo': cargo,
        'anos_comparados': list(anos),
        'series': rows,
        'variacao_pontos_percentuais': {
            'pct_candidaturas_jovens': var_cand_pp,
            'pct_eleitos_jovens': var_eleitos_pp,
            'taxa_eleicao_jovens': var_taxa_pp
        }
    }


@router.get('/candidatos')
def get_candidatos(
    ano: int = 2024,
    cargo: str = 'VEREADOR',
    uf: str = '',
    faixa: str = '18_29',
    partido: str = '',
    search: str = '',
    limit: int = 12,
    offset: int = 0
):
    """Retorna lista paginada de fichas eleitorais por faixa etária."""
    ano, cargo, uf = _valida_recorte(ano, cargo, uf)
    search = '' if not isinstance(search, str) else search
    limit = 12 if not isinstance(limit, int) or limit < 1 else min(limit, 36)
    offset = 0 if not isinstance(offset, int) or offset < 0 else offset

    faixas_map = {
        '18_29': "idade BETWEEN 18 AND 29",
        '30_44': "idade BETWEEN 30 AND 44",
        '45_59': "idade BETWEEN 45 AND 59",
        '60_mais': "idade >= 60 AND idade <= 105",
        'sem_idade': "(idade IS NULL OR idade < 18 OR idade > 105)"
    }
    filtro_faixa = faixas_map.get(faixa, faixas_map['18_29'])

    filtros = [
        "e.ano = ?",
        "UPPER(e.cargo) = ?",
        "e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'"
    ]
    params = [ano, cargo]

    if uf:
        filtros.append("c.uf = ?")
        params.append(uf)
    if partido:
        filtros.append("UPPER(p_part.sigla) = UPPER(?)")
        params.append(partido)

    where_clause = " AND ".join(filtros)

    sql = f"""
    WITH base AS (
        SELECT 
            c.id_candidatura id,
            c.nome_urna nome,
            c.numero_urna numero,
            p_part.sigla partido,
            e.ano,
            UPPER(e.cargo) cargo,
            c.uf,
            m.nome municipio,
            date_diff('year', p.dt_nascimento, e.data) - 
                CASE WHEN strftime(e.data, '%m-%d') < strftime(p.dt_nascimento, '%m-%d') THEN 1 ELSE 0 END AS idade,
            r.votos,
            r.resultado,
            c.gastos_campanha_total gastos
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        LEFT JOIN {DB}.main.Partido p_part USING(id_partido)
        LEFT JOIN {DB}.main.Candidato p USING(id_candidato)
        LEFT JOIN {DB}.main.Municipio m USING(id_municipio)
        LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        WHERE {where_clause}
    ),
    filtrada AS (
        SELECT *, COUNT(*) OVER() total_encontrado
        FROM base
        WHERE {filtro_faixa}
          AND (? = '' OR strip_accents(nome) ILIKE strip_accents(?) OR strip_accents(municipio) ILIKE strip_accents(?) OR CAST(numero AS VARCHAR) ILIKE ?)
    )
    SELECT * FROM filtrada
    ORDER BY votos DESC NULLS LAST, nome ASC
    LIMIT ? OFFSET ?
    """

    search_param = f'%{search}%' if search else ''
    full_params = params + [search, search_param, search_param, search_param, limit, offset]

    rows = _rows(sql, full_params)
    total = rows[0]['total_encontrado'] if rows else 0

    return {
        'total': total,
        'limit': limit,
        'offset': offset,
        'faixa': faixa,
        'candidatos': [{k: v for k, v in r.items() if k != 'total_encontrado'} for r in rows]
    }
