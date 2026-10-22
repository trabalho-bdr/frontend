"""Módulo da Questão 1: "Qual o custo financeiro por cadeira?"

Reportagem interativa sobre gastos de campanha, representação e votação.
Metodologia rigorosa:
- Valores monetários são nominais.
- Gasto agregado por cadeira = soma das despesas declaradas no recorte / candidaturas eleitas.
- Despesa declarada por voto = despesa da candidatura / votos nominais (somente votos > 0).
- Eleições suplementares são excluídas.
- Suplentes e resultados indefinidos têm tratamento estatístico explícito.
- Correlações e associações não implicam relação causal.
"""
from __future__ import annotations
import math
import re
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix='/api/questao1', tags=['questao1'])

DB = 'v3'
UF_VALIDAS = {'CE', 'MA', 'MS', 'RJ', 'RN', 'RS'}
CARGOS_VALIDOS = {'VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL'}
ANOS_VALIDOS = {2018, 2020, 2022, 2024}


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
    if cargo in ('DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL') and ano not in (2018, 2022):
        raise HTTPException(400, f'Eleições gerais para {cargo} ocorrem em 2018 e 2022.')

    if uf and uf not in UF_VALIDAS:
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
            GROUP BY 1 ORDER BY gasto_por_cadeira DESC
        """
        por_uf = _rows(sql_uf, [ano, cargo])

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
        # 'todos': candidaturas com resultado definido
        filtros.append("(UPPER(r.resultado) LIKE 'ELEITO%' OR UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE'))")

    # Para ordenação por custo_voto, requer votos > 0 e despesas > 0 para não distorcer com divisões indefinidas
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
    """Dados para o gráfico de dispersão: Despesas declaradas × Votos nominais.
    
    Aplica amostragem estratificada preservando proporções quando o volume total ultrapassa max_pontos.
    Fornece contagem total exata N e correlação linear e log-log documentada.
    """
    ano, cargo, uf, municipio_id = _valida_recorte(ano, cargo, uf, municipio_id)

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

    # 2. Consulta dos pontos com amostragem estratificada caso total_validos > max_pontos
    # Garante inclusão proporcional de eleitos e não eleitos
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
