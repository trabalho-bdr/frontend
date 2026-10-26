"""Evolução descritiva de publicidade e resultado; sem estimar efeito causal."""
from collections import defaultdict
from decimal import Decimal

from fastapi import HTTPException

from . import q2, q9


def _validar(cargo, uf):
    cargo = q9._codigo(cargo)
    uf = uf.upper() if uf else None
    if cargo not in q2.CARGOS:
        raise HTTPException(422, 'A evolução de sucesso aceita apenas os cargos titulares da questão 2.')
    if uf and uf not in q9.UFS:
        raise HTTPException(422, 'UF fora do recorte disponível.')
    return cargo, uf


def partidos(consultar, cargo, uf=None):
    cargo, uf = _validar(cargo, uf)
    refs = q9._fontes(consultar)
    if 'partido' not in refs:
        raise HTTPException(503, 'Cadastro de partidos indisponível.')
    return {'partidos': consultar(f'''SELECT DISTINCT p.id_partido,p.sigla,p.nome
        FROM {refs['candidatura']} c JOIN {refs['eleicao']} e USING(id_eleicao)
        JOIN {refs['partido']} p USING(id_partido)
        WHERE e.ano IN (2018,2020,2022,2024) AND upper(strip_accents(trim(e.cargo)))=?
        AND c.uf IN ('CE','MA','MS','RJ','RN','RS') AND (? IS NULL OR c.uf=?)
        ORDER BY p.sigla,p.id_partido''', [cargo, uf, uf])}


def _perfil(grupos):
    total = sum(grupos.values(), Decimal(0))
    if total <= 0 or any(v < 0 for v in grupos.values()):
        return None
    return {g: float(v / total * 100) for g, v in grupos.items()}


def _taxa(resultados):
    validos = [v for v in resultados if v is not None]
    return {'analisadas': len(validos), 'eleitas': sum(validos),
            'taxa': 100 * sum(validos) / len(validos) if validos else None}


def _distancia(a, b):
    return sum(abs(b.get(g, 0) - a.get(g, 0)) for g in a.keys() | b.keys()) / 2


def _coorte(pares):
    antes, depois = _taxa([a['eleito'] for a, b in pares]), _taxa([b['eleito'] for a, b in pares])
    return {'pares': len(pares), 'antes': antes, 'depois': depois,
            'variacao_taxa_pp': depois['taxa'] - antes['taxa'] if pares else None,
            'novas_vitorias': sum(a['eleito'] == 0 and b['eleito'] == 1 for a, b in pares),
            'vitorias_consecutivas': sum(a['eleito'] == b['eleito'] == 1 for a, b in pares)}


def resumo(consultar, cargo, uf=None, id_partido=None, id_candidato=None, criterio='sugeridas'):
    cargo, uf = _validar(cargo, uf)
    if bool(id_partido) == bool(id_candidato):
        raise HTTPException(422, 'Selecione um partido ou um candidato para comparar as eleições.')
    if criterio not in ('sugeridas', 'explicitas'):
        raise HTTPException(422, 'Critério de classificação inválido.')
    refs = q9._fontes(consultar)
    if not all(t in refs for t in ('resultado_candidatura', 'partido', 'candidato')):
        raise HTTPException(503, 'Cadastros e resultados eleitorais indisponíveis para esta análise.')
    tabela, campo, identidade = ('partido', 'id_partido', id_partido) if id_partido else ('candidato', 'id_candidato', id_candidato)
    colunas = 'id_partido,sigla,nome' if id_partido else 'id_candidato,nome_civil'
    entidade = consultar(f'SELECT {colunas} FROM {refs[tabela]} WHERE {q9._ident(campo)}=?', [identidade])
    if not entidade:
        raise HTTPException(404, 'Partido ou candidato não encontrado.')
    entidade = entidade[0]
    # Os anos vêm do cargo, mesmo quando a entidade não participou de uma eleição.
    anos = [r['ano'] for r in consultar(f'''SELECT DISTINCT e.ano FROM {refs['candidatura']} c
        JOIN {refs['eleicao']} e USING(id_eleicao) WHERE e.ano IN (2018,2020,2022,2024)
        AND upper(strip_accents(trim(e.cargo)))=? AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
        AND (? IS NULL OR c.uf=?) ORDER BY e.ano''', [cargo, uf, uf])]
    base = f'''SELECT c.id_candidatura,c.id_candidato,c.uf,c.id_municipio,e.ano,p.sigla partido,
        coalesce(c.id_candidato,c.id_candidatura) pessoa
        FROM {refs['candidatura']} c JOIN {refs['eleicao']} e USING(id_eleicao)
        LEFT JOIN {refs['partido']} p USING(id_partido)
        WHERE e.ano IN (2018,2020,2022,2024) AND upper(strip_accents(trim(e.cargo)))=?
        AND c.uf IN ('CE','MA','MS','RJ','RN','RS') AND (? IS NULL OR c.uf=?) AND c.{campo}=?'''
    params = [cargo, uf, uf, identidade]
    categorias = [r['categoria'] for r in consultar(f'''WITH base AS ({base})
        SELECT DISTINCT d.categoria FROM base JOIN {refs['despesa_candidatura']} d USING(id_candidatura)''', params)]
    arrays, origem = q9._normalizacao(consultar, refs, categorias)
    # Agrega resultados antes das despesas: turnos jamais multiplicam valores.
    # Empates conflitantes no último turno ficam com resultado indefinido.
    rows = consultar(f'''WITH base AS ({base}), ultimo AS (
        SELECT r.turno,r.resultado,b.pessoa,b.uf,b.id_municipio,b.ano
        FROM {refs['resultado_candidatura']} r JOIN base b USING(id_candidatura)
        QUALIFY dense_rank() OVER (PARTITION BY b.pessoa,b.uf,b.id_municipio,b.ano ORDER BY r.turno DESC)=1
    ), resultado AS (
        SELECT pessoa,uf,id_municipio,ano,
            CASE WHEN count(DISTINCT resultado)=1 THEN max(resultado) END resultado
        FROM ultimo GROUP BY pessoa,uf,id_municipio,ano
    ), classificacao AS (
        SELECT unnest(?::VARCHAR[]) categoria,unnest(?::VARCHAR[]) padronizada,
            unnest(?::VARCHAR[]) grupo,unnest(?::BOOLEAN[]) publicidade,
            unnest(?::VARCHAR[]) status,unnest(?::BOOLEAN[]) revisar
    ), despesas AS (
        SELECT d.*,CASE WHEN isfinite(d.valor) THEN try_cast(d.valor AS DECIMAL(24,2)) END dinheiro,
            n.grupo,n.revisar,(n.publicidade IS TRUE AND (?='sugeridas' OR
            (n.status='ALIAS_EXPLICITO' AND NOT n.revisar))) elegivel
        FROM {refs['despesa_candidatura']} d JOIN base USING(id_candidatura)
        LEFT JOIN classificacao n ON d.categoria IS NOT DISTINCT FROM n.categoria
    ) SELECT min(b.id_candidatura) id_candidatura,b.id_candidato,b.uf,b.id_municipio,b.ano,b.pessoa,
        string_agg(DISTINCT b.partido,' / ' ORDER BY b.partido) partido,r.resultado,
        CASE WHEN starts_with(upper(r.resultado),'ELEITO') THEN 1
             WHEN upper(r.resultado) IN ({','.join('?' for _ in q2.INSUCESSO)}) THEN 0 END eleito,
        CASE WHEN d.elegivel THEN d.grupo END grupo,
        coalesce(sum(d.dinheiro) FILTER (WHERE d.elegivel),0) publicidade,
        coalesce(sum(d.dinheiro),0) total_campanha,
        coalesce(sum(d.dinheiro) FILTER (WHERE d.elegivel AND d.revisar),0) em_revisao,
        count(d.id_despesa) despesas,count(d.id_despesa) FILTER (WHERE d.dinheiro IS NULL) sem_valor
        FROM base b LEFT JOIN resultado r ON r.pessoa=b.pessoa AND r.uf=b.uf AND r.ano=b.ano
            AND r.id_municipio IS NOT DISTINCT FROM b.id_municipio
        LEFT JOIN despesas d USING(id_candidatura)
        GROUP BY ALL ORDER BY b.ano,b.pessoa,grupo''', params + arrays + [criterio] + list(q2.INSUCESSO))
    perfis = {}
    for r in rows:
        chave = (r['pessoa'], r['uf'], r['id_municipio'], r['ano'])
        p = perfis.setdefault(chave, {**{k: r[k] for k in ('id_candidatura','id_candidato','uf','id_municipio','ano','partido','eleito','resultado')},
            'grupos': {}, 'publicidade': Decimal(0), 'total_campanha': Decimal(0), 'em_revisao': Decimal(0), 'despesas': 0, 'sem_valor': 0})
        if r['grupo'] is not None:
            p['grupos'][r['grupo']] = Decimal(str(r['publicidade']))
        # The portal serializes DuckDB decimals to float before this service.
        # Normalize monetary values at this boundary, retaining decimal cents.
        for k in ('publicidade', 'total_campanha', 'em_revisao'):
            p[k] += Decimal(str(r[k]))
        for k in ('despesas', 'sem_valor'):
            p[k] += r[k]
    por_ano = defaultdict(list)
    for p in perfis.values():
        p['perfil'] = _perfil(p['grupos'])
        por_ano[p['ano']].append(p)
    serie, totais = [], {}
    for ano in anos:
        pessoas = por_ano[ano]
        grupos = defaultdict(Decimal)
        for p in pessoas:
            for grupo, valor in p['grupos'].items():
                grupos[grupo] += valor
        perfil = _perfil(grupos)
        totais[ano] = perfil
        resultado = _taxa([p['eleito'] for p in pessoas])
        serie.append({'ano': ano, 'candidaturas': len(pessoas), 'resultado': resultado,
            'sem_resultado': len(pessoas) - resultado['analisadas'],
            'com_despesas': sum(p['despesas'] > 0 for p in pessoas),
            'com_perfil': sum(p['perfil'] is not None for p in pessoas),
            'publicidade': float(sum((p['publicidade'] for p in pessoas), Decimal(0))),
            'em_revisao': float(sum((p['em_revisao'] for p in pessoas), Decimal(0))),
            'sem_valor': sum(p['sem_valor'] for p in pessoas),
            'partidos': sorted({p['partido'] for p in pessoas if p['partido']}),
            'resultados': sorted({p['resultado'] for p in pessoas if p['resultado']}),
            'grupos': [{'grupo': g, 'valor': float(v), 'participacao': perfil[g] if perfil else None}
                       for g, v in sorted(grupos.items(), key=lambda t: (-t[1], t[0]))]})
    comparacoes = []
    for antes, depois in zip(anos, anos[1:]):
        # Mesmo cargo, UF e município, eleições regulares consecutivas de 4 anos.
        def indexar(ano):
            grupos = defaultdict(list)
            for p in por_ano[ano]:
                if p['id_candidato']:
                    grupos[(p['id_candidato'],p['uf'],p['id_municipio'])].append(p)
            return {k: v[0] for k, v in grupos.items() if len(v) == 1}
        a, b = indexar(antes), indexar(depois)
        comuns = [(a[k], b[k]) for k in a.keys() & b.keys()] if depois - antes == 4 else []
        comparaveis = [(x, y) for x, y in comuns if x['perfil'] is not None and y['perfil'] is not None]
        pares = [(x, y) for x, y in comparaveis if x['eleito'] is not None and y['eleito'] is not None]
        faixas = []
        for rotulo, minimo, maximo in [('Menos de 10 p.p.',0,10),('De 10 a menos de 30 p.p.',10,30),('30 p.p. ou mais',30,101)]:
            subset = [(x, y) for x, y in pares if minimo <= _distancia(x['perfil'], y['perfil']) < maximo]
            faixas.append({'faixa': rotulo, **_coorte(subset)})
        grupos = sorted({g for x, y in pares for g in x['perfil'].keys() | y['perfil'].keys()})
        associacoes = []
        for grupo in grupos:
            expostos = [(x, y) for x, y in pares if x['perfil'].get(grupo, 0) > 0 or y['perfil'].get(grupo, 0) > 0]
            ampliaram = [(x, y) for x, y in expostos if y['perfil'].get(grupo, 0) - x['perfil'].get(grupo, 0) >= 10]
            outros = [(x, y) for x, y in expostos if y['perfil'].get(grupo, 0) - x['perfil'].get(grupo, 0) < 10]
            t1, t2 = _coorte(ampliaram), _coorte(outros)
            associacoes.append({'grupo': grupo, 'ampliaram': t1, 'outros': t2,
                'diferenca_taxas_pp': t1['depois']['taxa'] - t2['depois']['taxa'] if ampliaram and outros else None})
        pa, pb = totais[antes], totais[depois]
        comparacoes.append({'antes': antes, 'depois': depois,
            'mudanca_pp': _distancia(pa, pb) if pa is not None and pb is not None else None,
            'variacoes': [{'grupo': g, 'antes': pa.get(g,0), 'depois': pb.get(g,0), 'delta_pp': pb.get(g,0)-pa.get(g,0)}
                          for g in sorted(pa.keys() | pb.keys())] if pa is not None and pb is not None else [],
            'candidatos_repetidos': len(comuns), 'perfis_comparaveis': len(comparaveis),
            'coorte': _coorte(pares), 'faixas': faixas, 'associacoes': associacoes})
    return {'cargo': cargo, 'uf': uf, 'criterio': criterio, 'modo': 'partido' if id_partido else 'candidato',
            'entidade': entidade, 'origem_normalizacao': origem, 'serie': serie, 'comparacoes': comparacoes}
