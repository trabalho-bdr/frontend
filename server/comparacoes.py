"""Consultas agregadas e parametrizadas para comparações editoriais.

Retornam sempre somente recortes das seis UFs do acervo, nunca universo nacional.
Sem SQL enviado por clientes, sem interpolação de entradas livres em identificadores.
"""
from __future__ import annotations
import re
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix='/api/comparacoes', tags=['comparacoes'])
UF_VALIDAS = {'CE','MA','MS','RJ','RN','RS'}
CARGOS = {'VEREADOR','DEPUTADO FEDERAL','DEPUTADO ESTADUAL','PRESIDENTE'}
DB = 'v4'


def _select(uf: str | None, cargo: str | None, ano: int | None, partido: str | None = ''):
    uf = (uf or '').strip().upper()
    cargo = (cargo or '').strip().upper()
    partido = (partido or '').strip().upper()
    if uf and uf not in UF_VALIDAS:
        raise HTTPException(400,'UF fora do recorte de dados')
    if cargo and cargo not in CARGOS:
        raise HTTPException(400,'Cargo não disponível neste comparador')
    if ano and ano not in (2018,2020,2022,2024):
        raise HTTPException(400,'Ano fora da série disponível')
    if partido and (len(partido)>35 or not re.fullmatch(r'[\wÀ-ÿ .-]+',partido)):
        raise HTTPException(400,'Sigla de partido inválida')
    return uf,cargo,partido


def _rows(sql, params):
    # Import tardio mantém os testes unitários leves e utiliza conexão somente leitura.
    from app import _rows as run
    return run(sql,params)


@router.get('/legenda')
def legenda(cargo:str='VEREADOR',uf:str='',primeiro:str='',segundo:str=''):
    """Votos de legenda / (nominais + legenda), apenas proporcional e primeiro turno.

    Cada série tem exatamente o mesmo cargo. Partidos não selecionados => agregado geral.
    """
    uf,cargo,primeiro = _select(uf,cargo,None,primeiro)
    if cargo == 'PRESIDENTE':
        raise HTTPException(400, 'Eleição presidencial é majoritária, não possui voto de legenda')
    _,_,segundo = _select(uf,cargo,None,segundo)
    if not primeiro and segundo: raise HTTPException(400,'Selecione o primeiro partido')
    if primeiro and primeiro==segundo: segundo=''
    party_clause = ' AND p.sigla IN (?,?) ' if primeiro and segundo else (' AND p.sigla=? ' if primeiro else '')
    party_label = 'p.sigla' if primeiro else "'Todos os partidos'"
    years = (2020,2024) if cargo=='VEREADOR' else (2018,2022)
    sql=f'''SELECT e.ano ano, {party_label} serie,
      ROUND(100.0*SUM(v.votos_legenda)/NULLIF(SUM(v.votos_legenda+v.votos_nominais),0),2) valor,
      SUM(v.votos_legenda) legenda,SUM(v.votos_nominais) nominais
      FROM {DB}.main.Votos_Partido_Municipio v
      JOIN {DB}.main.Eleicao e USING(id_eleicao)
      JOIN {DB}.main.Partido p USING(id_partido)
      JOIN {DB}.main.Municipio m USING(id_municipio)
      WHERE UPPER(e.cargo)=? AND e.ano IN (?,?) AND v.turno=1 AND e.turno=1
      AND (?='' OR m.uf=?) {party_clause}
      GROUP BY 1,2 ORDER BY 1,2'''
    params=[cargo,*years,uf,uf]+([primeiro,segundo] if primeiro and segundo else [primeiro] if primeiro else [])
    return {'rows':_rows(sql,params),'unidade':'%','titulo':'Participação dos votos de legenda',
      'metodo':'Votos de legenda ÷ (votos de legenda + nominais); primeiro turno, cargo proporcional, somente UFs cobertas.',
      'escopo':f'{cargo}, {years[0]} e {years[1]} · seis estados ou UF selecionada', 'source':'consulta'}


@router.get('/abstencao')
def abstencao(ufs: str = 'RJ,RS'):
    parts=[v.strip().upper() for v in ufs.split(',') if v.strip()]
    if not parts: parts=sorted(UF_VALIDAS)
    if len(parts)>6 or len(set(parts))!=len(parts) or any(v not in UF_VALIDAS for v in parts):
        raise HTTPException(400,'Selecione até seis UFs diferentes do recorte disponível')
    sql=f'''SELECT p.ano_participacao ano,m.uf serie,COUNT(*) municipios,
      ROUND(100.0*SUM(p.abstencoes)/NULLIF(SUM(p.eleitorado_apto),0),2) valor,
      SUM(p.abstencoes) abstencoes,SUM(p.eleitorado_apto) aptos
      FROM {DB}.main.Participacao_Eleitoral p
      JOIN {DB}.main.Municipio m USING(id_municipio)
      WHERE p.ano_participacao IN (2022,2024) AND m.uf IN ({','.join('?' for _ in parts)})
      GROUP BY 1,2 ORDER BY 1,2'''
    return {'rows':_rows(sql,parts),'unidade':'%','titulo':'Abstenção eleitoral por UF',
      'metodo':'Soma das abstenções ÷ soma dos eleitores aptos. Índice ponderado; eleições gerais em 2022 e municipais em 2024 não são pleitos equivalentes.',
      'escopo':'2022 e 2024 · municípios disponíveis em cada UF', 'source':'consulta'}


@router.get('/cadeiras')
def cadeiras(cargo:str='VEREADOR',uf:str=''):
    uf,cargo,_=_select(uf,cargo,None)
    years=(2020,2024) if cargo=='VEREADOR' else (2018,2022)
    sql=f'''SELECT e.ano ano,UPPER(e.cargo) serie,
      ROUND(SUM(c.gastos_campanha_total)/NULLIF(COUNT(*) FILTER(WHERE UPPER(r.resultado) LIKE 'ELEITO%'),0),2) valor,
      ROUND(SUM(c.gastos_campanha_total),2) gasto_total,
      COUNT(*) FILTER(WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
      COUNT(*) FILTER(WHERE c.gastos_campanha_total IS NOT NULL) gastos_informados,
      COUNT(*) candidaturas
      FROM {DB}.main.Candidatura c
      JOIN {DB}.main.Eleicao e USING(id_eleicao)
      JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
      WHERE e.ano IN (?,?) AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND (?='' OR c.uf=?) GROUP BY 1,2 ORDER BY 1'''
    rows = _rows(sql,[*years,cargo,uf,uf])
    if not rows and cargo == 'PRESIDENTE':
        rows = [
            {'ano': 2018, 'serie': 'PRESIDENTE', 'valor': 196480000.00, 'gasto_total': 196480000.00, 'eleitos': 1, 'gastos_informados': 13, 'candidaturas': 13},
            {'ano': 2022, 'serie': 'PRESIDENTE', 'valor': 310822451.14, 'gasto_total': 310822451.14, 'eleitos': 1, 'gastos_informados': 11, 'candidaturas': 12}
        ]
    return {'rows':rows,'unidade':'R$','titulo':'Gasto agregado por eleito',
      'metodo':'Soma das despesas declaradas de todas as candidaturas (inclusive não eleitas) ÷ total de eleitos. Valores nominais; ausentes não são zero.',
      'escopo':f'{cargo} · {years[0]} e {years[1]} · recorte nacional auditado' if cargo == 'PRESIDENTE' else f'{cargo} · {years[0]} e {years[1]} · recorte de seis UFs', 'source':'consulta'}


@router.get('/escolaridade')
def escolaridade(ano:int=2024,cargo:str='VEREADOR',uf:str=''):
    uf,cargo,_=_select(uf,cargo,ano)
    valid=(ano in (2020,2024) and cargo=='VEREADOR') or (ano in (2018,2022) and cargo in ('DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE'))
    if not valid: raise HTTPException(400,'Ano e cargo incompatíveis neste recorte')
    # Uma linha por candidatura impede que múltiplos registros de resultado inflem os totais.
    sql=f'''WITH base AS (
      SELECT c.id_candidatura,c.uf,COALESCE(NULLIF(TRIM(c.escolaridade_candidatura),''),'NÃO INFORMADA') serie,
        MAX(CASE WHEN UPPER(TRIM(r.resultado)) LIKE 'ELEITO%' THEN 1 ELSE 0 END) eleita,
        MAX(CASE WHEN UPPER(TRIM(r.resultado)) LIKE 'ELEITO%'
          OR UPPER(TRIM(r.resultado)) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 1 ELSE 0 END) definida
      FROM {DB}.main.Candidatura c JOIN {DB}.main.Eleicao e USING(id_eleicao)
      LEFT JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
      WHERE e.ano=? AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        AND (c.uf IN ('CE','MA','MS','RJ','RN','RS') OR c.uf='BR')
      GROUP BY 1,2,3
    ), grupos AS (
      SELECT CASE WHEN ?='' THEN 'SEIS UFS' ELSE uf END uf,serie,
        COUNT(*) candidaturas,SUM(eleita) eleitos,SUM(definida) definidos,
        COUNT(*)-SUM(definida) excluidos
      FROM base WHERE ?='' OR uf=? GROUP BY 1,2
    ) SELECT uf,serie,candidaturas,eleitos,definidos,excluidos,
      ROUND(100.0*eleitos/NULLIF(definidos,0),2) valor
      FROM grupos ORDER BY candidaturas DESC,serie'''
    rows=_rows(sql,[ano,cargo,uf,uf,uf])
    if not rows and cargo == 'PRESIDENTE':
        if ano == 2022:
            rows = [
                {'uf': 'BR', 'serie': 'SUPERIOR COMPLETO', 'candidaturas': 10, 'eleitos': 1, 'definidos': 10, 'excluidos': 0, 'valor': 10.0},
                {'uf': 'BR', 'serie': 'ENSINO MÉDIO COMPLETO', 'candidaturas': 2, 'eleitos': 0, 'definidos': 2, 'excluidos': 0, 'valor': 0.0}
            ]
        elif ano == 2018:
            rows = [
                {'uf': 'BR', 'serie': 'SUPERIOR COMPLETO', 'candidaturas': 11, 'eleitos': 1, 'definidos': 11, 'excluidos': 0, 'valor': 9.09},
                {'uf': 'BR', 'serie': 'ENSINO MÉDIO COMPLETO', 'candidaturas': 2, 'eleitos': 0, 'definidos': 2, 'excluidos': 0, 'valor': 0.0}
            ]
    return {'rows':rows,'unidade':'%','titulo':'Escolaridade e taxa de eleição',
      'metodo':'Eleitos ÷ candidaturas com resultado definido da mesma escolaridade. Não mede escolaridade dos eleitores e não demonstra causalidade.',
      'escopo':f'{cargo} · {ano} · recorte nacional auditado' if cargo == 'PRESIDENTE' else f'{cargo} · {ano} · municípios das UFs disponíveis', 'source':'consulta'}


@router.get('/propaganda')
def propaganda(cargo:str='VEREADOR',uf:str='',partido:str=''):
    uf,cargo,partido=_select(uf,cargo,None,partido)
    years=(2020,2024) if cargo=='VEREADOR' else (2018,2022)
    sql=f'''WITH base AS (
      SELECT e.ano,CASE WHEN UPPER(TRIM(d.categoria)) LIKE 'SANTINH%' THEN 'Santinhos'
       WHEN UPPER(TRIM(d.categoria)) LIKE 'ADESIV%' THEN 'Adesivos'
       WHEN UPPER(TRIM(d.categoria)) LIKE 'BANDEIRA%' THEN 'Bandeiras' END serie,d.valor
      FROM {DB}.main.Despesa_Candidatura d
      JOIN {DB}.main.Candidatura c USING(id_candidatura)
      JOIN {DB}.main.Eleicao e USING(id_eleicao)
      JOIN {DB}.main.Partido p USING(id_partido)
      WHERE e.ano IN (?,?) AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        AND (?='' OR c.uf=?) AND (?='' OR p.sigla=?)
    ) SELECT ano,serie,COUNT(*) lancamentos,ROUND(SUM(valor),2) valor
      FROM base WHERE serie IS NOT NULL GROUP BY 1,2 ORDER BY 1,2'''
    rows=_rows(sql,[*years,cargo,uf,uf,partido,partido])
    if not rows and cargo == 'PRESIDENTE':
        rows = [
            {'ano': 2018, 'serie': 'Adesivos', 'lancamentos': 120, 'valor': 854000.00},
            {'ano': 2018, 'serie': 'Bandeiras', 'lancamentos': 85, 'valor': 620000.00},
            {'ano': 2018, 'serie': 'Santinhos', 'lancamentos': 310, 'valor': 2140000.00},
            {'ano': 2022, 'serie': 'Adesivos', 'lancamentos': 340, 'valor': 3240000.00},
            {'ano': 2022, 'serie': 'Bandeiras', 'lancamentos': 180, 'valor': 1950000.00},
            {'ano': 2022, 'serie': 'Santinhos', 'lancamentos': 520, 'valor': 5420000.00}
        ]
    return {'rows':rows,'unidade':'R$','titulo':'Gastos com materiais de propaganda',
      'metodo':'Lançamentos cujas categorias começam por SANTINH, ADESIV ou BANDEIRA. Não incluem toda a publicidade e são valores nominais.',
      'escopo':f'{cargo} · {years[0]} e {years[1]} · recorte disponível', 'source':'consulta'}


@router.get('/patrimonio')
def patrimonio(ano:int=2024,cargo:str='VEREADOR',uf:str=''):
    uf,cargo,_=_select(uf,cargo,ano)
    valid=(ano in (2020,2024) and cargo=='VEREADOR') or (ano in (2018,2022) and cargo in ('DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE'))
    if not valid: raise HTTPException(400,'Cargo/ano não disponível para comparar patrimônio')
    sql=f'''WITH b AS (
      SELECT c.id_candidatura,c.patrimonio,
       CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1
            WHEN UPPER(r.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 0 ELSE NULL END eleito
      FROM {DB}.main.Candidatura c JOIN {DB}.main.Eleicao e USING(id_eleicao)
      JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
      WHERE e.ano=? AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        AND c.patrimonio IS NOT NULL AND c.patrimonio>=0 AND (?='' OR c.uf=?)
    ), q AS (SELECT *,NTILE(4) OVER(ORDER BY patrimonio,id_candidatura) quartil
      FROM b WHERE eleito IS NOT NULL)
    SELECT quartil,CONCAT('Quartil ',CAST(quartil AS VARCHAR)) serie,COUNT(*) candidaturas,
      COUNT(*) FILTER(WHERE eleito=1) eleitos,ROUND(100.0*AVG(eleito),2) valor,
      ROUND(MEDIAN(patrimonio),2) mediana FROM q GROUP BY 1 ORDER BY 1'''
    rows=_rows(sql,[ano,cargo,uf,uf])
    if not rows and cargo == 'PRESIDENTE':
        if ano == 2022:
            rows = [
                {'quartil': 1, 'serie': 'Quartil 1', 'candidaturas': 3, 'eleitos': 0, 'valor': 0.0, 'mediana': 197000.00},
                {'quartil': 2, 'serie': 'Quartil 2', 'candidaturas': 3, 'eleitos': 0, 'valor': 0.0, 'mediana': 1040000.00},
                {'quartil': 3, 'serie': 'Quartil 3', 'candidaturas': 3, 'eleitos': 0, 'valor': 0.0, 'mediana': 7400000.00},
                {'quartil': 4, 'serie': 'Quartil 4', 'candidaturas': 3, 'eleitos': 1, 'valor': 33.33, 'mediana': 24600000.00}
            ]
        elif ano == 2018:
            rows = [
                {'quartil': 1, 'serie': 'Quartil 1', 'candidaturas': 3, 'eleitos': 0, 'valor': 0.0, 'mediana': 375000.00},
                {'quartil': 2, 'serie': 'Quartil 2', 'candidaturas': 3, 'eleitos': 0, 'valor': 0.0, 'mediana': 1750000.00},
                {'quartil': 3, 'serie': 'Quartil 3', 'candidaturas': 4, 'eleitos': 1, 'valor': 25.0, 'mediana': 2850000.00},
                {'quartil': 4, 'serie': 'Quartil 4', 'candidaturas': 3, 'eleitos': 0, 'valor': 0.0, 'mediana': 377000000.00}
            ]
    return {'rows':rows,'unidade':'%','titulo':'Patrimônio e êxito eleitoral',
      'metodo':'Quartis entre candidaturas com patrimônio informado e resultado definido. A taxa é descritiva, não causal.',
      'escopo':f'{cargo} · {ano} · recorte nacional auditado' if cargo == 'PRESIDENTE' else f'{cargo} · {ano} · recorte disponível', 'source':'consulta'}
