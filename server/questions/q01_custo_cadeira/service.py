from core.sql import query_sql
from questions.shared.scope import candidate_scope
import json


def calculate(f, context):
    read = context.query
    DATA = context.data_path
    series = {**f, "ano": None}
    (base, params) = candidate_scope(series)
    rows = read(
        base + query_sql("questions/q01_custo_cadeira/sql/service_calculate_01.sql"), params
    )
    ipca = json.loads((DATA / "ipca.json").read_text()) if (DATA / "ipca.json").exists() else {}
    for row in rows:
        row["grupo"] = str(row["ano"])
        row["valor"] = (
            row["total"] / row["eleitos"] if row["total"] is not None and row["eleitos"] else None
        )
        row["apenas_eleitos"] = (
            row["gasto_eleitos"] / row["eleitos"]
            if row["gasto_eleitos"] is not None and row["eleitos"]
            else None
        )
        factor = ipca.get("factors", {}).get(str(row["ano"]))
        row["corrigido"] = row["valor"] * factor if factor and row["valor"] is not None else None
    selected = next((r for r in rows if r["ano"] == f["ano"]), None)
    return dict(
        rows=rows,
        summary=selected,
        unit="money",
        method="Despesa conhecida de todas as candidaturas ÷ eleitos registrados. Último turno por candidatura. Não é custo por vaga disputada nem estimativa causal. Despesa ausente não é zero.",
        limitations=[
            "A mediana e o gasto apenas dos eleitos são indicadores distintos. Eleito registrado não comprova mandato exercido.",
            "Valores corrigidos usam IPCA de dezembro a dezembro, base dezembro/2024; é uma convenção para totais anuais, não a data de cada despesa.",
        ],
        inflation=ipca,
    )


def municipalities(f, context):
    from questions.shared.repository import candidate_municipalities

    result = candidate_municipalities(f, context.query)
    for row in result["rows"]:
        row["valor"] = row["gasto_por_eleito"]
    return result
