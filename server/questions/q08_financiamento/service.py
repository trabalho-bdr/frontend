from core.sql import query_sql
from fastapi import HTTPException
from core.config import DB
from catalog_facets import facet_sql,facet_key
from questions.shared.scope import candidate_scope,PROPORTIONAL,SCHOOLS
from questions.shared.statistics import percent,wilson,correlation
import json,math,statistics
from questions.shared.repository import municipal_data,party_votes

def calculate(f, context):
    read = context.query
    DATA = context.data_path
    path = DATA / 'receitas-candidatos.parquet'
    manifest = DATA / 'receitas-manifest.json'
    if not path.exists() or not manifest.exists():
        return dict(rows=[], summary=None, status='fonte_pendente', unit='percent', method='Receitas do TSE ainda não importadas.', limitations=['Não se infere origem a partir de despesa.'])
    import duckdb
    provenance = json.loads(manifest.read_text(encoding='utf8'))
    year = provenance['years'].get(str(f['ano']), {})
    if year.get('status') != 'loaded':
        return dict(rows=[], summary=None, status='fonte_pendente', unit='percent', method='Receitas ainda não disponíveis para o ano selecionado.', limitations=[year.get('error', 'Escolha um ano importado.')], provenance=provenance)
    with duckdb.connect(':memory:') as con:
        result = con.execute(query_sql('questions/q08_financiamento/sql/service_calculate_01.sql'), [str(path), f['ano']])
        keys = [c[0] for c in result.description]
        receipts = {(str(r[1]).lstrip('0'), r[2], r[3].upper()): dict(zip(keys, r)) for r in result.fetchall()}
    (base, params) = candidate_scope(f)
    candidates = read(base + query_sql('questions/q08_financiamento/sql/service_calculate_02.sql'), params)
    locations = {}
    groups = {}
    matched = positive = 0
    totals = {'publico': 0.0, 'privado': 0.0, 'nao_classificado': 0.0}
    for c in candidates:
        loc = locations.setdefault(c['municipio_id'], {'id': c['municipio_id'], 'nome': c['municipio'], 'uf': c['uf'], 'candidaturas': 0, 'vinculadas': 0, 'receita': 0.0, 'publico': 0.0, 'nao_classificado': 0.0}) if c.get('municipio_id') else None
        if loc is not None:
            loc['candidaturas'] += 1
        r = receipts.get((str(c['sequencial']).lstrip('0'), c['uf'], c['cargo'].upper()))
        if not r:
            continue
        matched += 1
        if loc is not None:
            loc['vinculadas'] += 1
            for (key, source) in [('receita', 'total'), ('publico', 'publico'), ('nao_classificado', 'nao_classificado')]:
                loc[key] += float(r[source])
        for k in totals:
            totals[k] += float(r[k])
        total = float(r['total'])
        if total <= 0:
            continue
        positive += 1
        share = float(r['publico']) / total
        group = 'Origem incompleta' if r['nao_classificado'] else 'Sem fundos públicos' if share == 0 else 'Até 25% público' if share <= 0.25 else '25% a 50% público' if share <= 0.5 else '50% a 75% público' if share <= 0.75 else 'Mais de 75% público'
        a = groups.setdefault(group, {'grupo': group, 'candidaturas': 0, 'definidos': 0, 'eleitos': 0, 'recebido': 0.0})
        a['candidaturas'] += 1
        a['recebido'] += total
        if c['situacao'] != 'INDEFINIDO':
            a['definidos'] += 1
            a['eleitos'] += int(c['situacao'] == 'ELEITO')
    if not matched:
        totals = {k: None for k in totals}
    order = ['Sem fundos públicos', 'Até 25% público', '25% a 50% público', '50% a 75% público', 'Mais de 75% público', 'Origem incompleta']
    rows = [groups[k] for k in order if k in groups]
    for row in rows:
        row['valor'] = percent(row['eleitos'], row['definidos'])
        (row['intervalo_inferior'], row['intervalo_superior']) = wilson(row['eleitos'], row['definidos'])
    for loc in locations.values():
        loc['valor'] = percent(loc['publico'], loc['receita']) if not loc['nao_classificado'] else None
    return dict(rows=rows, points=list(locations.values()), summary={'candidaturas': len(candidates), 'com_receita_final': matched, 'com_receita_positiva': positive, **totals}, unit='percent', status='parcial', method=provenance['method'], provenance=year, limitations=['Outros recursos é a origem não pública declarada no TSE; transferências não são rastreadas por uma cadeia de doadores nesta análise. Não afirmar origem última de repasses.', 'A análise usa apenas receitas financeiras finais. Não há conciliação independente com extratos bancários e eventuais devoluções; é uma resposta descritiva parcial, não auditoria contábil.', 'Vínculo por sequencial, ano, UF e cargo. Sem correspondência é ausência, não receita zero. Associação não isola tamanho do financiamento, experiência ou partido.'])


def municipalities(f,context):
    result=calculate(f,context)
    return {'rows':result.get('points',[]),'method':'Parcela pública nas receitas financeiras vinculadas. Ausência de vínculo e origem incompleta não são zero.','source':'live'}
