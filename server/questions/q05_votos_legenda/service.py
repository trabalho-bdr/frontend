from core.sql import query_sql
from fastapi import HTTPException
from core.config import DB
from catalog_facets import facet_sql,facet_key
from questions.shared.scope import candidate_scope,PROPORTIONAL,SCHOOLS
from questions.shared.statistics import percent,wilson,correlation
import json,math,statistics
from questions.shared.repository import municipal_data,party_votes

def calculate(f, context, historico=False):
    read = context.query
    DATA = context.data_path
    votes = party_votes(f, read)
    agg = {}
    from party_events import canonical_party
    for r in votes:
        matches = canonical_party(r['partido'], r['ano']) == canonical_party(f['partido'], f['ano']) if historico else r['partido'] == f['partido']
        if f['partido'] and (not matches):
            continue
        label = canonical_party(r['partido'], r['ano']) if historico else r['partido']
        label = label if f['partido'] else 'Todos os partidos'
        k = (r['ano'], label)
        a = agg.setdefault(k, {'ano': r['ano'], 'partido': label, 'nominais': 0, 'legenda': 0, 'registros': 0, 'incompletos': 0})
        a['registros'] += 1
        observed = a.setdefault('siglas_observadas', [])
        if r['partido'] not in observed:
            observed.append(r['partido'])
        if r['nominais'] is None or r['legenda'] is None:
            a['incompletos'] += 1
            continue
        a['nominais'] += r['nominais']
        a['legenda'] += r['legenda']
    rows = []
    for a in agg.values():
        a['siglas_observadas'] = ', '.join((str(v) for v in a.get('siglas_observadas', [])))
        a['grupo'] = str(a['ano']) + ' · ' + (a['partido'] or 'Sem sigla')
        a['total'] = a['nominais'] + a['legenda']
        a['valor'] = percent(a['legenda'], a['total']) if not a['incompletos'] else None
        rows.append(a)
    return dict(rows=rows, summary={'anos': len({r['ano'] for r in rows}), 'registros': len(votes)}, unit='percent', method='Votos de legenda ÷ (nominais + legenda), contagens agregadas antes da divisão; mesmo cargo e primeiro turno. Siglas originais ou renomeações harmonizadas conforme a opção; fusões permanecem separadas.', limitations=['Ausência de dado não é zero. Uma série com células incompletas não recebe percentual.', 'Mudanças de nome, fusões e incorporações precisam ser lidas no histórico da legenda; séries não são coladas automaticamente.'])

def municipalities(f, context):
    read = context.query
    (ano, cargo, uf, partido, municipio) = [f[key] for key in ('ano', 'cargo', 'uf', 'partido', 'municipio')]
    if cargo != 'VEREADOR':
        raise HTTPException(422, 'Voto de legenda municipal disponível para vereador.')
    rows = read(query_sql('questions/q05_votos_legenda/sql/service_municipalities_01.sql', fragment_0=DB, fragment_1=DB, fragment_2=DB, fragment_3=DB), [partido, partido, partido, partido, ano, cargo, uf, uf, municipio, municipio])
    for row in rows:
        row['valor'] = percent(row['legenda'], row['total_selecionado']) if not row['incompletos'] else None
    return {'rows': rows, 'source': 'live', 'method': 'Votos de legenda da sigla selecionada ÷ votos nominais + legenda da mesma sigla e disputa. Sem sigla, agregado de todos os partidos. Siglas originais, sem harmonização nesta visão territorial.'}
