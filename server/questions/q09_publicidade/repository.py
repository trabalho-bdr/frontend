"""Consultas somente leitura da Q9; reutiliza a normalização existente."""

from core.sql import query_sql
import unicodedata
import re
from decimal import Decimal
from functools import lru_cache

from fastapi import HTTPException

ANOS = (2018, 2020, 2022, 2024)
UFS = ("CE", "MA", "MS", "RJ", "RN", "RS")


def _ident(value):
    return '"' + value.replace('"', '""') + '"'


def _codigo(value):
    text = unicodedata.normalize("NFD", value.strip())
    return "".join(c for c in text if unicodedata.category(c) != "Mn").upper()


def _fontes(consultar):
    rows = consultar(query_sql("questions/q09_publicidade/sql/repository__fontes_01.sql"))
    for schema in ("main", "der_bdr"):
        found = {
            r["table_name"].lower(): ".".join(
                map(_ident, (r["table_catalog"], schema, r["table_name"]))
            )
            for r in rows
            if r["table_schema"] == schema
        }
        if all(name in found for name in ("candidatura", "eleicao", "despesa_candidatura")):
            found["_schema"] = schema
            return found
    raise HTTPException(
        503, "O banco selecionado não contém as tabelas de despesas e candidaturas da Q9."
    )


def _recorte(refs, ano, cargo, uf, id_candidatura=None):
    source = (
        f"{refs['despesa_candidatura']} d JOIN {refs['candidatura']} c USING(id_candidatura) "
        f"JOIN {refs['eleicao']} e USING(id_eleicao)"
    )
    where = "e.ano=? AND upper(strip_accents(trim(e.cargo)))=? AND c.uf IN ('CE','MA','MS','RJ','RN','RS')"
    params = [ano, _codigo(cargo)]
    if uf:
        where += " AND c.uf=?"
        params.append(uf)
    if id_candidatura:
        where += " AND c.id_candidatura=?"
        params.append(id_candidatura)
    return source, where, params


def _buscar_candidatos(consultar, refs, ano, cargo, uf, busca="", id_candidatura=None):
    if not all(t in refs for t in ("candidato", "municipio", "partido")):
        raise HTTPException(
            503, "O banco não contém o cadastro necessário para pesquisar candidatos."
        )
    source, where, params = _recorte(refs, ano, cargo, uf, id_candidatura)
    if busca:
        where += """ AND (contains(upper(strip_accents(coalesce(c.nome_urna,''))),?)
            OR contains(upper(strip_accents(coalesce(a.nome_civil,''))),?))"""
        params += [_codigo(busca), _codigo(busca)]
    return consultar(
        query_sql(
            "questions/q09_publicidade/sql/repository__buscar_candidatos_01.sql",
            fragment_0=source,
            fragment_1=refs["candidato"],
            fragment_2=refs["municipio"],
            fragment_3=refs["partido"],
            fragment_4=where,
        ),
        params,
    )


def candidatos(consultar, ano, cargo, busca, uf=None):
    if ano not in ANOS or not cargo or not cargo.strip():
        raise HTTPException(422, "Selecione um ano e cargo válidos para a Q9.")
    uf = uf.upper() if uf else None
    if uf and uf not in UFS:
        raise HTTPException(422, "UF fora do recorte disponível.")
    busca = busca.strip()
    if len(busca) < 2:
        return {"candidatos": [], "tem_mais": False}
    if len(busca) > 120:
        raise HTTPException(422, "A busca aceita até 120 caracteres.")
    rows = _buscar_candidatos(consultar, _fontes(consultar), ano, cargo, uf, busca)
    return {"candidatos": rows[:20], "tem_mais": len(rows) > 20}


def opcoes(consultar):
    refs = _fontes(consultar)
    rows = consultar(
        query_sql(
            "questions/q09_publicidade/sql/repository_opcoes_01.sql",
            fragment_0=refs["despesa_candidatura"],
            fragment_1=refs["candidatura"],
            fragment_2=refs["eleicao"],
        )
    )
    return {
        "opcoes": [
            dict(ano=r["ano"], cargo=r["cargo"], rotulo=r["cargo"].capitalize()) for r in rows
        ],
        "anos": list(ANOS),
        "ufs": list(UFS),
    }


@lru_cache(maxsize=50000)
def _classificar(categoria):
    # Não modifica o gerador ou as regras que o usuário decidiu manter.
    from q9_normalizacao.gerar_normalizacao import classify

    result = classify(categoria)
    return (
        result["categoria_padronizada"],
        result["grupo_despesa"],
        result["eh_publicidade_sugerida"],
        result["status_classificacao"],
        result["requer_revisao"],
    )


def _normalizacao_do_recorte(consultar, refs):
    """Reusa a definição instalada, trocando só a entrada da view gerada.

    A view global aplica regex sobre todas as descrições de despesas antes
    do filtro externo. A relação de parâmetros evita esse trabalho global,
    preservando aliases, regras e decisões de classificação do catálogo.
    Views personalizadas que não seguem esse formato continuam intactas.
    """
    if not all(
        name in refs
        for name in ("vw_q9_categorias", "vw_q9_regras_categorias", "vw_q9_aliases_categorias")
    ):
        return None
    definicoes = consultar(
        query_sql("questions/q09_publicidade/sql/repository__normalizacao_do_recorte_02.sql"),
        [refs["_schema"]],
    )
    if not definicoes or not definicoes[0]["sql"]:
        return None
    definicao = definicoes[0]["sql"]
    qualificador = r'(?:(?:"[^"]+"|\w+)\.)*'
    entrada = re.search(
        r"\bAS\s+WITH\s+distintas\s+AS\s*\(\s*SELECT\s+DISTINCT\s+"
        r"categoria\s+AS\s+categoria_original\s*,\s*"
        + qualificador
        + r"q9_normalizar_categoria\(categoria\)\s+AS\s+chave\s+FROM\s+"
        + qualificador
        + r'"?Despesa_Candidatura"?\s*\)\s*,\s*chaves\s+AS\s*\(',
        definicao,
        re.IGNORECASE,
    )
    if not entrada:
        return None
    schema = refs["vw_q9_categorias"].rsplit(".", 1)[0]
    return query_sql(
        "questions/q09_publicidade/sql/repository__normalizacao_do_recorte_01.sql",
        fragment_0=refs["vw_q9_regras_categorias"],
        fragment_1=refs["vw_q9_aliases_categorias"],
        fragment_2=schema,
        fragment_3=definicao[entrada.end() :].rstrip().rstrip(";"),
    )


def _normalizacao(consultar, refs, categorias):
    origem = "views_q9" if "vw_q9_categorias" in refs else "regras_locais_q9"
    dimension = {}
    if categorias and origem == "views_q9":
        consulta_recorte = _normalizacao_do_recorte(consultar, refs)
        fonte = f"({consulta_recorte})" if consulta_recorte else refs["vw_q9_categorias"]
        filtro = (
            ""
            if consulta_recorte
            else """JOIN unnest(?::VARCHAR[]) f(categoria)
            ON n.categoria_original IS NOT DISTINCT FROM f.categoria"""
        )
        rows = consultar(
            query_sql(
                "questions/q09_publicidade/sql/repository__normalizacao_01.sql",
                fragment_0=fonte,
                fragment_1=filtro,
            ),
            [categorias],
        )
        for row in rows:
            raw = row["categoria_original"]
            if raw in dimension:
                raise HTTPException(
                    503, "Há classificações conflitantes para uma mesma descrição na Q9."
                )
            dimension[raw] = tuple(
                row[k]
                for k in (
                    "categoria_padronizada",
                    "grupo_despesa",
                    "eh_publicidade_sugerida",
                    "status_classificacao",
                    "requer_revisao",
                )
            )
        if set(dimension) != set(categorias):
            raise HTTPException(
                503, "A normalização da Q9 está incompleta para o recorte selecionado."
            )
    else:
        dimension = {raw: _classificar(raw) for raw in categorias}
    arrays = [categorias] + [[dimension[raw][i] for raw in categorias] for i in range(5)]
    return arrays, origem


def resumo(consultar, ano, cargo, uf=None, criterio="sugeridas", id_candidatura=None):
    if ano not in ANOS:
        raise HTTPException(422, "A Q9 aceita os anos 2018, 2020, 2022 e 2024.")
    if not cargo or not cargo.strip():
        raise HTTPException(422, "Selecione o cargo disputado.")
    uf = uf.upper() if uf else None
    if uf and uf not in UFS:
        raise HTTPException(422, "UF fora do recorte disponível.")
    if criterio not in ("sugeridas", "explicitas"):
        raise HTTPException(422, "Critério de classificação inválido.")
    refs = _fontes(consultar)
    candidato = None
    if id_candidatura:
        encontrados = _buscar_candidatos(
            consultar, refs, ano, cargo, uf, id_candidatura=id_candidatura
        )
        if not encontrados:
            raise HTTPException(
                404, "Candidatura sem despesas no ano, cargo e estado selecionados."
            )
        candidato = encontrados[0]
    source, where, params = _recorte(refs, ano, cargo, uf, id_candidatura)
    # Agrega na fonte antes de trazer a classificação para o processo Python.
    # Um JOIN entre arrays locais e todas as despesas pode deslocar a leitura
    # inteira do MotherDuck para a máquina do servidor.
    despesas = consultar(
        query_sql(
            "questions/q09_publicidade/sql/repository_resumo_01.sql",
            fragment_0=source,
            fragment_1=where,
        ),
        params,
    )
    categorias = list(dict.fromkeys(r["categoria"] for r in despesas))
    arrays, origem = _normalizacao(consultar, refs, categorias)
    classificacao = dict(zip(categorias, zip(*arrays[1:])))
    total = {
        k: Decimal(0)
        for k in (
            "valor",
            "total_campanha",
            "indefinido",
            "fora_publicidade",
            "excluido_criterio",
            "em_revisao",
        )
    }
    total.update(registros=0, candidaturas=set(), sem_valor=0, ajustes_negativos=0)
    grupos_por_nome, categorias_por_nome = {}, {}
    for despesa in despesas:
        padronizada, grupo, publicidade, status, revisar = classificacao[despesa["categoria"]]
        valor = Decimal(despesa["valor"])
        total["total_campanha"] += valor
        total["sem_valor"] += despesa["sem_valor"]
        elegivel = publicidade is True and (
            criterio == "sugeridas" or (status == "ALIAS_EXPLICITO" and revisar is False)
        )
        if not elegivel:
            campo = (
                "indefinido"
                if publicidade is None
                else "fora_publicidade"
                if publicidade is False
                else "excluido_criterio"
            )
            total[campo] += valor
            continue
        total["ajustes_negativos"] += despesa["ajustes_negativos"]
        grupo_total = grupos_por_nome.setdefault(
            grupo,
            dict(
                grupo_despesa=grupo,
                categoria_padronizada=None,
                valor=Decimal(0),
                registros=0,
                candidaturas=set(),
                em_revisao=Decimal(0),
            ),
        )
        categoria_total = categorias_por_nome.setdefault(
            (grupo, padronizada),
            dict(
                grupo_despesa=grupo,
                categoria_padronizada=padronizada,
                valor=Decimal(0),
                registros=0,
                candidaturas=set(),
                em_revisao=Decimal(0),
            ),
        )
        for agregado in (total, grupo_total, categoria_total):
            agregado["valor"] += valor
            agregado["registros"] += despesa["registros"]
            if despesa["id_candidatura"] is not None:
                agregado["candidaturas"].add(despesa["id_candidatura"])
            if revisar is True:
                agregado["em_revisao"] += valor
    denominator = total["valor"]

    def item(row):
        value = Decimal(row["valor"])
        return {
            "grupo": row["grupo_despesa"],
            "categoria": row["categoria_padronizada"],
            "valor": float(value),
            "participacao": float(100 * value / denominator) if denominator > 0 else None,
            "candidaturas": len(row["candidaturas"]),
            "registros": row["registros"],
            "em_revisao": float(row["em_revisao"]),
        }

    grupos = sorted(
        [item(r) for r in grupos_por_nome.values()], key=lambda r: (-r["valor"], r["grupo"] or "")
    )
    palavras = sorted(
        [item(r) for r in categorias_por_nome.values()],
        key=lambda r: (-r["valor"], r["categoria"] or ""),
    )
    return {
        "ano": ano,
        "cargo": _codigo(cargo),
        "uf": uf,
        "ufs_cobertas": list(UFS),
        "criterio": criterio,
        "origem_normalizacao": origem,
        "grupos": grupos,
        "categorias": palavras,
        "candidato": candidato,
        "resumo": {
            "publicidade": float(total["valor"]),
            "total_campanha": float(total["total_campanha"]),
            "indefinido": float(total["indefinido"]),
            "fora_publicidade": float(total["fora_publicidade"]),
            "excluido_criterio": float(total["excluido_criterio"]),
            "em_revisao": float(total["em_revisao"]),
            "registros": total["registros"],
            "candidaturas": len(total["candidaturas"]),
            "sem_valor": total["sem_valor"],
            "ajustes_negativos": total["ajustes_negativos"],
            "tipos": len(grupos),
            "categorias": len(palavras),
        },
    }
