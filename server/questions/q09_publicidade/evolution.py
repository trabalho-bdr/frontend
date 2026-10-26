"""Evolução descritiva de publicidade e resultado; sem estimar efeito causal."""

from core.sql import query_sql
from collections import defaultdict
from decimal import Decimal

from fastapi import HTTPException

from bdr_paineis import q2
from . import repository as q9


def _validar(cargo, uf):
    cargo = q9._codigo(cargo)
    uf = uf.upper() if uf else None
    if cargo not in q2.CARGOS:
        raise HTTPException(
            422, "A evolução de sucesso aceita apenas os cargos titulares da questão 2."
        )
    if uf and uf not in q9.UFS:
        raise HTTPException(422, "UF fora do recorte disponível.")
    return cargo, uf


def _anos(consultar, refs, cargo, uf, id_municipio=None):
    return [
        r["ano"]
        for r in consultar(
            query_sql(
                "questions/q09_publicidade/sql/evolution_available_years.sql",
                fragment_0=refs["candidatura"],
                fragment_1=refs["eleicao"],
            ),
            [cargo, uf, uf, id_municipio, id_municipio],
        )
    ]


def partidos(consultar, cargo, uf=None, id_municipio=None):
    cargo, uf = _validar(cargo, uf)
    refs = q9._fontes(consultar)
    if "partido" not in refs:
        raise HTTPException(503, "Cadastro de partidos indisponível.")
    return {
        "anos": _anos(consultar, refs, cargo, uf, id_municipio),
        "partidos": consultar(
            query_sql(
                "questions/q09_publicidade/sql/evolution_partidos_01.sql",
                fragment_0=refs["candidatura"],
                fragment_1=refs["eleicao"],
                fragment_2=refs["partido"],
            ),
            [cargo, uf, uf, id_municipio, id_municipio],
        ),
    }


def _perfil(grupos):
    total = sum(grupos.values(), Decimal(0))
    if total <= 0 or any(v < 0 for v in grupos.values()):
        return None
    return {g: float(v / total * 100) for g, v in grupos.items()}


def _taxa(resultados):
    validos = [v for v in resultados if v is not None]
    return {
        "analisadas": len(validos),
        "eleitas": sum(validos),
        "taxa": 100 * sum(validos) / len(validos) if validos else None,
    }


def _distancia(a, b):
    return sum(abs(b.get(g, 0) - a.get(g, 0)) for g in a.keys() | b.keys()) / 2


def _coorte(pares):
    antes, depois = _taxa([a["eleito"] for a, b in pares]), _taxa([b["eleito"] for a, b in pares])
    return {
        "pares": len(pares),
        "antes": antes,
        "depois": depois,
        "variacao_taxa_pp": depois["taxa"] - antes["taxa"] if pares else None,
        "novas_vitorias": sum(a["eleito"] == 0 and b["eleito"] == 1 for a, b in pares),
        "vitorias_consecutivas": sum(a["eleito"] == b["eleito"] == 1 for a, b in pares),
    }


def _variacao(antes, depois):
    delta = (
        float(Decimal(str(depois)) - Decimal(str(antes)))
        if antes is not None and depois is not None
        else None
    )
    return {
        "absoluta": delta,
        "percentual": 100 * delta / antes if delta is not None and antes != 0 else None,
        "sem_base": antes == 0,
    }


def _comparar(
    consultar, cargo, uf, id_partido, id_candidato, criterio, ano_antes, ano_depois, id_municipio
):
    municipal = cargo in ("VEREADOR", "PREFEITO")
    if id_municipio and (not municipal or not uf):
        raise HTTPException(422, "Município exige cargo municipal e UF.")
    if id_candidato and (not uf or (municipal and not id_municipio)):
        raise HTTPException(422, "Selecione a UF e, para cargos municipais, o município da pessoa.")
    if ano_antes is None or ano_depois is None or ano_antes >= ano_depois:
        raise HTTPException(422, "Selecione duas eleições diferentes, em ordem cronológica.")
    refs = q9._fontes(consultar)
    if not all(k in refs for k in ("resultado_candidatura", "partido", "candidato")):
        raise HTTPException(503, "Cadastros e resultados eleitorais indisponíveis.")
    anos = _anos(consultar, refs, cargo, uf, id_municipio)
    if ano_antes not in anos or ano_depois not in anos:
        raise HTTPException(422, "Eleição indisponível neste cargo e território.")
    tabela, campo, identidade = (
        ("partido", "id_partido", id_partido)
        if id_partido
        else ("candidato", "id_candidato", id_candidato)
    )
    entidades = consultar(
        query_sql(
            "questions/q09_publicidade/sql/evolution_resumo_02.sql",
            fragment_0="id_partido,sigla,nome" if id_partido else "id_candidato,nome_civil",
            fragment_1=refs[tabela],
            fragment_2=q9._ident(campo),
        ),
        [identidade],
    )
    if len(entidades) != 1:
        raise HTTPException(404 if not entidades else 409, "Identidade não encontrada ou ambígua.")
    base = query_sql(
        "questions/q09_publicidade/sql/evolution_comparison_base.sql",
        fragment_0=refs["candidatura"],
        fragment_1=refs["eleicao"],
        fragment_2=refs["partido"],
        fragment_3=campo,
    )
    params = [ano_antes, ano_depois, cargo, uf, uf, id_municipio, id_municipio, identidade]
    categorias = [
        r["categoria"]
        for r in consultar(
            query_sql(
                "questions/q09_publicidade/sql/evolution_resumo_05.sql",
                fragment_0=base,
                fragment_1=refs["despesa_candidatura"],
            ),
            params,
        )
    ]
    arrays, origem = q9._normalizacao(consultar, refs, categorias)
    rows = consultar(
        query_sql(
            "questions/q09_publicidade/sql/evolution_comparison_rows.sql",
            fragment_0=base,
            fragment_1=refs["resultado_candidatura"],
            fragment_2=refs["despesa_candidatura"],
        ),
        params + arrays + [criterio],
    )
    # SQL already reduces expenses by logical candidacy and modality. No network loops.
    profiles = {}
    for row in rows:
        key = (row["pessoa"], row["uf"], row["id_municipio"], row["ano"])
        profile = profiles.setdefault(
            key,
            {
                **{
                    k: row[k]
                    for k in (
                        "id_candidatura",
                        "ano",
                        "nome",
                        "partido",
                        "resultado",
                        "eleito",
                        "votos",
                    )
                },
                "grupos": {},
                "publicidade": Decimal(0),
                "total_campanha": Decimal(0),
                "em_revisao": Decimal(0),
                "despesas": 0,
                "com_valor": 0,
                "sem_valor": 0,
                "publicidade_sem_valor": 0,
                "ajustes_negativos": 0,
            },
        )
        if row["grupo"] is not None:
            profile["grupos"][row["grupo"]] = (
                Decimal(str(row["publicidade"])) if row["publicidade"] is not None else None
            )
        for field in ("publicidade", "total_campanha", "em_revisao"):
            if row[field] is not None:
                profile[field] += Decimal(str(row[field]))
        for field in (
            "despesas",
            "com_valor",
            "sem_valor",
            "publicidade_sem_valor",
            "ajustes_negativos",
        ):
            profile[field] += row[field]
    serie = []
    for ano in (ano_antes, ano_depois):
        people = [p for p in profiles.values() if p["ano"] == ano]
        known = [p for p in people if p["com_valor"] > 0]
        groups = defaultdict(list)
        for p in people:
            for group, value in p["grupos"].items():
                groups[group].append(value)
        values = {
            g: sum((v for v in vs if v is not None), Decimal(0))
            if any(v is not None for v in vs)
            else None
            for g, vs in groups.items()
        }
        advertising = sum((p["publicidade"] for p in known), Decimal(0)) if known else None
        # All eligible entries missing is unknown, even if unrelated expenses are known.
        if values and all(v is None for v in values.values()):
            advertising = None
        total = sum((p["total_campanha"] for p in known), Decimal(0)) if known else None
        outcomes = _taxa([p["eleito"] for p in people])
        composition = [
            {
                "grupo": g,
                "valor": float(v) if v is not None else None,
                "participacao": float(100 * v / advertising)
                if v is not None and advertising is not None and advertising > 0
                else None,
            }
            for g, v in sorted(values.items())
        ]
        serie.append(
            {
                "ano": ano,
                "presente": bool(people),
                "candidaturas": len(people),
                "resultado": outcomes,
                "sem_resultado": len(people) - outcomes["analisadas"],
                "com_despesas": len(known),
                "sem_despesas": len(people) - len(known),
                "publicidade": float(advertising) if advertising is not None else None,
                "total_campanha": float(total) if total is not None else None,
                "gasto_medio": float(total / len(known)) if known else None,
                "grupos": composition,
                "composicao_valida": bool(
                    advertising is not None
                    and advertising > 0
                    and all(v is not None and v >= 0 for v in values.values())
                ),
                "cobertura": {
                    k: sum(p[k] for p in people)
                    for k in (
                        "despesas",
                        "com_valor",
                        "sem_valor",
                        "publicidade_sem_valor",
                        "ajustes_negativos",
                    )
                },
                "em_revisao": float(sum((p["em_revisao"] for p in people), Decimal(0))),
                "candidato": {
                    k: people[0][k]
                    for k in ("id_candidatura", "nome", "partido", "resultado", "votos")
                }
                if id_candidato and len(people) == 1
                else None,
            }
        )
    a, b = serie
    ga, gb = ({g["grupo"]: g for g in item["grupos"]} for item in serie)

    def group_at(index, group):
        item, mapping = (a, ga) if index == 0 else (b, gb)
        return mapping.get(
            group,
            {
                "valor": 0 if item["publicidade"] is not None else None,
                "participacao": 0
                if item["publicidade"] is not None and item["publicidade"] > 0
                else None,
            },
        )

    modalities = []
    for group in sorted(ga.keys() | gb.keys()):
        x, y = group_at(0, group), group_at(1, group)
        modalities.append(
            {
                "grupo": group,
                "valor_antes": x["valor"],
                "valor_depois": y["valor"],
                "antes": x["participacao"],
                "depois": y["participacao"],
                "delta_pp": y["participacao"] - x["participacao"]
                if x["participacao"] is not None and y["participacao"] is not None
                else None,
            }
        )
    comparable = a["presente"] and b["presente"]
    performance = "Sem par comparável: ausência de candidatura não representa derrota."
    if comparable:
        performance = "Resultado eleitoral desconhecido em pelo menos uma eleição."
        if a["resultado"]["analisadas"] and b["resultado"]["analisadas"]:
            performance = (
                "Eleito novamente"
                if a["resultado"]["eleitas"] and b["resultado"]["eleitas"]
                else "Foi eleito na eleição posterior"
                if b["resultado"]["eleitas"]
                else "Não foi eleito na eleição posterior"
            )
    return {
        "modo": "partido" if id_partido else "candidato",
        "entidade": entidades[0],
        "cargo": cargo,
        "uf": uf,
        "id_municipio": id_municipio,
        "criterio": criterio,
        "anos_disponiveis": anos,
        "origem_normalizacao": origem,
        "serie": serie,
        "comparacao": {
            "antes": ano_antes,
            "depois": ano_depois,
            "comparavel": bool(comparable),
            "publicidade": _variacao(a["publicidade"], b["publicidade"]),
            "total_campanha": _variacao(a["total_campanha"], b["total_campanha"]),
            "modalidades": modalities,
            "desempenho": performance if id_candidato else None,
            "reeleicao": {
                "disponivel": False,
                "rotulo": "Condição de reeleição não confirmada",
                "numerador": None,
                "denominador": None,
            },
        },
        "valores": "nominais",
        "nota": "A comparação mostra mudanças e associações; não demonstra efeito causal.",
    }


def resumo(
    consultar,
    cargo,
    uf=None,
    id_partido=None,
    id_candidato=None,
    criterio="sugeridas",
    ano_antes=None,
    ano_depois=None,
    id_municipio=None,
):
    cargo, uf = _validar(cargo, uf)
    if bool(id_partido) == bool(id_candidato):
        raise HTTPException(422, "Selecione um partido ou um candidato para comparar as eleições.")
    if criterio not in ("sugeridas", "explicitas"):
        raise HTTPException(422, "Critério de classificação inválido.")
    if ano_antes is not None or ano_depois is not None:
        return _comparar(
            consultar,
            cargo,
            uf,
            id_partido,
            id_candidato,
            criterio,
            ano_antes,
            ano_depois,
            id_municipio,
        )
    refs = q9._fontes(consultar)
    if not all(t in refs for t in ("resultado_candidatura", "partido", "candidato")):
        raise HTTPException(
            503, "Cadastros e resultados eleitorais indisponíveis para esta análise."
        )
    tabela, campo, identidade = (
        ("partido", "id_partido", id_partido)
        if id_partido
        else ("candidato", "id_candidato", id_candidato)
    )
    colunas = "id_partido,sigla,nome" if id_partido else "id_candidato,nome_civil"
    entidade = consultar(
        query_sql(
            "questions/q09_publicidade/sql/evolution_resumo_02.sql",
            fragment_0=colunas,
            fragment_1=refs[tabela],
            fragment_2=q9._ident(campo),
        ),
        [identidade],
    )
    if not entidade:
        raise HTTPException(404, "Partido ou candidato não encontrado.")
    entidade = entidade[0]
    # Os anos vêm do cargo, mesmo quando a entidade não participou de uma eleição.
    anos = [
        r["ano"]
        for r in consultar(
            query_sql(
                "questions/q09_publicidade/sql/evolution_resumo_04.sql",
                fragment_0=refs["candidatura"],
                fragment_1=refs["eleicao"],
            ),
            [cargo, uf, uf],
        )
    ]
    base = query_sql(
        "questions/q09_publicidade/sql/evolution_resumo_01.sql",
        fragment_0=refs["candidatura"],
        fragment_1=refs["eleicao"],
        fragment_2=refs["partido"],
        fragment_3=campo,
    )
    params = [cargo, uf, uf, identidade]
    categorias = [
        r["categoria"]
        for r in consultar(
            query_sql(
                "questions/q09_publicidade/sql/evolution_resumo_05.sql",
                fragment_0=base,
                fragment_1=refs["despesa_candidatura"],
            ),
            params,
        )
    ]
    arrays, origem = q9._normalizacao(consultar, refs, categorias)
    # Agrega resultados antes das despesas: turnos jamais multiplicam valores.
    # Empates conflitantes no último turno ficam com resultado indefinido.
    rows = consultar(
        query_sql(
            "questions/q09_publicidade/sql/evolution_resumo_03.sql",
            fragment_0=base,
            fragment_1=refs["resultado_candidatura"],
            fragment_2=refs["despesa_candidatura"],
            fragment_3=",".join(("?" for _ in q2.INSUCESSO)),
        ),
        params + arrays + [criterio] + list(q2.INSUCESSO),
    )
    perfis = {}
    for r in rows:
        chave = (r["pessoa"], r["uf"], r["id_municipio"], r["ano"])
        p = perfis.setdefault(
            chave,
            {
                **{
                    k: r[k]
                    for k in (
                        "id_candidatura",
                        "id_candidato",
                        "uf",
                        "id_municipio",
                        "ano",
                        "partido",
                        "eleito",
                        "resultado",
                    )
                },
                "grupos": {},
                "publicidade": Decimal(0),
                "total_campanha": Decimal(0),
                "em_revisao": Decimal(0),
                "despesas": 0,
                "sem_valor": 0,
            },
        )
        if r["grupo"] is not None:
            p["grupos"][r["grupo"]] = Decimal(str(r["publicidade"]))
        # The portal serializes DuckDB decimals to float before this service.
        # Normalize monetary values at this boundary, retaining decimal cents.
        for k in ("publicidade", "total_campanha", "em_revisao"):
            p[k] += Decimal(str(r[k]))
        for k in ("despesas", "sem_valor"):
            p[k] += r[k]
    por_ano = defaultdict(list)
    for p in perfis.values():
        p["perfil"] = _perfil(p["grupos"])
        por_ano[p["ano"]].append(p)
    serie, totais = [], {}
    for ano in anos:
        pessoas = por_ano[ano]
        grupos = defaultdict(Decimal)
        for p in pessoas:
            for grupo, valor in p["grupos"].items():
                grupos[grupo] += valor
        perfil = _perfil(grupos)
        totais[ano] = perfil
        resultado = _taxa([p["eleito"] for p in pessoas])
        serie.append(
            {
                "ano": ano,
                "candidaturas": len(pessoas),
                "resultado": resultado,
                "sem_resultado": len(pessoas) - resultado["analisadas"],
                "com_despesas": sum(p["despesas"] > 0 for p in pessoas),
                "com_perfil": sum(p["perfil"] is not None for p in pessoas),
                "publicidade": float(sum((p["publicidade"] for p in pessoas), Decimal(0))),
                "em_revisao": float(sum((p["em_revisao"] for p in pessoas), Decimal(0))),
                "sem_valor": sum(p["sem_valor"] for p in pessoas),
                "partidos": sorted({p["partido"] for p in pessoas if p["partido"]}),
                "resultados": sorted({p["resultado"] for p in pessoas if p["resultado"]}),
                "grupos": [
                    {"grupo": g, "valor": float(v), "participacao": perfil[g] if perfil else None}
                    for g, v in sorted(grupos.items(), key=lambda t: (-t[1], t[0]))
                ],
            }
        )
    comparacoes = []
    for antes, depois in zip(anos, anos[1:]):
        # Mesmo cargo, UF e município, eleições regulares consecutivas de 4 anos.
        def indexar(ano):
            grupos = defaultdict(list)
            for p in por_ano[ano]:
                if p["id_candidato"]:
                    grupos[(p["id_candidato"], p["uf"], p["id_municipio"])].append(p)
            return {k: v[0] for k, v in grupos.items() if len(v) == 1}

        a, b = indexar(antes), indexar(depois)
        comuns = [(a[k], b[k]) for k in a.keys() & b.keys()] if depois - antes == 4 else []
        comparaveis = [
            (x, y) for x, y in comuns if x["perfil"] is not None and y["perfil"] is not None
        ]
        pares = [
            (x, y) for x, y in comparaveis if x["eleito"] is not None and y["eleito"] is not None
        ]
        faixas = []
        for rotulo, minimo, maximo in [
            ("Menos de 10 p.p.", 0, 10),
            ("De 10 a menos de 30 p.p.", 10, 30),
            ("30 p.p. ou mais", 30, 101),
        ]:
            subset = [
                (x, y) for x, y in pares if minimo <= _distancia(x["perfil"], y["perfil"]) < maximo
            ]
            faixas.append({"faixa": rotulo, **_coorte(subset)})
        grupos = sorted({g for x, y in pares for g in x["perfil"].keys() | y["perfil"].keys()})
        associacoes = []
        for grupo in grupos:
            expostos = [
                (x, y)
                for x, y in pares
                if x["perfil"].get(grupo, 0) > 0 or y["perfil"].get(grupo, 0) > 0
            ]
            ampliaram = [
                (x, y)
                for x, y in expostos
                if y["perfil"].get(grupo, 0) - x["perfil"].get(grupo, 0) >= 10
            ]
            outros = [
                (x, y)
                for x, y in expostos
                if y["perfil"].get(grupo, 0) - x["perfil"].get(grupo, 0) < 10
            ]
            t1, t2 = _coorte(ampliaram), _coorte(outros)
            associacoes.append(
                {
                    "grupo": grupo,
                    "ampliaram": t1,
                    "outros": t2,
                    "diferenca_taxas_pp": t1["depois"]["taxa"] - t2["depois"]["taxa"]
                    if ampliaram and outros
                    else None,
                }
            )
        pa, pb = totais[antes], totais[depois]
        comparacoes.append(
            {
                "antes": antes,
                "depois": depois,
                "mudanca_pp": _distancia(pa, pb) if pa is not None and pb is not None else None,
                "variacoes": [
                    {
                        "grupo": g,
                        "antes": pa.get(g, 0),
                        "depois": pb.get(g, 0),
                        "delta_pp": pb.get(g, 0) - pa.get(g, 0),
                    }
                    for g in sorted(pa.keys() | pb.keys())
                ]
                if pa is not None and pb is not None
                else [],
                "candidatos_repetidos": len(comuns),
                "perfis_comparaveis": len(comparaveis),
                "coorte": _coorte(pares),
                "faixas": faixas,
                "associacoes": associacoes,
            }
        )
    return {
        "cargo": cargo,
        "uf": uf,
        "criterio": criterio,
        "modo": "partido" if id_partido else "candidato",
        "entidade": entidade,
        "origem_normalizacao": origem,
        "serie": serie,
        "comparacoes": comparacoes,
    }
