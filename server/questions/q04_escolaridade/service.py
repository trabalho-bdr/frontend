from core.sql import query_sql
from fastapi import HTTPException
from core.config import DB
from catalog_facets import facet_sql
from questions.shared.scope import candidate_scope, SCHOOLS
from questions.shared.statistics import percent, correlation
from questions.shared.repository import municipal_data


def calculate(f, context, universe):
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
    if universe not in ("todos", "18mais"):
        raise HTTPException(422, "Universo etário inválido.")
    (base, params) = candidate_scope(f)
    school = facet_sql("escolaridade")
    cand = read(
        base
        + query_sql(
            "questions/q04_escolaridade/sql/service_calculate_02.sql",
            fragment_0=school,
            fragment_1=school,
        ),
        params,
    )
    byid = {r["municipio_id"]: r for r in cand}
    for row in rows:
        c = byid.get(row["id"], {})
        row["candidaturas"] = c.get("candidaturas", 0)
        row["candidatos_conhecidos"] = c.get("conhecidos", 0)
        row["x"] = percent(row.get("superior_18"), row.get("instrucao_conhecida_18"))
        row["y"] = percent(c.get("superior"), c.get("conhecidos"))
        row["diferenca_pp"] = (
            row["y"] - row["x"] if row["x"] is not None and row["y"] is not None else None
        )
    age = (
        "AND faixa_etaria NOT IN ('16 ANOS','17 ANOS','INVÁLIDA','INVÁLIDO')"
        if universe == "18mais"
        else ""
    )
    profile_school = facet_sql("escolaridade").replace("escolaridade", "grau_instrucao")
    p = read(
        query_sql(
            "questions/q04_escolaridade/sql/service_calculate_01.sql",
            fragment_0=profile_school,
            fragment_1=DB,
            fragment_2=DB,
            fragment_3=age,
        ),
        [f["ano"], f["uf"], f["uf"], f["municipio"], f["municipio"]],
    )
    c = read(
        base
        + query_sql("questions/q04_escolaridade/sql/service_calculate_03.sql", fragment_0=school),
        params,
    )
    pm = {r["chave"]: r["quantidade"] for r in p}
    cm = {r["chave"]: r["quantidade"] for r in c}
    valid = {k for (k, _) in SCHOOLS}
    pt = sum((v for (k, v) in pm.items() if k in valid))
    ct = sum((v for (k, v) in cm.items() if k in valid))
    distribution = [
        {
            "grupo": label,
            "eleitores": pm.get(k, 0),
            "candidatos": cm.get(k, 0),
            "valor": percent(cm.get(k, 0), ct),
            "referencia": percent(pm.get(k, 0), pt),
        }
        for (k, label) in SCHOOLS
    ]
    return dict(
        rows=distribution,
        points=rows,
        summary={
            "eleitores_conhecidos": pt,
            "candidatos_conhecidos": ct,
            "eleitores_excluidos": sum(pm.values()) - pt,
            "candidatos_excluidos": sum(cm.values()) - ct,
            **correlation(rows, "x", "y"),
        },
        unit="distribution",
        x_label="Eleitores 18+ com superior completo (%)",
        y_label="Candidatos com superior completo (%)",
        method="Escolaridade harmonizada: percentuais entre categorias conhecidas. Distribuição do eleitorado "
        + ("18 anos ou mais" if universe == "18mais" else "de todas as idades")
        + ". Dispersão sempre compara eleitores 18+ e candidaturas municipais.",
        limitations=[
            "Eleitorado não equivale à população residente. Categorias não informadas/não divulgáveis não entram no denominador conhecido.",
            "A comparação educacional da população residente depende de integração específica do IBGE; a demografia populacional usa idade mediana e envelhecimento de 2022 nas fichas municipais.",
            "Partido restringe os candidatos, não o eleitorado de referência; idade mínima e composição dos dois universos diferem.",
        ],
    )
