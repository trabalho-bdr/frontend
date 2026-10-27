from core.sql import query_sql
from questions.shared.scope import candidate_scope
from questions.shared.statistics import percent, wilson

MIN_POR_GRUPO = 30
# Decis exigem pelo menos 30 candidaturas de patrimônio positivo por grupo (10 grupos).
# Abaixo disso a base é fatiada em quartis, que toleram grupos menores.
LIMIAR_PARA_DECIS = 10 * MIN_POR_GRUPO


def _rotulo(faixa, bins):
    if faixa == 0:
        return "Zero declarado"
    return f"Decil {faixa}" if bins == 10 else f"{faixa}º quartil"


def _faixa_case(cortes, incluir_zero):
    partes = ["WHEN patrimonio=0 THEN 0"] if incluir_zero else []
    for i, corte in enumerate(cortes, start=1):
        partes.append(f"WHEN patrimonio<={corte!r} THEN {i}")
    return "CASE " + " ".join(partes) + f" ELSE {len(cortes) + 1} END"


def calculate(f, context, excluir_zero=False):
    read = context.query
    (base, params) = candidate_scope(f)
    coverage = read(
        base + query_sql("questions/q02_patrimonio_sucesso/sql/service_calculate_02.sql"), params
    )[0]

    n_positivos = read(
        base + query_sql("questions/q02_patrimonio_sucesso/sql/service_calculate_contagem.sql"),
        params,
    )[0]["n"]
    bins = 10 if n_positivos >= LIMIAR_PARA_DECIS else 4

    # Sem nenhuma candidatura de patrimônio positivo, QUANTILE_CONT não tem o
    # que medir e devolve NULL — usar esse NULL na expressão CASE quebraria a
    # consulta seguinte com um erro de sintaxe. Sem cortes, toda candidatura
    # positiva (nenhuma, neste caso) cai na última faixa por padrão.
    if n_positivos:
        corte_sql = base + query_sql(
            "questions/q02_patrimonio_sucesso/sql/service_calculate_corte.sql"
        )
        cortes = [read(corte_sql, params + [i / bins])[0]["corte"] for i in range(1, bins)]
    else:
        cortes = []

    filtro_patrimonio = " AND patrimonio>0" if excluir_zero else ""
    faixa_expr = _faixa_case(cortes, incluir_zero=not excluir_zero)
    rows = read(
        base
        + query_sql(
            "questions/q02_patrimonio_sucesso/sql/service_calculate_01.sql",
            fragment_0=filtro_patrimonio,
            fragment_1=faixa_expr,
        ),
        params,
    )
    for row in rows:
        row["grupo"] = _rotulo(row["faixa"], bins)
        row["valor"] = percent(row["eleitos"], row["candidaturas"])
        (row["intervalo_inferior"], row["intervalo_superior"]) = wilson(
            row["eleitos"], row["candidaturas"]
        )
        row["amostra_pequena"] = row["candidaturas"] < MIN_POR_GRUPO

    return dict(
        rows=rows,
        summary=coverage,
        unit="percent",
        bins=bins,
        excluir_zero=excluir_zero,
        method=(
            "Taxa = eleitos ÷ candidaturas com resultado definido e patrimônio conhecido. "
            + (
                "Zero declarado foi excluído da análise, a pedido do filtro. "
                if excluir_zero
                else "Zero declarado permanece como grupo separado, fora dos cortes. "
            )
            + (
                f"Patrimônio positivo neste recorte: {n_positivos} candidaturas; cortes por "
                + ("decis" if bins == 10 else "quartis")
                + (
                    " (amostra suficiente para ao menos 30 candidaturas por grupo)."
                    if bins == 10
                    else " (amostra insuficiente para decis; usa quartis, com grupos maiores)."
                )
                + " Valores empatados ficam na mesma faixa."
            )
        ),
        limitations=[
            "Associação descritiva, sem estimar efeito causal ou controlar experiência e partido. Faixas podem ter tamanhos diferentes devido a empates.",
            "Intervalos de Wilson de 95% são uma medida descritiva da precisão do grupo, não corrigem seleção nem confundimento.",
        ],
    )


def municipalities(f, context):
    from questions.shared.repository import candidate_municipalities

    result = candidate_municipalities(f, context.query)
    for row in result["rows"]:
        row["valor"] = row["patrimonio_mediano"]
    return result
