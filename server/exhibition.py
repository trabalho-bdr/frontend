"""Read-only evidence for the exhibition. No official seat simulation."""
from core.sql import query_sql
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone

router = APIRouter(prefix='/api/exposicao', tags=['exposicao'])
UFS = ('CE', 'MA', 'MS', 'RJ', 'RN', 'RS')

def read(sql, params=()):
    from core.dependencies import execute as _rows
    from core.config import DB
    try:
        return _rows(sql.replace('{db}', DB), params)
    except Exception:
        raise HTTPException(503, 'Não foi possível atualizar esta descoberta.')

def response(rows, scope, method):
    from core.config import DB
    return {'rows':rows,'scope':scope,'source':'live','database':'pipeline_bdr_der_completo_v4',
            'extracted_at':datetime.now(timezone.utc).isoformat(),'method':method}

PARTIES = query_sql('compatibility/sql/exhibition/exhibition_definitions_01.sql')

TERRITORY = query_sql('compatibility/sql/exhibition/exhibition_definitions_02.sql')

TRANSITIONS = query_sql('compatibility/sql/exhibition/exhibition_definitions_03.sql')

CONTINUITY = query_sql('compatibility/sql/exhibition/exhibition_definitions_04.sql')

SPENDING = query_sql('compatibility/sql/exhibition/exhibition_definitions_05.sql')

def state(uf):
    if uf and uf not in UFS: raise HTTPException(422,'Estado fora da cobertura')
    return uf

def election(ano,cargo):
    valid={'VEREADOR':(2020,2024),'DEPUTADO FEDERAL':(2018,2022),'DEPUTADO ESTADUAL':(2018,2022)}
    if cargo not in valid or ano not in valid[cargo]:raise HTTPException(422,'Ano e cargo incompatíveis')

def scoped(sql,params,partido,municipio,cargo):
    """Apply entity filters to one candidate/vote CTE before aggregation."""
    if municipio and cargo!='VEREADOR':
        raise HTTPException(422,'Município não delimita cadeiras de deputados.')
    alias='v' if 'Votos_Partido_Municipio' in sql else 'c'
    marker="AND (?='' OR m.uf=?)" if alias=='v' else "AND (?='' OR c.uf=?)"
    clause=f" AND (?='' OR {alias}.id_municipio=?) AND (?='' OR {alias}.id_partido IN (SELECT id_partido FROM {{db}}.main.Partido WHERE UPPER(sigla)=UPPER(?)))"
    return read(sql.replace(marker,marker+clause),[*params,municipio,municipio,partido,partido])

@router.get('/partidos')
def parties(ano:int=2024,cargo:str='VEREADOR',uf:str='',partido:str='',municipio:str=''):
    election(ano,cargo);state(uf)
    if municipio and cargo!='VEREADOR':raise HTTPException(422,'Cadeiras de deputados pertencem à UF.')
    sql=PARTIES
    for alias,territory in [('v','m'),('c','c')]:
        marker=f"AND (?='' OR {territory}.uf=?)"
        sql=sql.replace(marker,marker+f" AND (?='' OR {alias}.id_municipio=?) AND (?='' OR {alias}.id_partido IN (SELECT id_partido FROM {{db}}.main.Partido WHERE UPPER(sigla)=UPPER(?)))",1)
    params=[ano,cargo,uf,uf,municipio,municipio,partido,partido]*2
    return response(read(sql,params),{'ano':ano,'cargo':cargo,'uf':uf,'partido':partido,'municipio':municipio},'Primeiro turno; votos nominais + legenda; taxa entre resultados definidos; não é simulação de cadeiras.')

@router.get('/territorio')
def territory(ano:int=2024,uf:str=''):
    if ano not in (2022,2024):raise HTTPException(422,'Ano sem participação disponível')
    state(uf)
    return response(read(TERRITORY,[ano,uf,uf]),{'ano':ano,'uf':uf},'Indicadores censitários 2022; IDHM 2010; associação municipal, não individual.')

@router.get('/transicoes')
def transitions(uf:str='',cargo:str='VEREADOR'):
    state(uf)
    years=(2020,2024) if cargo=='VEREADOR' else (2018,2022)
    election(years[0],cargo)
    sql=TRANSITIONS.replace('e.ano IN (2020,2024)','e.ano IN (?,?)').replace("UPPER(e.cargo)='VEREADOR'",'UPPER(e.cargo)=?').replace('a.ano=2020 AND b.ano=2024','a.ano=? AND b.ano=?')
    return response(read(sql,[*years,cargo,*years,uf,uf]),{'anos':list(years),'cargo':cargo,'uf':uf},'Siglas originais; líderes empatados excluídos; votos nominais + legenda; sem interpretação ideológica.')

@router.get('/continuidade')
def continuity(uf:str=''):
    state(uf)
    return response(read(CONTINUITY,[uf,uf]),{'anos':[2020,2024],'cargo_origem':'VEREADOR','uf':uf},'Coorte de pessoas candidatas a vereador em 2020; candidatura observada em 2024 em qualquer cargo nas seis UFs. Não reaparecer não significa abandonar a política.')

@router.get('/gastos')
def spending(ano:int=2024,cargo:str='VEREADOR',uf:str='',partido:str='',municipio:str=''):
    election(ano,cargo);state(uf)
    result=response(scoped(SPENDING,[ano,cargo,uf,uf],partido,municipio,cargo),{'ano':ano,'cargo':cargo,'uf':uf,'partido':partido,'municipio':municipio},'Quartis de despesas não negativas com resultado definido, primeiro turno; reais nominais; sem inferência causal.')
    sql=SPENDING[:SPENDING.index(query_sql('compatibility/sql/exhibition/exhibition_spending_02.sql').strip())]+query_sql('compatibility/sql/exhibition/exhibition_spending_01.sql')
    result['summary']=scoped(sql,[ano,cargo,uf,uf],partido,municipio,cargo)[0]
    return result

@router.get('/trajetoria/{candidate_id}')
def trajectory(candidate_id:str):
    if len(candidate_id)>100:raise HTTPException(422,'Identificador inválido')
    rows=read(query_sql('compatibility/sql/exhibition/exhibition_trajectory_01.sql'),[candidate_id])
    return response(rows,{'id_candidatura':candidate_id},'Último turno por pessoa, ano, cargo e território; não informa mandato exercido ou motivo de saída.')

@router.get('/escolaridade')
def schooling(ano:int=2024,cargo:str='VEREADOR',uf:str='',partido:str='',municipio:str=''):
    election(ano,cargo);state(uf)
    sql=query_sql('compatibility/sql/exhibition/exhibition_schooling_01.sql')
    return response(scoped(sql,[ano,cargo,uf,uf],partido,municipio,cargo),{'ano':ano,'cargo':cargo,'uf':uf,'partido':partido,'municipio':municipio},'Escolaridade declarada; primeiro turno; taxa entre resultados definidos.')

@router.get('/patrimonio')
def wealth(ano:int=2024,cargo:str='VEREADOR',uf:str='',partido:str='',municipio:str=''):
    election(ano,cargo);state(uf)
    sql=query_sql('compatibility/sql/exhibition/exhibition_wealth_01.sql')
    result=response(scoped(sql,[ano,cargo,uf,uf],partido,municipio,cargo),{'ano':ano,'cargo':cargo,'uf':uf,'partido':partido,'municipio':municipio},'Quartis de patrimônio não negativo, primeiro turno, resultado definido; associação, não causalidade.')
    coverage=sql[:sql.index(', q AS')]+query_sql('compatibility/sql/exhibition/exhibition_wealth_02.sql')
    result['coverage']=scoped(coverage,[ano,cargo,uf,uf],partido,municipio,cargo)[0]
    return result

@router.get('/proporcional')
def proportional(ano:int=2024,cargo:str='VEREADOR',uf:str='',municipio:str=''):
    election(ano,cargo);state(uf)
    sql=query_sql('compatibility/sql/exhibition/exhibition_proportional_01.sql')
    return response(read(sql,[ano,cargo,uf,uf,municipio,municipio]),{'ano':ano,'cargo':cargo,'uf':uf,'municipio':municipio},'Par selecionado pela maior diferença de votos entre um não eleito/suplente e um eleito da mesma disputa. Caso extremo, não representativo; não reconstrói vagas.')

