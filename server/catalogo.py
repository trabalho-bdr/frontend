"""Historical catalog. Read-only, bounded responses, no personal document numbers."""

from __future__ import annotations
from core.sql import query_sql
from catalog_facets import FIELDS as FACET_FIELDS, facet_key, facet_sql, facet_options
import hashlib
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Query, Response

router = APIRouter(prefix="/api/catalogo", tags=["catalogo"])
DB = "pipeline_bdr_der_completo_v4"
from domain.normalization import PARTY_CONTRACT

PARTY_NAME_GROUPS = tuple(tuple(group) for group in PARTY_CONTRACT["nameGroups"])
UFS = ("CE", "MA", "MS", "RJ", "RN", "RS")
MUNICIPAIS = ("VEREADOR", "PREFEITO")


def read(sql, params=()):
    from core.dependencies import execute as _rows

    try:
        return _rows(sql, params)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "O catálogo não pôde ser consultado. Tente novamente.")


def payload(**values):
    return {"source": "live", "database": DB, **values}


def available_table(name):
    rows = read(query_sql("catalog/sql/catalogo_available_table_01.sql"), [name])
    return bool(rows[0]["n"])


# One record per person, contest and year, taking the last observed round.
# Attributes in Candidato have no historical reference: the API identifies that limitation.
BASE = query_sql(
    "catalog/sql/catalogo_definitions_01.sql",
    fragment_0=DB,
    fragment_1=DB,
    fragment_2=DB,
    fragment_3=DB,
    fragment_4=DB,
    fragment_5=DB,
)
OPTIONS_BASE = query_sql(
    "catalog/sql/catalogo_options_base.sql",
    fragment_0=DB,
    fragment_1=DB,
    fragment_3=DB,
    fragment_4=DB,
    fragment_5=DB,
)
PUBLIC_FIELDS = "id,id_candidato,nome,nome_civil,numero,ano,cargo,uf,municipio_id,municipio,partido,escolaridade,situacao_registro,genero,raca,ocupacao,patrimonio,gastos,votos,resultado,situacao,idade,primeiro_ano,candidaturas_observadas"


def filters(
    q: str = Query("", max_length=80),
    ano: int | None = None,
    uf: str = "",
    cargo: str = "",
    municipio: str = "",
    partido: str = "",
    resultado: str = "",
    escolaridade: str = "",
    genero: str = "",
    raca: str = "",
    ocupacao: str = "",
    idade_min: int | None = Query(None, ge=0, le=120),
    idade_max: int | None = Query(None, ge=0, le=120),
    gasto_min: float | None = Query(None, ge=0, allow_inf_nan=False),
    gasto_max: float | None = Query(None, ge=0, allow_inf_nan=False),
    patrimonio_min: float | None = Query(None, ge=0, allow_inf_nan=False),
    patrimonio_max: float | None = Query(None, ge=0, allow_inf_nan=False),
    recorrencia: str = "",
    partido_historico: str = "",
):
    uf = uf.upper().strip()
    cargo = cargo.upper().strip()
    if uf and uf not in UFS:
        raise HTTPException(422, "UF fora dos seis estados do acervo.")
    if ano is not None and (ano < 2002 or ano > 2024 or ano % 2):
        raise HTTPException(422, "Ano fora do período 2002–2024.")
    if municipio and (not uf or cargo not in MUNICIPAIS):
        raise HTTPException(
            422, "Município exige UF e cargo municipal. Deputados disputam pela UF."
        )
    if resultado not in ("", "ELEITO", "NAO_ELEITO", "SUPLENTE", "INDEFINIDO"):
        raise HTTPException(422, "Resultado inválido.")
    if recorrencia not in ("", "primeira", "recorrente"):
        raise HTTPException(422, "Recorrência inválida.")
    if partido_historico not in ("", "1"):
        raise HTTPException(422, "Histórico partidário inválido.")
    values = dict(
        partido_historico=partido_historico,
        q=q.strip(),
        ano=ano,
        uf=uf,
        cargo=cargo,
        municipio=municipio,
        partido=partido,
        resultado=resultado,
        escolaridade=escolaridade,
        genero=genero,
        raca=raca,
        ocupacao=ocupacao,
        idade_min=idade_min,
        idade_max=idade_max,
        gasto_min=gasto_min,
        gasto_max=gasto_max,
        patrimonio_min=patrimonio_min,
        patrimonio_max=patrimonio_max,
        recorrencia=recorrencia,
    )
    for name in ["idade", "gasto", "patrimonio"]:
        lo, hi = values[name + "_min"], values[name + "_max"]
        if lo is not None and hi is not None and lo > hi:
            raise HTTPException(422, "O limite mínimo não pode superar o máximo.")
    if any(
        len(str(value)) > 100 for key, value in values.items() if key != "q" and value is not None
    ):
        raise HTTPException(422, "Filtro muito longo.")
    return values


def where(f):
    clauses = ["TRUE"]
    params = []
    for key, column in [
        ("ano", "ano"),
        ("uf", "uf"),
        ("cargo", "cargo"),
        ("municipio", "municipio_id"),
        ("partido", "partido"),
        ("resultado", "situacao"),
        ("escolaridade", "escolaridade"),
        ("genero", "genero"),
        ("raca", "raca"),
        ("ocupacao", "ocupacao"),
    ]:
        if key in FACET_FIELDS and f.get(key) not in (None, ""):
            clauses.append("(" + facet_sql(key) + ")=?")
            params.append(facet_key(key, f[key]))
            continue
        if key == "partido" and f.get("partido") and f.get("partido_historico") == "1":
            group = next((g for g in PARTY_NAME_GROUPS if f["partido"] in g), None)
            if group:
                if "PR" in group:
                    clauses.append("(partido='PR' OR (partido='PL' AND ano>=2006))")
                else:
                    clauses.append("partido IN (" + ",".join("?" for _ in group) + ")")
                    params.extend(group)
                continue
        if f.get(key) not in (None, ""):
            clauses.append(f"{column}=?")
            params.append(f[key])
    query = f.get("q", "")
    if query:
        if query.isdigit():
            if not comparable(f):
                raise HTTPException(
                    422,
                    "Para buscar um número, selecione ano, cargo, UF e, em disputas municipais, município.",
                )
            clauses.append("CAST(numero AS VARCHAR)=?")
            params.append(query)
        else:
            clauses.append(
                "(strip_accents(nome) ILIKE strip_accents(?) OR strip_accents(nome_civil) ILIKE strip_accents(?))"
            )
            params.extend([f"%{query}%"] * 2)
    for prefix, column in [("idade", "idade"), ("gasto", "gastos"), ("patrimonio", "patrimonio")]:
        for suffix, operator in [("min", ">="), ("max", "<=")]:
            value = f.get(prefix + "_" + suffix)
            if value is not None:
                clauses.append(f"{column}{operator}?")
                params.append(value)
    if f.get("recorrencia") == "primeira":
        clauses.append("ano=primeiro_ano")
    if f.get("recorrencia") == "recorrente":
        clauses.append("ano>primeiro_ano")
    return " AND ".join(clauses), params


def comparable(f):
    return bool(
        f.get("ano")
        and f.get("cargo")
        and f.get("uf")
        and (f["cargo"] not in MUNICIPAIS or f.get("municipio"))
    )


PHOTO_TEST = """mime_type IN ('image/jpeg','image/png') AND tamanho_bytes>0 AND largura>0 AND altura>0
 AND length(sha256)=64 AND regexp_matches(url_fonte,'^https://([^/]+[.])?tse[.]jus[.]br/')"""


def attach_photos(rows):
    """Use one official portrait per validated person, including historical cards."""
    for row in rows:
        row.update(foto_url=None, foto_ano=None, foto_referencia=False)
    people = sorted({row["id_candidato"] for row in rows if row.get("id_candidato")})
    if not people or not available_table("Foto_Candidato"):
        return
    available = read(
        query_sql(
            "catalog/sql/catalogo_attach_photos_01.sql",
            fragment_0=DB,
            fragment_1=DB,
            fragment_2=DB,
            fragment_3=",".join(("?" for _ in people)),
            fragment_4=PHOTO_TEST,
            fragment_5=DB,
        ),
        people,
    )
    portraits = {photo["id_candidato"]: photo for photo in available}
    for row in rows:
        photo = portraits.get(row.get("id_candidato"))
        if photo:
            row.update(
                foto_url="/api/catalogo/fotos/" + photo["foto_id"],
                foto_ano=photo["ano_foto"],
                foto_referencia=photo["ano_foto"] != row["ano"],
            )


def photo_fields(row):
    attach_photos([row])
    return row["foto_url"]


@router.get("/candidaturas")
def search(
    f: dict = Depends(filters),
    ordem: str = "recentes",
    limit: int = Query(12, ge=1, le=36),
    offset: int = Query(0, ge=0, le=1000000),
):
    orders = {
        "nome": "nome ASC NULLS LAST",
        "recentes": "ano DESC,nome ASC",
        "antigas": "ano ASC,nome ASC",
        "votos": "votos DESC NULLS LAST",
        "gastos": "gastos DESC NULLS LAST",
    }
    if ordem not in orders:
        raise HTTPException(422, "Ordenação desconhecida.")
    if ordem in ("votos", "gastos") and not comparable(f):
        raise HTTPException(
            422,
            "Ordenação financeira ou por votos exige uma disputa comparável: ano, cargo e território.",
        )
    if ordem == "votos" and f.get("cargo") not in (
        "VEREADOR",
        "DEPUTADO ESTADUAL",
        "DEPUTADO FEDERAL",
        "SENADOR",
    ):
        raise HTTPException(
            422,
            "A trajetória usa o último turno observado. Para não misturar votos de turnos distintos, este cargo deve ser ordenado por nome, ano ou despesa.",
        )
    condition, params = where(f)
    total = read(BASE + query_sql("catalog/sql/catalogo_search_02.sql") + condition, params)[0][
        "total"
    ]
    rows = read(
        BASE
        + query_sql(
            "catalog/sql/catalogo_search_01.sql",
            fragment_0=PUBLIC_FIELDS,
            fragment_1=condition,
            fragment_2=orders[ordem],
        ),
        params + [limit, offset],
    )
    attach_photos(rows)
    for row in rows:
        row.pop("sequencial", None)
    return payload(
        rows=rows,
        total=total,
        limit=limit,
        offset=offset,
        filters=f,
        comparavel=comparable(f),
        method="Último turno observado por pessoa, ano, cargo e território; eleições ordinárias das seis UFs.",
    )


@router.get("/pessoas")
def people_search(
    f: dict = Depends(filters),
    ordem: str = "recentes",
    limit: int = Query(12, ge=1, le=36),
    offset: int = Query(0, ge=0, le=1000000),
):
    """Filter matching elections, then paginate identities rather than candidatures."""
    orders = {
        "nome": "h.nome_pessoa ASC NULLS LAST",
        "recentes": "r.ano DESC,h.nome_pessoa ASC",
        "antigas": "h.primeiro_registro ASC,h.nome_pessoa ASC",
        "votos": "r.votos DESC NULLS LAST",
        "gastos": "r.gastos DESC NULLS LAST",
        "custo_voto": "r.gastos/NULLIF(r.votos,0) DESC NULLS LAST",
    }
    if ordem not in orders:
        raise HTTPException(422, "Ordenação desconhecida.")
    if ordem in ("votos", "gastos", "custo_voto") and not comparable(f):
        raise HTTPException(
            422, "Votos e despesas exigem ano, cargo e território da mesma disputa."
        )
    if ordem == "votos" and f.get("cargo") not in (
        "VEREADOR",
        "DEPUTADO ESTADUAL",
        "DEPUTADO FEDERAL",
        "SENADOR",
    ):
        raise HTTPException(422, "Este cargo exige separar os turnos para ordenar votos.")
    condition, params = where(f)
    prefix = (
        BASE
        + f""", safe_people AS (
      SELECT id_candidato FROM {DB}.main.Candidato GROUP BY 1
      HAVING COUNT(DISTINCT NULLIF(TRIM(titulo_eleitoral),''))<=1 AND COUNT(DISTINCT dt_nascimento)<=1
    ), filtered AS (
      SELECT b.* FROM b JOIN safe_people USING(id_candidato) WHERE {condition}
    ) """
    )
    counts = read(prefix + query_sql("catalog/sql/catalogo_people_search_01.sql"), params)[0]
    sql = (
        prefix
        + f""", ranked AS (
      SELECT *,ROW_NUMBER() OVER(PARTITION BY id_candidato ORDER BY ano DESC,votos DESC NULLS LAST,id) match_rank,
        COUNT(DISTINCT id) OVER(PARTITION BY id_candidato) matches_count FROM filtered
    ), history AS (
      SELECT id_candidato,COUNT(DISTINCT id) participacoes,
        COUNT(DISTINCT id) FILTER(WHERE situacao='ELEITO') vitorias,
        COUNT(DISTINCT partido) siglas,COUNT(DISTINCT cargo) cargos,
        MIN(ano) primeiro_registro,MAX(ano) ultimo_registro,LIST(DISTINCT ano ORDER BY ano) anos,
        FIRST(id ORDER BY ano DESC,id) ultima_candidatura_id,
        FIRST(nome ORDER BY ano DESC,id) nome_pessoa,FIRST(partido ORDER BY ano DESC,id) ultima_sigla,
        FIRST(cargo ORDER BY ano DESC,id) ultimo_cargo,FIRST(municipio ORDER BY ano DESC,id) ultimo_municipio,
        FIRST(uf ORDER BY ano DESC,id) ultima_uf,FIRST(resultado ORDER BY ano DESC,id) ultimo_resultado
      FROM b WHERE id_candidato IN (SELECT id_candidato FROM filtered) GROUP BY 1
    ) SELECT {",".join("r." + field for field in PUBLIC_FIELDS.split(","))},r.sequencial,r.matches_count,h.* EXCLUDE(id_candidato)
      FROM ranked r JOIN history h USING(id_candidato) WHERE r.match_rank=1
      ORDER BY {orders[ordem]},r.id_candidato,r.id LIMIT ? OFFSET ?"""
    )
    rows = read(sql, params + [limit, offset])
    attach_photos(rows)
    for row in rows:
        row.pop("sequencial", None)
    return payload(
        rows=rows,
        **counts,
        limit=limit,
        offset=offset,
        filters=f,
        comparavel=comparable(f),
        method="Uma pessoa por id_candidato validado. Filtros selecionam candidaturas correspondentes; o histórico reúne todos os registros da pessoa. Votos e gastos pertencem à candidatura representativa do recorte, sem soma entre eleições.",
    )


@router.get("/opcoes")
def options(ano: int | None = None, uf: str = "", cargo: str = ""):
    f = filters(
        ano=ano,
        uf=uf,
        cargo=cargo,
        q="",
        idade_min=None,
        idade_max=None,
        gasto_min=None,
        gasto_max=None,
        patrimonio_min=None,
        patrimonio_max=None,
    )
    condition, params = where(f)
    coverage = read(OPTIONS_BASE + query_sql("catalog/sql/catalogo_options_04.sql"))[0]
    elections = read(OPTIONS_BASE + query_sql("catalog/sql/catalogo_options_01.sql"))
    facets = read(
        OPTIONS_BASE
        + query_sql(
            "catalog/sql/catalogo_options_02.sql",
            fragment_0=condition,
            fragment_1=condition,
            fragment_2=condition,
            fragment_3=condition,
            fragment_4=condition,
        ),
        params * 5,
    )
    municipalities = (
        read(query_sql("catalog/sql/catalogo_options_03.sql", fragment_0=DB), [uf])
        if uf and cargo in MUNICIPAIS
        else []
    )
    return payload(
        coverage=coverage,
        eleicoes=elections,
        facets={
            key: facet_options(key, [r["valor"] for r in facets if r["campo"] == key])
            if key in FACET_FIELDS
            else [r["valor"] for r in facets if r["campo"] == key]
            for key in ["partido", "escolaridade", "genero", "raca", "ocupacao"]
        },
        municipios=municipalities,
    )


def person_profile(person_id, selected=""):
    identity = read(
        query_sql("catalog/sql/catalogo_person_profile_02.sql", fragment_0=DB), [person_id]
    )[0]
    if not identity["n"]:
        raise HTTPException(404, "Pessoa não encontrada no acervo.")
    if identity["documentos"] > 1 or identity["nascimentos"] > 1:
        raise HTTPException(
            409,
            "Identidade longitudinal inconsistente; o perfil não pode reunir estes registros com segurança.",
        )
    rows = read(
        BASE + query_sql("catalog/sql/catalogo_person_profile_03.sql", fragment_0=PUBLIC_FIELDS),
        [person_id],
    )
    if not rows:
        raise HTTPException(404, "Sem candidaturas nas seis UFs e no período do acervo.")
    if selected and not any(r["id"] == selected for r in rows):
        raise HTTPException(404, "A candidatura selecionada não pertence a este perfil histórico.")
    current = next((r for r in rows if r["id"] == selected), rows[-1])
    attach_photos(rows)
    expenses = read(
        query_sql("catalog/sql/catalogo_person_profile_01.sql", fragment_0=DB), [current["id"]]
    )
    territory = "municipio_id=?" if current["cargo"] in MUNICIPAIS else "uf=?"
    territory_value = current["municipio_id"] if current["cargo"] in MUNICIPAIS else current["uf"]
    comparison = read(
        BASE + query_sql("catalog/sql/catalogo_person_profile_04.sql", fragment_0=territory),
        [current["ano"], current["cargo"], current["uf"], territory_value],
    )[0]
    for row in rows:
        row.pop("sequencial", None)
    first_win = next((r for r in rows if r["situacao"] == "ELEITO"), None)
    returned = any(
        row["situacao"] in ("NAO_ELEITO", "SUPLENTE")
        and any(later["ano"] > row["ano"] for later in rows)
        for row in rows
    )
    return payload(
        pessoa={"id": person_id, "nome": rows[-1]["nome"], "nome_civil": rows[-1]["nome_civil"]},
        candidaturas=rows,
        selecionada=current,
        resumo={
            "primeiro_ano": rows[0]["ano"],
            "ultimo_ano": rows[-1]["ano"],
            "candidaturas": len(rows),
            "vitorias": sum(r["situacao"] == "ELEITO" for r in rows),
            "partidos": len({r["partido"] for r in rows if r["partido"]}),
            "cargos": len({r["cargo"] for r in rows}),
            "retornou_apos_derrota": returned,
            "anos_ate_primeira_vitoria": first_win["ano"] - rows[0]["ano"] if first_win else None,
        },
        despesas=expenses,
        comparacao=comparison,
        identity="Não foram encontrados atributos de identidade conflitantes para este id_candidato. Atributos ausentes não validam correspondências. Documentos não são expostos; esta não é uma auditoria independente de identidade.",
        limitations=[
            "Vitórias não comprovam exercício de mandato. Ausência posterior não comprova saída da política.",
            "Gênero, raça/cor e ocupação vêm do cadastro da pessoa, sem referência histórica por candidatura.",
            "Patrimônio usa o consolidado da candidatura; o vínculo item a item com bens não foi validado.",
            "Despesas são nominais; não informam a origem das receitas.",
        ],
    )


@router.get("/pessoas/{person_id}")
def person(person_id: str, candidatura: str = ""):
    if len(person_id) > 100:
        raise HTTPException(422, "Identificador inválido.")
    return person_profile(person_id, candidatura)


@router.get("/candidaturas/{candidate_id}")
def by_candidate(candidate_id: str):
    rows = read(
        query_sql("catalog/sql/catalogo_by_candidate_01.sql", fragment_0=DB), [candidate_id]
    )
    if not rows or not rows[0]["id_candidato"]:
        raise HTTPException(404, "Candidatura sem pessoa vinculada no acervo.")
    return person_profile(rows[0]["id_candidato"], candidate_id)


@router.get("/fotos/{candidate_id}")
def photo(candidate_id: str):
    if not available_table("Foto_Candidato"):
        raise HTTPException(404, "Fonte de fotografias indisponível no acervo.")
    rows = read(
        query_sql(
            "catalog/sql/catalogo_photo_01.sql",
            fragment_0=DB,
            fragment_1=DB,
            fragment_2=DB,
            fragment_3=PHOTO_TEST,
        ),
        [candidate_id],
    )
    if not rows:
        raise HTTPException(404, "Fotografia oficial validada indisponível.")
    row = rows[0]
    blob = row["imagem"]
    mime = row["mime_type"]
    host = urlparse(row["url_fonte"]).hostname or ""
    valid_header = blob and (
        (mime == "image/jpeg" and bytes(blob).startswith(b"\xff\xd8\xff"))
        or (mime == "image/png" and bytes(blob).startswith(b"\x89PNG\r\n\x1a\n"))
    )
    if (
        not valid_header
        or not (host == "tse.jus.br" or host.endswith(".tse.jus.br"))
        or hashlib.sha256(blob).hexdigest() != row["sha256"].lower()
    ):
        raise HTTPException(404, "Fotografia não passou na validação.")
    return Response(
        bytes(blob),
        media_type=mime,
        headers={"Cache-Control": "public,max-age=86400", "X-Content-Type-Options": "nosniff"},
    )


@router.get("/estados")
def states():
    rows = read(BASE + query_sql("catalog/sql/catalogo_states_01.sql", fragment_0=DB))
    return payload(rows=rows)


@router.get("/estados/{uf}/municipios")
def municipalities(
    uf: str,
    q: str = Query("", max_length=80),
    limit: int = Query(24, ge=1, le=48),
    offset: int = Query(0, ge=0, le=2000),
):
    if uf not in UFS:
        raise HTTPException(422, "UF fora da cobertura.")
    params = [uf, "%" + q + "%"]
    total = read(query_sql("catalog/sql/catalogo_municipalities_02.sql", fragment_0=DB), params)[0][
        "total"
    ]
    rows = read(
        query_sql("catalog/sql/catalogo_municipalities_01.sql", fragment_0=DB),
        params + [limit, offset],
    )
    return payload(rows=rows, total=total, limit=limit, offset=offset, uf=uf)


@router.get("/municipios/{municipio}")
def municipality(municipio: str, ano: int = 2024, cargo: str = "VEREADOR"):
    places = read(query_sql("catalog/sql/catalogo_municipality_01.sql", fragment_0=DB), [municipio])
    if not places or places[0]["uf"] not in UFS:
        raise HTTPException(404, "Município fora do acervo.")
    if cargo not in ("VEREADOR", "PREFEITO", "DEPUTADO ESTADUAL", "DEPUTADO FEDERAL"):
        raise HTTPException(422, "Cargo não disponível nesta análise territorial.")
    if ano < 2002 or ano > 2024 or ano % 2:
        raise HTTPException(422, "Ano inválido.")
    census = read(query_sql("catalog/sql/catalogo_municipality_02.sql", fragment_0=DB), [municipio])
    turnout = read(
        query_sql("catalog/sql/catalogo_municipality_03.sql", fragment_0=DB), [municipio]
    )
    votes = read(
        query_sql(
            "catalog/sql/catalogo_municipality_04.sql", fragment_0=DB, fragment_1=DB, fragment_2=DB
        ),
        [municipio, ano, cargo],
    )
    candidates = read(BASE + query_sql("catalog/sql/catalogo_municipality_06.sql"), [municipio])[0]
    voter_coverage = (
        read(query_sql("catalog/sql/catalogo_municipality_05.sql", fragment_0=DB), [municipio])
        if available_table("Perfil_Eleitorado_Municipio")
        else []
    )
    leaders = [
        r["partido"]
        for r in votes
        if votes
        and votes[0]["total"] is not None
        and votes[0]["total"] > 0
        and r["total"] == votes[0]["total"]
    ]
    return payload(
        municipio=places[0],
        censo=census,
        participacao=turnout,
        partidos=votes,
        lideres=leaders,
        candidaturas_municipais=candidates,
        perfil_eleitorado={
            "cobertura": voter_coverage,
            "nota": "Cobertura dos registros; distribuições dependem da validação de dimensões, gerações e denominadores.",
        },
        scope={"ano": ano, "cargo": cargo},
        limitations=[
            "Votação municipal de deputados não representa cadeiras pertencentes ao município.",
            "PIB é apresentado na unidade original do acervo. A conversão para reais e PIB per capita aguarda validação documental da unidade.",
        ],
    )


@router.get("/legendas")
def party_overview(
    ano: int = 2024, cargo: str = "VEREADOR", uf: str = "", municipio: str = "", partido: str = ""
):
    f = filters(
        q="",
        ano=ano,
        cargo=cargo,
        uf=uf,
        municipio=municipio,
        partido=partido,
        idade_min=None,
        idade_max=None,
        gasto_min=None,
        gasto_max=None,
        patrimonio_min=None,
        patrimonio_max=None,
    )
    condition, params = where(f)
    measures = """COUNT(*) candidaturas,COUNT(DISTINCT id_candidato) pessoas,
      COUNT(*) FILTER(WHERE situacao='ELEITO') eleitos,
      SUM(votos) votos_nominais,COUNT(votos) registros_com_votos,
      SUM(gastos) despesas,COUNT(gastos) registros_com_despesa,
      COUNT(DISTINCT uf) estados,COUNT(DISTINCT municipio_id) municipios"""
    rows = read(
        BASE
        + query_sql(
            "catalog/sql/catalogo_party_overview_01.sql", fragment_0=measures, fragment_1=condition
        ),
        params,
    )
    summary = read(
        BASE
        + query_sql(
            "catalog/sql/catalogo_party_overview_03.sql", fragment_0=measures, fragment_1=condition
        ),
        params,
    )[0]
    territories = read(
        BASE
        + query_sql(
            "catalog/sql/catalogo_party_overview_02.sql", fragment_0=measures, fragment_1=condition
        ),
        params,
    )
    return payload(
        rows=rows,
        resumo=summary,
        territorios=territories,
        filters=f,
        method="Eleições ordinárias; última rodada observada por candidatura. Votos nominais das candidaturas, sem votos de legenda. Eleitos são resultados registrados, não mandatos comprovados. Despesas nominais conhecidas; ausência não equivale a zero. Siglas da eleição, sem consolidar fusões ou mudanças de nome.",
    )
