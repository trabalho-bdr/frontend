"""Consultas agregadas e parametrizadas para comparações editoriais.

Retornam sempre somente recortes das seis UFs do acervo, nunca universo nacional.
Sem SQL enviado por clientes, sem interpolação de entradas livres em identificadores.
"""
from __future__ import annotations
from core.sql import query_sql
import re
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix='/api/comparacoes', tags=['comparacoes'])
UF_VALIDAS = {'CE','MA','MS','RJ','RN','RS'}
CARGOS = {'VEREADOR','DEPUTADO FEDERAL','DEPUTADO ESTADUAL','PRESIDENTE'}
DB = 'pipeline_bdr_der_completo_v4'


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
    from core.dependencies import execute as run
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
    sql=query_sql('compatibility/sql/comparacoes/comparacoes_legenda_01.sql', fragment_0=party_label, fragment_1=DB, fragment_2=DB, fragment_3=DB, fragment_4=DB, fragment_5=party_clause)
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
    sql=query_sql('compatibility/sql/comparacoes/comparacoes_abstencao_01.sql', fragment_0=DB, fragment_1=DB, fragment_2=','.join(('?' for _ in parts)))
    return {'rows':_rows(sql,parts),'unidade':'%','titulo':'Abstenção eleitoral por UF',
      'metodo':'Soma das abstenções ÷ soma dos eleitores aptos. Índice ponderado; eleições gerais em 2022 e municipais em 2024 não são pleitos equivalentes.',
      'escopo':'2022 e 2024 · municípios disponíveis em cada UF', 'source':'consulta'}


@router.get('/cadeiras')
def cadeiras(cargo:str='VEREADOR',uf:str=''):
    uf,cargo,_=_select(uf,cargo,None)
    years=(2020,2024) if cargo=='VEREADOR' else (2018,2022)
    sql=query_sql('compatibility/sql/comparacoes/comparacoes_cadeiras_01.sql', fragment_0=DB, fragment_1=DB, fragment_2=DB)
    rows = _rows(sql,[*years,cargo,uf,uf])
    return {'rows':rows,'unidade':'R$','titulo':'Gasto agregado por eleito',
      'metodo':'Soma das despesas declaradas de todas as candidaturas (inclusive não eleitas) ÷ total de eleitos. Valores nominais; ausentes não são zero.',
      'escopo':f'{cargo} · {years[0]} e {years[1]} · recorte nacional auditado' if cargo == 'PRESIDENTE' else f'{cargo} · {years[0]} e {years[1]} · recorte de seis UFs', 'source':'consulta'}


@router.get('/escolaridade')
def escolaridade(ano:int=2024,cargo:str='VEREADOR',uf:str=''):
    uf,cargo,_=_select(uf,cargo,ano)
    valid=(ano in (2020,2024) and cargo=='VEREADOR') or (ano in (2018,2022) and cargo in ('DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE'))
    if not valid: raise HTTPException(400,'Ano e cargo incompatíveis neste recorte')
    # Uma linha por candidatura impede que múltiplos registros de resultado inflem os totais.
    sql=query_sql('compatibility/sql/comparacoes/comparacoes_escolaridade_01.sql', fragment_0=DB, fragment_1=DB, fragment_2=DB)
    rows=_rows(sql,[ano,cargo,uf,uf,uf])
    return {'rows':rows,'unidade':'%','titulo':'Escolaridade e taxa de eleição',
      'metodo':'Eleitos ÷ candidaturas com resultado definido da mesma escolaridade. Não mede escolaridade dos eleitores e não demonstra causalidade.',
      'escopo':f'{cargo} · {ano} · recorte nacional auditado' if cargo == 'PRESIDENTE' else f'{cargo} · {ano} · municípios das UFs disponíveis', 'source':'consulta'}


@router.get('/propaganda')
def propaganda(cargo:str='VEREADOR',uf:str='',partido:str=''):
    uf,cargo,partido=_select(uf,cargo,None,partido)
    years=(2020,2024) if cargo=='VEREADOR' else (2018,2022)
    sql=query_sql('compatibility/sql/comparacoes/comparacoes_propaganda_01.sql', fragment_0=DB, fragment_1=DB, fragment_2=DB, fragment_3=DB)
    rows=_rows(sql,[*years,cargo,uf,uf,partido,partido])
    return {'rows':rows,'unidade':'R$','titulo':'Gastos com materiais de propaganda',
      'metodo':'Lançamentos cujas categorias começam por SANTINH, ADESIV ou BANDEIRA. Não incluem toda a publicidade e são valores nominais.',
      'escopo':f'{cargo} · {years[0]} e {years[1]} · recorte disponível', 'source':'consulta'}


@router.get('/patrimonio')
def patrimonio(ano:int=2024,cargo:str='VEREADOR',uf:str=''):
    uf,cargo,_=_select(uf,cargo,ano)
    valid=(ano in (2020,2024) and cargo=='VEREADOR') or (ano in (2018,2022) and cargo in ('DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE'))
    if not valid: raise HTTPException(400,'Cargo/ano não disponível para comparar patrimônio')
    sql=query_sql('compatibility/sql/comparacoes/comparacoes_patrimonio_01.sql', fragment_0=DB, fragment_1=DB, fragment_2=DB)
    rows=_rows(sql,[ano,cargo,uf,uf])
    return {'rows':rows,'unidade':'%','titulo':'Patrimônio e êxito eleitoral',
      'metodo':'Quartis entre candidaturas com patrimônio informado e resultado definido. A taxa é descritiva, não causal.',
      'escopo':f'{cargo} · {ano} · recorte nacional auditado' if cargo == 'PRESIDENTE' else f'{cargo} · {ano} · recorte disponível', 'source':'consulta'}
