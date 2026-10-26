"""Read-only rankings. Aggregate expenses before joining one result per candidacy."""
from core.sql import query_sql
import re
import json
from fastapi import HTTPException

UFS={'CE','MA','MS','RJ','RN','RS'}
OFFICES={'VEREADOR','PREFEITO','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','SENADOR','GOVERNADOR'}
TYPES={'adesivos':'Adesivos','santinhos':'Santinhos','bandeiras':'Bandeiras','todos':''}
DB = 'pipeline_bdr_der_completo_v4'
# Anchored product nouns, optional purchase/production prefix. No substring
# matching: removal, installation, staff, generic printing and mixed types stay out.
TEXT="UPPER(TRIM(strip_accents(COALESCE(d.categoria,''))))"
PREFIX=r'^(?:(?:AQUISICAO|COMPRA|CONFECCAO|IMPRESSAO|FORNECIMENTO|PRODUCAO)(?: DE)?\s+)?'
PATTERNS={
 'Adesivos':PREFIX+r'ADESIV(?:O|OS|A|AS)(?:[^A-Z]|$)',
 'Santinhos':PREFIX+r'SANTINH(?:O|OS|A|AS)(?:[^A-Z]|$)',
 'Bandeiras':PREFIX+r'BANDEIRAS?(?:[^A-Z]|$)',
}
EXCLUDED=r'(^|[^A-Z])(INSTALACAO|RETIRADA|REMOCAO|DISTRIBUICAO|COLAGEM|ADESIVAGEM|LOCACAO|MAO DE OBRA|BANNERS?|PANFLETOS?|FOLHETOS?|CARTAZ(ES)?|FAIXAS?|OUTDOORS?|CAMISETAS?|BRINDES?|BANDEIROLAS?|CRACHAS?|COLINHAS?)([^A-Z]|$)'
# Count distinct kinds, not repeated occurrences of the same noun.
KINDS=[r'(^|[^A-Z])ADESIV[OA]S?([^A-Z]|$)',r'(^|[^A-Z])SANTINH[OA]S?([^A-Z]|$)',r'(^|[^A-Z])BANDEIRAS?([^A-Z]|$)']
MATERIAL_CASE=f"CASE WHEN regexp_matches({TEXT},'{EXCLUDED}') THEN NULL WHEN "+ ' + '.join(f"CAST(regexp_matches({TEXT},'{p}') AS INTEGER)" for p in KINDS)+">1 THEN NULL "
MATERIAL_CASE+=' '.join(f"WHEN regexp_matches({TEXT},'{pattern}') THEN '{kind}'" for kind,pattern in PATTERNS.items())+' ELSE NULL END'
METHOD='Classificação conservadora por nome explícito do produto no início da descrição, opcionalmente precedido de aquisição, compra, confecção, impressão, fornecimento ou produção (de). Descrições mistas, instalação, retirada, pessoal, serviços genéricos e menções a outros produtos (banner, panfleto, folheto, cartaz, faixa, outdoor, camiseta, brinde, bandeirola, crachá e colinha) não são rateadas nem incluídas. Valores ausentes não são zero.'
TURN_METHOD='Candidaturas de eleições ordinárias do 1º turno; votos e resultado do 1º turno. Lançamentos vinculados às candidaturas selecionadas, sem inferir a data ou o turno de cada gasto. Despesas agregadas antes da junção com resultados. Registros de candidaturas do 2º turno não são acrescentados. Resultados duplicados idênticos são consolidados; valores conflitantes ficam indisponíveis. O município é o da candidatura, não comprova o local de compra ou circulação dos materiais.'


def validate(ano,uf,partido,cargo,abrangencia,municipio,material):
    uf=(uf or '').strip().upper();partido=partido.strip();cargo=cargo.strip().upper()
    abrangencia=abrangencia or ('municipio' if municipio else 'estado' if uf else 'seis_estados')
    if ano not in range(2002,2025,2):raise HTTPException(400,'Selecione um ano eleitoral de 2002 a 2024')
    if cargo not in OFFICES:raise HTTPException(400,'Cargo fora da cobertura')
    if uf and uf not in UFS:raise HTTPException(400,'UF fora das seis disponíveis')
    if len(partido)>35:raise HTTPException(400,'Sigla inválida')
    if material not in TYPES:raise HTTPException(400,'Material não reconhecido')
    if abrangencia not in {'seis_estados','estado','municipio'}:raise HTTPException(400,'Abrangência inválida')
    if abrangencia=='seis_estados' and (uf or municipio):raise HTTPException(400,'O recorte dos seis estados não recebe UF ou município')
    if abrangencia in {'estado','municipio'} and not uf:raise HTTPException(400,'Selecione o estado')
    if abrangencia!='municipio' and municipio:raise HTTPException(400,'Município exige abrangência municipal')
    if abrangencia=='municipio':
        if not re.fullmatch(r'\d{7}',municipio):raise HTTPException(400,'Selecione o código municipal de sete dígitos')
        if cargo not in {'VEREADOR','PREFEITO'} or ano%4:raise HTTPException(400,'Recorte municipal requer eleição municipal de prefeito ou vereador')
    return dict(ano=ano,uf=uf,partido=partido,cargo=cargo,abrangencia=abrangencia,municipio=municipio,material=material)


def read(sql,args=()):
    from core.dependencies import execute as _rows
    return _rows(sql,args)


def scope_cte(scope):
    # A municipal ID is accepted only inside its actual UF. Never attribute a
    # state or federal campaign's budget to its registry municipality.
    if scope['municipio']:
        town=read(query_sql('questions/q09_publicidade/sql/materials/adesivaria_scope_cte_02.sql', fragment_0=DB),[scope['municipio'],scope['uf']])
        if not town:raise HTTPException(400,'Município não pertence à UF selecionada')
        scope={**scope,'municipio_nome':town[0]['nome']}
    args=[scope['ano'],scope['cargo'],scope['uf'],scope['uf'],scope['partido'],scope['partido'],scope['municipio'],scope['municipio'],TYPES[scope['material']],TYPES[scope['material']]]
    cte=query_sql('questions/q09_publicidade/sql/materials/adesivaria_scope_cte_01.sql', fragment_0=DB, fragment_1=DB, fragment_2=DB, fragment_3=DB, fragment_4=MATERIAL_CASE, fragment_5=DB, fragment_6=DB)
    return cte,args,scope


def summary(ano=2024,uf='',partido='',cargo='VEREADOR',abrangencia='',municipio='',material='todos',limit=12,offset=0,offset_votos=0,offset_categorias=0):
    if not 1<=limit<=24 or min(offset,offset_votos,offset_categorias)<0 or max(offset,offset_votos,offset_categorias)>1000000:raise HTTPException(400,'Página inválida')
    scope=validate(ano,uf,partido,cargo,abrangencia,municipio,material)
    cte,args,scope=scope_cte(scope)
    stats_sql=query_sql('questions/q09_publicidade/sql/materials/adesivaria_summary_01.sql')
    groups_sql=query_sql('questions/q09_publicidade/sql/materials/adesivaria_summary_02.sql')
    rankings_sql=query_sql('questions/q09_publicidade/sql/materials/adesivaria_summary_03.sql')
    parties_sql=query_sql('questions/q09_publicidade/sql/materials/adesivaria_summary_04.sql')
    categories_sql=query_sql('questions/q09_publicidade/sql/materials/adesivaria_summary_05.sql')
    cloud_sql=query_sql('questions/q09_publicidade/sql/materials/adesivaria_summary_06.sql')
    sections={'stats':stats_sql,'groups':groups_sql,'rankings':rankings_sql,'parties':parties_sql,'categories':categories_sql,'cloud':cloud_sql}
    packed=' UNION ALL '.join(query_sql('questions/q09_publicidade/sql/materials/adesivaria_summary_07.sql', fragment_0=key, fragment_1=sql) for key,sql in sections.items())
    records=read(cte+packed,[*args,limit,offset,limit,offset_votos,offset_categorias])
    values={key:[] for key in sections}
    for row in records:
        values[row['section']].append(json.loads(row['payload']))
    stats=values['stats'][0];groups=values['groups'];rankings=values['rankings'];parties=values['parties'];categories=values['categories']
    groups.sort(key=lambda row:(row['valor'] is None,-(row['valor'] or 0),row['tipo']))
    parties.sort(key=lambda row:(row['valor'] is None,-(row['valor'] or 0),row['partido']))
    categories.sort(key=lambda row:(row['valor'] is None,-(row['valor'] or 0),row['categoria'],row['tipo']))
    from q9_normalizacao.gerar_normalizacao import classify
    cloud_by_key={}
    for raw in values['cloud']:
        normalized=classify(raw['categoria'])
        label=normalized['categoria_padronizada']
        key=(raw['tipo'],label)
        item=cloud_by_key.setdefault(key,{'tipo':raw['tipo'],'categoria_normalizada':label,
            'valor':0.0,'registros':0,'origens':[],'requer_revisao':False})
        item['valor']+=float(raw['valor'])
        item['registros']+=raw['registros']
        item['requer_revisao']|=normalized['requer_revisao']
        item['origens'].append({'categoria_original':raw['categoria'],'valor':raw['valor'],
            'registros':raw['registros'],'status_classificacao':normalized['status_classificacao']})
    cloud=sorted(cloud_by_key.values(),key=lambda item:(-item['valor'],item['categoria_normalizada'],item['tipo']))
    for item in cloud:item['valor']=round(item['valor'],2)
    for row in categories:
        normalized=classify(row['categoria'])
        row['categoria_normalizada']=normalized['categoria_padronizada']
        row['status_classificacao']=normalized['status_classificacao']
        row['requer_revisao']=normalized['requer_revisao']
    return {'scope':scope,'stats':stats,'groups':groups,'candidates':sorted([r for r in rankings if r['ranking']=='despesas'],key=lambda r:r['posicao_gastos']),
      'votes':sorted([r for r in rankings if r['ranking']=='votos'],key=lambda r:r['posicao_votos']),'podium':sorted([r for r in rankings if r['ranking']=='podio'],key=lambda r:r['posicao_gastos']),
      'parties':parties,'categories':categories,'cloud':cloud,
      'cloud_scope':{'origens_incluidas':len(values['cloud']),'origens_total':stats.get('categorias'),
          'criterio':'Até 100 descrições originais com maior saldo positivo. Valores da nuvem não equivalem ao total das três barras.'},
      'limit':limit,'offset':offset,'offset_votos':offset_votos,
      'offset_categorias':offset_categorias,'methodology':METHOD,'turn_methodology':TURN_METHOD,
      'coverage':'Seis estados: CE, MA, MS, RJ, RN e RS. Não representa o Brasil inteiro.',
      'source':'consulta','document_type':'SINTESSE_DE_LANCAMENTOS'}


def candidate(candidate_id,ano=2024,uf='',partido='',cargo='VEREADOR',abrangencia='',municipio='',material='todos',limit=10,offset=0):
    if not re.fullmatch(r'[0-9a-f]{32}',candidate_id):raise HTTPException(400,'Identificador inválido')
    if not 1<=limit<=50 or not 0<=offset<=1000000:raise HTTPException(400,'Página inválida')
    cte,args,scope=scope_cte(validate(ano,uf,partido,cargo,abrangencia,municipio,material))
    person=read(cte+query_sql('questions/q09_publicidade/sql/materials/adesivaria_candidate_01.sql'),[*args,candidate_id])
    if not person:raise HTTPException(404,'Candidatura fora do recorte')
    groups=read(cte+query_sql('questions/q09_publicidade/sql/materials/adesivaria_candidate_02.sql'),[*args,candidate_id])
    entries=read(cte+query_sql('questions/q09_publicidade/sql/materials/adesivaria_candidate_03.sql'),[*args,candidate_id,limit,offset])
    return {'candidate':person[0],'groups':groups,'entries':entries,'scope':scope,'limit':limit,'offset':offset,
      'total':person[0]['lancamentos'],'source':'consulta','methodology':METHOD,'turn_methodology':TURN_METHOD}
