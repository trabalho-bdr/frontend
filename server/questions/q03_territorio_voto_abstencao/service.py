from fastapi import HTTPException
from core.config import DB
from catalog_facets import facet_sql,facet_key
from questions.shared.scope import candidate_scope,PROPORTIONAL,SCHOOLS
from questions.shared.statistics import percent,wilson,correlation
import json,math,statistics
from questions.shared.repository import municipal_data,party_votes

def calculate(f, context, metric, target):
    read = context.query
    DATA = context.data_path
    rows = municipal_data(f,read)
    if metric not in ('populacao', 'idhm', 'idade_mediana', 'indice_envelhecimento'):
        raise HTTPException(422, 'Indicador territorial inválido.')
    if target not in ('abstencao', 'participacao_partido'):
        raise HTTPException(422, 'Resultado territorial inválido.')
    for row in rows:
        row['x'] = row.get(metric)
        row['y'] = row.get(target)
    corr = correlation(rows, 'x', 'y')
    return dict(rows=rows, summary=corr, unit='scatter', x_label={'populacao': 'População residente · 2022', 'idhm': 'IDHM · referência 2010', 'idade_mediana': 'Idade mediana da população · 2022', 'indice_envelhecimento': 'Índice de envelhecimento · 2022'}[metric], y_label='Abstenção (%)' if target == 'abstencao' else 'Participação partidária nos votos (%)', method='Uma observação por município. Votos nominais + legenda do primeiro turno; participação da legenda no total do mesmo cargo. Pearson e Spearman sobre pares completos.', limitations=['Associação territorial, não preferência individual nem causalidade. Referência censitária fixa, sem afirmar que descreve a situação de todos os anos.', 'PIB não foi usado porque a unidade armazenada ainda precisa de validação. Abstenção é municipal/ano; a tabela não identifica cargo ou turno. Numerador/denominador conflitante não recebe taxa.', 'Sem partido escolhido, não se calcula participação partidária.'])
