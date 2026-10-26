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
    from party_events import RENAMES, EVENTS, transition_kind
    cohort = {**f, 'ano': None}
    (base, params) = candidate_scope(cohort)
    mapping = "CASE WHEN partido='PL' AND ano<2006 THEN 'PL-HISTORICO' WHEN partido='PR' THEN 'PL' WHEN partido='PSD' AND ano<2011 THEN 'PSD-HISTORICO' " + ' '.join(("WHEN partido='" + old + "' THEN '" + new + "'" for (old, new) in RENAMES.items())) + ' ELSE partido END'
    labels = set(EVENTS) | {v[0] for v in EVENTS.values()}
    events = []
    for old in labels:
        for new in labels:
            for year in (2003, 2006, 2007, 2019, 2022, 2023):
                if transition_kind(old, new, year) == 'Fusão/incorporação':
                    events.append("(anterior_partido='" + old + "' AND organizacao='" + new + "' AND ano>=" + str(year) + ')')
                    break
    event = ' OR '.join(events) or 'FALSE'
    rows = read(base + query_sql('questions/q10_trajetorias/sql/service_calculate_01.sql', fragment_0=DB, fragment_1=mapping, fragment_2=event), params)
    total = sum((r['pessoas'] for r in rows))
    for row in rows:
        row['valor'] = percent(row['pessoas'], total)
    return dict(rows=rows, summary={'pessoas': total, 'mais_de_um_cargo': sum((r['mais_de_um_cargo'] for r in rows)), 'mudanca_organizacional': sum((r['mudanca_organizacional'] for r in rows))}, unit='percent', method='Coorte: pessoas que passaram pelo cargo, partido e território selecionados em qualquer ano. Histórico: todos os cargos e territórios dessas pessoas nas seis UFs entre 2002 e 2024. Uma pessoa por identidade consistente; categorias de frequência mutuamente exclusivas.', limitations=['Primeiro/último registro do acervo não provam estreia ou encerramento de carreira. Candidaturas não são mandatos exercidos.', 'Intervalo é ausência de candidatura observada por mais de quatro anos, uma definição operacional; não comprova interrupção da atividade política.', 'Mais de um cargo e mudança organizacional são indicadores adicionais que podem se sobrepor. Renomeações e eventos conhecidos de fusão/incorporação não contam como mudança entre organizações.', 'Para ordenar as transições, usa-se um registro estável por pessoa/ano; todas as combinações de cargo continuam nas fichas individuais.'])
