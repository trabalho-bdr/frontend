from core.sql import query_sql
from fastapi import HTTPException
from core.config import DB
from catalog_facets import facet_sql,facet_key
from questions.shared.scope import candidate_scope,PROPORTIONAL,SCHOOLS
from questions.shared.statistics import percent,wilson,correlation
import json,math,statistics

def municipal_data(f, read):
    if f['cargo'] not in ('VEREADOR', 'PREFEITO'):
        raise HTTPException(422, 'Esta comparação municipal usa vereador ou prefeito; deputados pertencem à disputa estadual.')
    uf = f['uf']
    town = f['municipio']
    year = f['ano']
    school = facet_sql('escolaridade').replace('escolaridade', 'grau_instrucao')
    return read(query_sql('questions/shared/sql/repository_municipal_data_01.sql', fragment_0=school, fragment_1=school, fragment_2=DB, fragment_3=DB, fragment_4=DB, fragment_5=DB, fragment_6=DB, fragment_7=DB, fragment_8=DB, fragment_9=DB), [year, year, f['cargo'], f['partido'], year, f['cargo'], f['partido'], uf, uf, town, town])

def party_votes(f, read):
    if f['cargo'] not in PROPORTIONAL:
        raise HTTPException(422, 'A série de votos de legenda usa cargos proporcionais.')
    votes = read(query_sql('questions/shared/sql/repository_party_votes_01.sql', fragment_0=DB, fragment_1=DB, fragment_2=DB, fragment_3=DB), [f['cargo'], f['uf'], f['uf'], f['municipio'], f['municipio']])
    return votes

def candidate_municipalities(f, read):
    (base, params) = candidate_scope(f)
    rows = read(base + query_sql('questions/shared/sql/repository_candidate_municipalities_01.sql'), params)
    for row in rows:
        row['gasto_por_eleito'] = row['despesas'] / row['eleitos'] if row['eleitos'] and row['despesas'] is not None else None
        row['taxa_eleicao'] = percent(row['eleitos_com_patrimonio'], row['definidos_com_patrimonio'])
    return {'rows': rows, 'source': 'live', 'method': 'Agregação municipal no mesmo ano, cargo e sigla. Gastos e patrimônio conhecidos; ausência não equivale a zero. Taxa entre resultados definidos com patrimônio conhecido.'}
