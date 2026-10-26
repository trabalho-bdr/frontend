"""Consultas somente leitura da análise de patrimônio x sucesso eleitoral (Q2).

Regras de classificação (conferidas contra os valores reais de
Resultado_Candidatura.resultado):

* sucesso   -> começa com 'ELEITO' (ELEITO, ELEITO POR QP, ELEITO POR MÉDIA).
               Nunca LIKE '%ELEITO%', que casaria com 'NÃO ELEITO'.
* insucesso -> 'NÃO ELEITO' e 'SUPLENTE' (disputou e não assumiu cadeira).
* excluídos -> '#NULO' (candidatura sem votos válidos) e '2º TURNO'
               (resultado ainda indefinido naquele turno). Qualquer valor novo
               também fica de fora, em vez de ser contado como fracasso.

Cada candidatura entra uma única vez, com o resultado do último turno.
O ano vem de Eleicao.ano. Só PREFEITO e VEREADOR têm município
(Candidatura.id_municipio); os demais cargos são estaduais.
"""
import re

from fastapi import HTTPException

UFS = ('CE', 'MA', 'MS', 'RJ', 'RN', 'RS')
ANOS = (2018, 2020, 2022, 2024)
# Vices e suplentes ficam de fora: o sucesso deles depende da chapa/lista.
CARGOS = ('PREFEITO', 'VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL',
          'SENADOR', 'GOVERNADOR', 'PRESIDENTE')
INSUCESSO = ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')
IBGE = re.compile(r'^\d{7}$')


def _marcas(n):
    return ', '.join('?' for _ in range(n))


def _validar(ano, cargo, uf, municipio):
    if ano is not None and ano not in ANOS:
        raise HTTPException(422, f'Ano fora do recorte disponível ({", ".join(map(str, ANOS))}).')
    if cargo and cargo.upper() not in CARGOS:
        raise HTTPException(422, 'Cargo fora do recorte disponível.')
    if uf and uf.upper() not in UFS:
        raise HTTPException(422, 'UF fora do recorte disponível.')
    if municipio and not IBGE.match(municipio):
        raise HTTPException(422, 'Município inválido: use o código IBGE de 7 dígitos.')
    return (cargo.upper() if cargo else None), (uf.upper() if uf else None)


def _base(ano, cargo, uf, municipio):
    """CTE 'base' (uma linha por candidatura) e os parâmetros, na ordem dos '?'."""
    filtros, params = [f'upper(cg.nome) IN ({_marcas(len(CARGOS))})'], list(CARGOS)
    for condicao, valor in (('e.ano = ?', ano), ('upper(cg.nome) = ?', cargo),
                            ('c.uf = ?', uf), ('c.id_municipio = ?', municipio)):
        if valor:
            filtros.append(condicao)
            params.append(valor)
    sql = f'''
        WITH ultimo AS (
            SELECT id_candidatura, resultado
            FROM "Resultado_Candidatura"
            QUALIFY row_number() OVER (PARTITION BY id_candidatura ORDER BY turno DESC) = 1
        ), base AS (
            SELECT c.id_candidatura, c.id_municipio, c.uf, c.patrimonio,
                   CASE WHEN starts_with(upper(u.resultado), 'ELEITO') THEN 1
                        WHEN upper(u.resultado) IN ({_marcas(len(INSUCESSO))}) THEN 0
                   END AS eleito
            FROM "Candidatura" c
            JOIN "Cargo" cg ON cg.id_candidatura = c.id_candidatura
            JOIN "Eleicao" e ON e.id_eleicao = c.id_eleicao
            LEFT JOIN ultimo u ON u.id_candidatura = c.id_candidatura
            WHERE {' AND '.join(filtros)}
        )'''
    # ordem dos '?' no texto: INSUCESSO (SELECT) e depois os filtros (WHERE)
    return sql, list(INSUCESSO) + params


def opcoes(consultar):
    """Pares (ano, cargo) que existem no banco, dentro do recorte de anos e cargos."""
    rows = consultar(f'''
        SELECT DISTINCT e.ano AS ano, upper(cg.nome) AS cargo
        FROM "Candidatura" c
        JOIN "Cargo" cg ON cg.id_candidatura = c.id_candidatura
        JOIN "Eleicao" e ON e.id_eleicao = c.id_eleicao
        WHERE upper(cg.nome) IN ({_marcas(len(CARGOS))}) AND e.ano IN ({_marcas(len(ANOS))})
    ''', list(CARGOS) + list(ANOS))
    ordem = {c: i for i, c in enumerate(CARGOS)}
    pares = sorted(({'ano': int(r['ano']), 'cargo': r['cargo']} for r in rows),
                   key=lambda o: (-o['ano'], ordem[o['cargo']]))
    return {'opcoes': pares, 'anos': list(ANOS), 'ufs': list(UFS)}


_VALIDO = '(patrimonio IS NOT NULL AND patrimonio >= 0 AND eleito IS NOT NULL) AS valido'
_TERRITORIO = '''
        count(*) AS candidaturas,
        count(*) FILTER (WHERE valido) AS analisadas,
        coalesce(sum(eleito) FILTER (WHERE valido), 0)::BIGINT AS eleitos,
        median(patrimonio) FILTER (WHERE valido) AS patrimonio_mediano,
        median(patrimonio) FILTER (WHERE valido AND eleito = 1) AS patrimonio_mediano_eleitos,
        median(patrimonio) FILTER (WHERE valido AND eleito = 0) AS patrimonio_mediano_nao_eleitos'''


def _taxa(linha):
    linha['taxa_sucesso_pct'] = 100.0 * linha['eleitos'] / linha['analisadas'] if linha['analisadas'] else None
    return linha


def municipios(consultar, ano=None, cargo=None, uf=None):
    """Um valor por município (só cargos municipais) e um por UF, para colorir o mapa."""
    cargo, uf = _validar(ano, cargo, uf, None)
    cte, p = _base(ano, cargo, uf, None)
    por_municipio = [_taxa(r) for r in consultar(f'''{cte}
        , v AS (SELECT *, {_VALIDO} FROM base)
        SELECT v.id_municipio, m.nome AS municipio, v.uf, {_TERRITORIO}
        FROM v LEFT JOIN "Municipio" m ON m.id_municipio = v.id_municipio
        WHERE v.id_municipio IS NOT NULL
        GROUP BY v.id_municipio, m.nome, v.uf
        ORDER BY v.uf, m.nome
    ''', p)]
    por_uf = [_taxa(r) for r in consultar(f'''{cte}
        , v AS (SELECT *, {_VALIDO} FROM base)
        SELECT v.uf, {_TERRITORIO}
        FROM v GROUP BY v.uf ORDER BY v.uf
    ''', p)]
    return {'ano': ano, 'cargo': cargo, 'uf': uf, 'tem_municipio': bool(por_municipio),
            'municipios': por_municipio, 'ufs': por_uf}


def resumo(consultar, ano=None, cargo=None, uf=None, municipio=None):
    cargo, uf = _validar(ano, cargo, uf, municipio)
    cte, p = _base(ano, cargo, uf, municipio)
    valido = 'patrimonio IS NOT NULL AND patrimonio >= 0 AND eleito IS NOT NULL'

    resumo_situacao = consultar(f'''{cte}
        SELECT CASE WHEN eleito = 1 THEN 'eleito' ELSE 'nao_eleito' END AS situacao,
               count(*) AS candidaturas,
               avg(patrimonio) AS patrimonio_medio,
               median(patrimonio) AS patrimonio_mediano
        FROM base WHERE {valido}
        GROUP BY situacao ORDER BY situacao
    ''', p)

    correlacao = (consultar(f'''{cte}
        SELECT corr(patrimonio, eleito) AS linear,
               corr(ln(patrimonio + 1), eleito) AS log,
               count(*) AS candidaturas
        FROM base WHERE {valido}
    ''', p) or [{}])[0]

    decis = consultar(f'''{cte}
        , f AS (
            SELECT patrimonio, eleito,
                   ntile(10) OVER (ORDER BY patrimonio, id_candidatura) AS decil
            FROM base WHERE {valido}
        )
        SELECT decil, min(patrimonio) AS patrimonio_min, max(patrimonio) AS patrimonio_max,
               count(*) AS candidaturas, sum(eleito)::BIGINT AS eleitos,
               100.0 * sum(eleito) / count(*) AS taxa_sucesso_pct
        FROM f GROUP BY decil ORDER BY decil
    ''', p)

    cob = (consultar(f'''{cte}
        SELECT count(*) AS total,
               count(*) FILTER (WHERE patrimonio IS NOT NULL AND patrimonio >= 0) AS validos,
               count(*) FILTER (WHERE patrimonio < 0) AS negativos,
               count(*) FILTER (WHERE patrimonio IS NOT NULL AND patrimonio >= 0
                                  AND eleito IS NULL) AS sem_resultado_definido
        FROM base
    ''', p) or [{}])[0]
    cob = {k: int(cob.get(k) or 0) for k in ('total', 'validos', 'negativos', 'sem_resultado_definido')}
    cob['cobertura_pct'] = 100.0 * cob['validos'] / cob['total'] if cob['total'] else None

    return {'ano': ano, 'cargo': cargo, 'uf': uf, 'municipio': municipio, 'ufs_cobertas': list(UFS),
            'resumo_situacao': resumo_situacao, 'correlacao': correlacao,
            'decis': decis, 'cobertura': cob}
