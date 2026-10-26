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
    (base, params) = candidate_scope(f)
    coverage = read(base + query_sql('questions/q02_patrimonio_sucesso/sql/service_calculate_02.sql'), params)[0]
    rows = read(base + query_sql('questions/q02_patrimonio_sucesso/sql/service_calculate_01.sql'), params)
    for row in rows:
        row['grupo'] = 'Zero declarado' if row['faixa'] == 0 else f"Faixa {row['faixa']} de patrimônio positivo"
        row['valor'] = percent(row['eleitos'], row['candidaturas'])
        (row['intervalo_inferior'], row['intervalo_superior']) = wilson(row['eleitos'], row['candidaturas'])
        row['amostra_pequena'] = row['candidaturas'] < 30
    return dict(rows=rows, summary=coverage, unit='percent', method='Taxa = eleitos ÷ candidaturas com resultado definido e patrimônio conhecido. Zero separado; cortes por quartis do patrimônio positivo, com valores empatados na mesma faixa.', limitations=['Associação descritiva, sem estimar efeito causal ou controlar experiência e partido. Faixas podem ter tamanhos diferentes devido a empates.', 'Intervalos de Wilson de 95% são uma medida descritiva da precisão do grupo, não corrigem seleção nem confundimento.'])


def municipalities(f,context):
    from questions.shared.repository import candidate_municipalities
    result=candidate_municipalities(f,context.query)
    for row in result['rows']:
        row['valor']=row['patrimonio_mediano']
    return result
