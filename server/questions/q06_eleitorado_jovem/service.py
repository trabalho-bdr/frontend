from fastapi import HTTPException
from questions.shared.statistics import percent, correlation
from questions.shared.repository import municipal_data


def calculate(f, context, youth):
    read = context.query
    if f["ano"] not in (2018, 2020, 2022, 2024):
        raise HTTPException(
            422, "Perfil do eleitorado disponível de 2018 a 2024 em anos eleitorais."
        )
    if f["ano"] != 2024:
        return dict(
            rows=[],
            summary=None,
            unit="percent",
            status="em_validacao",
            method="Perfil disponível, mas a reconciliação histórica ainda não foi liberada.",
            limitations=[
                "2022 diverge da participação em 1.215 municípios; 2018 e 2020 não possuem reconciliação correspondente nesta tabela. Use 2024 para a comparação validada."
            ],
        )
    rows = municipal_data(f, read)
    if youth not in ("16_17", "18_24", "16_24", "16_29"):
        raise HTTPException(422, "Faixa jovem inválida.")
    for r in rows:
        a = r.get("jovens_16_17") or 0
        b = r.get("jovens_18_24") or 0
        c = r.get("jovens_25_29") or 0
        r["jovens"] = {"16_17": a, "18_24": b, "16_24": a + b, "16_29": a + b + c}[youth]
        r["x"] = percent(r["jovens"], r.get("idade_conhecida"))
        r["y"] = r.get("participacao_partido") if f["partido"] else r.get("abstencao")
    corr = correlation(rows, "x", "y")
    return dict(
        rows=rows,
        summary=corr,
        unit="scatter",
        x_label="Eleitorado jovem · " + youth.replace("_", "–") + " anos (%)",
        y_label="Participação partidária (%)" if f["partido"] else "Abstenção (%)",
        method="Participação jovem sobre eleitores de idade conhecida; cruzamento municipal com votação do partido selecionado ou abstenção. Faixas inválidas excluídas do denominador e informadas nas fichas.",
        limitations=[
            "Não revela em quem os jovens votaram. O voto individual não está disponível.",
            "Perfil e participação reconciliados para 2024; dados de outros anos permanecem em validação.",
        ],
    )
