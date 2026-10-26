"""Read-only evidence for the exhibition. No official seat simulation."""
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone

router = APIRouter(prefix='/api/exposicao', tags=['exposicao'])
UFS = ('CE', 'MA', 'MS', 'RJ', 'RN', 'RS')

def read(sql, params=()):
    from app import _rows, DB
    try:
        return _rows(sql.replace('{db}', DB), params)
    except Exception:
        raise HTTPException(503, 'Não foi possível atualizar esta descoberta.')

def response(rows, scope, method):
    from app import DB
    return {'rows':rows,'scope':scope,'source':'live','database':'pipeline_bdr_der_completo_v4',
            'extracted_at':datetime.now(timezone.utc).isoformat(),'method':method}

PARTIES = '''WITH votes AS (
 SELECT v.id_partido,SUM(v.votos_nominais) nominais,SUM(v.votos_legenda) legenda
 FROM {db}.main.Votos_Partido_Municipio v
 JOIN {db}.main.Eleicao e USING(id_eleicao)
 JOIN {db}.main.Municipio m USING(id_municipio)
 WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND v.turno=1
 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND (?='' OR m.uf=?) GROUP BY 1
), candidates AS (
 SELECT c.id_candidatura,c.id_partido,r.resultado
 FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
 LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
 WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1
 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND (?='' OR c.uf=?)
 QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado)=1
), seats AS (
 SELECT id_partido,COUNT(*) candidaturas,
 COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%') eleitos,
 COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%' OR UPPER(resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE')) definidos
 FROM candidates GROUP BY 1
) SELECT p.sigla partido,v.nominais,v.legenda,v.nominais+v.legenda votos,
 s.candidaturas,s.eleitos,s.definidos,100.0*s.eleitos/NULLIF(s.definidos,0) taxa
 FROM votes v JOIN {db}.main.Partido p USING(id_partido) LEFT JOIN seats s USING(id_partido)
 ORDER BY votos DESC'''

TERRITORY = '''SELECT m.id_municipio id,m.nome,m.uf,c.populacao,c.idhm,
 c.pib/NULLIF(c.populacao,0) pib_per_capita,p.eleitorado_apto eleitorado,
 p.abstencoes,100.0*p.taxa_abstencao abstencao
 FROM {db}.main.Municipio m
 JOIN {db}.main.Participacao_Eleitoral p USING(id_municipio)
 LEFT JOIN {db}.main.Censo_Municipio c ON c.id_municipio=m.id_municipio AND c.ano_referencia=2022
 WHERE p.ano_participacao=? AND (?='' OR m.uf=?)
 ORDER BY m.uf,m.nome'''

TRANSITIONS = '''WITH votes AS (
 SELECT e.ano,v.id_municipio,v.id_partido,SUM(v.votos_nominais+v.votos_legenda) total
 FROM {db}.main.Votos_Partido_Municipio v JOIN {db}.main.Eleicao e USING(id_eleicao)
 WHERE e.ano IN (2020,2024) AND UPPER(e.cargo)='VEREADOR' AND e.turno=1 AND v.turno=1
 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' GROUP BY 1,2,3
), ranked AS (SELECT *,DENSE_RANK() OVER(PARTITION BY ano,id_municipio ORDER BY total DESC) pos FROM votes WHERE total>0),
 leaders AS (SELECT *,COUNT(*) OVER(PARTITION BY ano,id_municipio) leader_count FROM ranked WHERE pos=1)
 SELECT m.id_municipio id,m.nome,m.uf,p.sigla origem,q.sigla destino
 FROM leaders a JOIN leaders b ON a.id_municipio=b.id_municipio AND a.ano=2020 AND b.ano=2024
 JOIN {db}.main.Municipio m ON m.id_municipio=a.id_municipio
 JOIN {db}.main.Partido p ON p.id_partido=a.id_partido JOIN {db}.main.Partido q ON q.id_partido=b.id_partido
 WHERE a.leader_count=1 AND b.leader_count=1 AND (?='' OR m.uf=?) ORDER BY m.uf,m.nome'''

CONTINUITY = '''WITH base AS (
 SELECT c.id_candidato,c.id_partido,e.cargo,
 date_diff('year',p.dt_nascimento,e.data)-CASE WHEN strftime(e.data,'%m-%d')<strftime(p.dt_nascimento,'%m-%d') THEN 1 ELSE 0 END idade,
 CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 'Eleitos' WHEN UPPER(r.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 'Não eleitos / suplentes' ELSE 'Indefinidos' END situacao
 FROM {db}.main.Candidatura c JOIN {db}.main.Candidato p USING(id_candidato)
 JOIN {db}.main.Eleicao e USING(id_eleicao)
 LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
 WHERE e.ano=2020 AND UPPER(e.cargo)='VEREADOR' AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
 AND (?='' OR c.uf=?)
 QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidato ORDER BY c.id_candidatura,r.id_resultado)=1
), future AS (
 SELECT DISTINCT c.id_candidato,c.id_partido,e.cargo FROM {db}.main.Candidatura c
 JOIN {db}.main.Eleicao e USING(id_eleicao)
 WHERE e.ano=2024 AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
), linked AS (
 SELECT b.*,EXISTS(SELECT 1 FROM future f WHERE f.id_candidato=b.id_candidato) voltou,
 EXISTS(SELECT 1 FROM future f WHERE f.id_candidato=b.id_candidato AND f.id_partido<>b.id_partido) trocou_partido,
 EXISTS(SELECT 1 FROM future f WHERE f.id_candidato=b.id_candidato AND UPPER(f.cargo)<>UPPER(b.cargo)) trocou_cargo
 FROM base b
) SELECT CASE WHEN idade BETWEEN 18 AND 29 THEN '18–29 anos' WHEN idade>=30 THEN '30 anos ou mais' ELSE 'Idade não informada' END faixa,
 situacao,COUNT(*) pessoas,COUNT(*) FILTER(WHERE voltou) retornos,
 COUNT(*) FILTER(WHERE trocou_partido) mudancas_partido,COUNT(*) FILTER(WHERE trocou_cargo) mudancas_cargo,
 100.0*COUNT(*) FILTER(WHERE voltou)/NULLIF(COUNT(*),0) taxa
 FROM linked GROUP BY 1,2 ORDER BY 1,2'''

SPENDING = '''WITH base AS (
 SELECT c.id_candidatura,c.gastos_campanha_total gastos,r.votos,
 CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 WHEN UPPER(r.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 0 END eleito
 FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
 LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
 WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
 AND (?='' OR c.uf=?)
 QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado)=1
), valid AS (SELECT *,NTILE(4) OVER(ORDER BY gastos,id_candidatura) faixa FROM base WHERE gastos>=0 AND eleito IS NOT NULL)
 SELECT faixa,COUNT(*) candidaturas,SUM(eleito) eleitos,100.0*AVG(eleito) taxa,
 MIN(gastos) minimo,MAX(gastos) maximo,MEDIAN(gastos) mediana
 FROM valid GROUP BY 1 ORDER BY 1'''

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
    sql=SPENDING[:SPENDING.index(' SELECT faixa,COUNT')]+''' SELECT MEDIAN(gastos) FILTER(WHERE eleito=1) mediana_eleitos,
      MEDIAN(gastos) FILTER(WHERE eleito=0) mediana_nao_eleitos,
      COUNT(*) FILTER(WHERE eleito=1) eleitos,COUNT(*) FILTER(WHERE eleito=0) nao_eleitos FROM valid'''
    result['summary']=scoped(sql,[ano,cargo,uf,uf],partido,municipio,cargo)[0]
    return result

@router.get('/trajetoria/{candidate_id}')
def trajectory(candidate_id:str):
    if len(candidate_id)>100:raise HTTPException(422,'Identificador inválido')
    rows=read('''SELECT c.id_candidatura id,e.ano,UPPER(e.cargo) cargo,p.sigla partido,c.uf,m.nome municipio,
      r.votos,r.resultado,c.gastos_campanha_total gastos,c.patrimonio,c.escolaridade_candidatura escolaridade,
      date_diff('year',person.dt_nascimento,e.data)-CASE WHEN strftime(e.data,'%m-%d')<strftime(person.dt_nascimento,'%m-%d') THEN 1 ELSE 0 END idade
      FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
      LEFT JOIN {db}.main.Candidato person USING(id_candidato)
      LEFT JOIN {db}.main.Partido p USING(id_partido) LEFT JOIN {db}.main.Municipio m USING(id_municipio)
      LEFT JOIN {db}.main.Resultado_Candidatura r USING(id_candidatura)
      WHERE c.id_candidato=(SELECT id_candidato FROM {db}.main.Candidatura WHERE id_candidatura=? LIMIT 1)
      AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND e.ano BETWEEN 2002 AND 2024
      QUALIFY ROW_NUMBER() OVER(PARTITION BY e.ano,e.cargo,c.uf,c.id_municipio ORDER BY e.turno DESC,r.turno DESC,c.id_candidatura)=1
      ORDER BY e.ano,e.cargo''',[candidate_id])
    return response(rows,{'id_candidatura':candidate_id},'Último turno por pessoa, ano, cargo e território; não informa mandato exercido ou motivo de saída.')

@router.get('/escolaridade')
def schooling(ano:int=2024,cargo:str='VEREADOR',uf:str='',partido:str='',municipio:str=''):
    election(ano,cargo);state(uf)
    sql='''WITH b AS (
      SELECT c.id_candidatura,COALESCE(NULLIF(TRIM(c.escolaridade_candidatura),''),'NÃO INFORMADA') escolaridade,r.resultado
      FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
      LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
      WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND (?='' OR c.uf=?)
      QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado)=1
    ) SELECT escolaridade,COUNT(*) candidaturas,COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%') eleitos,
      COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%' OR UPPER(resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE')) definidos
      FROM b GROUP BY 1 ORDER BY candidaturas DESC'''
    return response(scoped(sql,[ano,cargo,uf,uf],partido,municipio,cargo),{'ano':ano,'cargo':cargo,'uf':uf,'partido':partido,'municipio':municipio},'Escolaridade declarada; primeiro turno; taxa entre resultados definidos.')

@router.get('/patrimonio')
def wealth(ano:int=2024,cargo:str='VEREADOR',uf:str='',partido:str='',municipio:str=''):
    election(ano,cargo);state(uf)
    sql='''WITH b AS (
      SELECT c.id_candidatura,c.patrimonio,
      CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 WHEN UPPER(r.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 0 END eleito
      FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
      LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
      WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND (?='' OR c.uf=?)
      QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado)=1
    ), q AS (SELECT *,NTILE(4) OVER(ORDER BY patrimonio,id_candidatura) quartil FROM b WHERE patrimonio>=0 AND eleito IS NOT NULL)
    SELECT quartil,COUNT(*) candidaturas,SUM(eleito) eleitos,100.0*AVG(eleito) taxa,MEDIAN(patrimonio) mediana FROM q GROUP BY 1 ORDER BY 1'''
    result=response(scoped(sql,[ano,cargo,uf,uf],partido,municipio,cargo),{'ano':ano,'cargo':cargo,'uf':uf,'partido':partido,'municipio':municipio},'Quartis de patrimônio não negativo, primeiro turno, resultado definido; associação, não causalidade.')
    coverage=sql[:sql.index(', q AS')]+''' SELECT COUNT(*) total,COUNT(*) FILTER(WHERE patrimonio>=0) conhecidos,
      100.0*COUNT(*) FILTER(WHERE patrimonio>=0)/NULLIF(COUNT(*),0) cobertura_pct FROM b'''
    result['coverage']=scoped(coverage,[ano,cargo,uf,uf],partido,municipio,cargo)[0]
    return result

@router.get('/proporcional')
def proportional(ano:int=2024,cargo:str='VEREADOR',uf:str='',municipio:str=''):
    election(ano,cargo);state(uf)
    sql='''WITH base AS (SELECT c.id_candidatura id,c.id_candidato,c.id_eleicao,c.id_municipio,c.nome_urna nome,c.numero_urna numero,p.sigla partido,m.nome municipio,c.uf,e.ano,UPPER(e.cargo) cargo,
      r.votos,r.resultado,c.gastos_campanha_total gastos
      FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
      JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
      LEFT JOIN {db}.main.Municipio m USING(id_municipio) JOIN {db}.main.Partido p USING(id_partido)
      WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND c.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR c.uf=?) AND (?='' OR c.id_municipio=?)
      QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado)=1
      ), pairs AS (SELECT a.id maior,b.id menor FROM base a JOIN base b
        ON a.id_eleicao=b.id_eleicao AND a.uf=b.uf AND (a.cargo<>'VEREADOR' OR a.id_municipio=b.id_municipio)
        WHERE UPPER(a.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') AND UPPER(b.resultado) LIKE 'ELEITO%'
        AND a.votos>b.votos ORDER BY a.votos-b.votos DESC,a.id,b.id LIMIT 1)
      SELECT base.* FROM base JOIN pairs ON base.id IN (pairs.maior,pairs.menor) ORDER BY votos DESC'''
    return response(read(sql,[ano,cargo,uf,uf,municipio,municipio]),{'ano':ano,'cargo':cargo,'uf':uf,'municipio':municipio},'Par selecionado pela maior diferença de votos entre um não eleito/suplente e um eleito da mesma disputa. Caso extremo, não representativo; não reconstrói vagas.')

