"""API read-only do MotherDuck para o Arquivo da Democracia.
Nunca envie token ao navegador. O serviço expõe apenas consultas parametrizadas.
"""
from __future__ import annotations
import os
import re
import threading
import time
from copy import deepcopy
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Arquivo da Democracia — API MotherDuck", version="1.0.0")
from comparacoes import router as comparacoes_router
from questao1 import router as questao1_router
from questao2 import router as questao2_router
app.include_router(comparacoes_router)
app.include_router(questao1_router)
app.include_router(questao2_router)
from indicadores import router as indicadores_router, diagnostico_base
app.include_router(indicadores_router)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["GET"], allow_headers=["*"])
_lock = threading.RLock()
_con = None
_query_cache = {}
# Nome real do banco; usado diretamente nas consultas.
DB = 'pipeline_bdr_der_completo_v4'
ALLOWED_UF = {'RS', 'MA', 'CE', 'RN', 'RJ', 'MS'}
YEARS = set(range(2002, 2025, 2))


def _open():
    global _con
    with _lock:
        if _con is not None:
            return _con
        if not os.getenv('MOTHERDUCK_TOKEN'):
            raise RuntimeError('MOTHERDUCK_TOKEN não configurado no servidor')
        # A extensão MotherDuck lê esta variável em minúsculas. O servidor
        # recebe a credencial como MOTHERDUCK_TOKEN no arquivo .env.
        os.environ['motherduck_token'] = os.environ['MOTHERDUCK_TOKEN']
        import duckdb
        # Start locally, then attach only the verified v4 database read-only.
        # Workspace auto-attachment can fail on unrelated/stale database aliases.
        target = os.getenv('MOTHERDUCK_DATABASE', 'md:pipeline_bdr_der_completo_v4')
        if target != 'md:pipeline_bdr_der_completo_v4':
            raise RuntimeError('MOTHERDUCK_DATABASE deve apontar para pipeline_bdr_der_completo_v4')
        con = duckdb.connect(target+'?attach_mode=single', read_only=True)
        _con = con
        return con


def _rows(sql, params=()):
    if not re.match(r'^\s*(SELECT|WITH|DESCRIBE|PRAGMA)\b', sql, re.I):
        raise RuntimeError('A API permite somente consultas de leitura')
    key=(sql,tuple(params))
    with _lock:
        cached=_query_cache.get(key)
        if cached and time.monotonic()-cached[0]<60:
            return deepcopy(cached[1])
        con = _open()
        cur = con.execute(sql, list(params))
        cols = [x[0] for x in cur.description]
        result = cur.fetchall()
    def clean(v):
        if isinstance(v, Decimal): return float(v)
        if isinstance(v, (datetime, date)): return v.isoformat()
        return v
    rows=[dict(zip(cols, (clean(v) for v in row))) for row in result]
    with _lock:
        if len(_query_cache)>=128:
            _query_cache.pop(next(iter(_query_cache)))
        _query_cache[key]=(time.monotonic(),rows)
    return deepcopy(rows)


def _year(value: int | None):
    if value is not None and value not in YEARS:
        raise HTTPException(400, 'Ano não permitido')
    return value


def _uf(value: str | None):
    if value and value.upper() not in ALLOWED_UF:
        raise HTTPException(400, 'UF fora da cobertura desta base')
    return value.upper() if value else None


@app.get('/api/diagnostico')
def diagnostico():
    try:
        return diagnostico_base()
    except Exception as exc:
        return JSONResponse({'status': 'erro', 'motivo': 'Não foi possível consultar a v4. Verifique a configuração e as permissões do servidor.'}, status_code=503)


@app.get('/api/health')
def health():
    try:
        result = _rows(f'SELECT COUNT(*) n FROM {DB}.main.Municipio')
        return {'mode':'live','connected':True,'database':'pipeline_bdr_der_completo_v4','municipalities':result[0]['n'],'coverage':'RS, MA, CE, RN, RJ, MS'}
    except Exception as exc:
        return JSONResponse({'mode':'unavailable','connected':False,'message':'Consulta detalhada temporariamente indisponível'}, status_code=503)


@app.get('/api/overview')
def overview():
    tables = {'applications':'Candidatura','people':'Candidato','expenses':'Despesa_Candidatura','patrimony':'Patrimonio_Candidato','partyVotes':'Votos_Partido_Municipio','coverage':'Municipio'}
    parts = [f'''SELECT '{k}' field, COUNT(*) AS "value" FROM {DB}.main.{table}''' for k,table in tables.items()]
    rows = _rows(' UNION ALL '.join(parts))
    return {'source':'live','values':{r['field']:r['value'] for r in rows},'states':6,'disclaimer':'Cobertura parcial de 6 UFs, não nacional.'}


@app.get('/api/candidates')
def candidates(search: str = Query('', min_length=0, max_length=80), ano:int=2024, uf:str|None=None,
               partido:str=Query('',max_length=35),cargo:str=Query('',max_length=50),resultado:str=Query('',max_length=35),
               limit:int=Query(12,ge=1,le=36),offset:int=Query(0,ge=0,le=1000000),ordem:str='votos',municipio:str=''):
    _year(ano);uf=_uf(uf)
    if municipio and cargo.upper() not in ('VEREADOR','PREFEITO'):
        raise HTTPException(400,'Município só pode delimitar uma disputa municipal.')
    # Whitelist de ordenação: nenhum identificador SQL é aceito diretamente da URL.
    if resultado not in ('','ELEITO','NÃO ELEITO','SUPLENTE'):
        raise HTTPException(400,'Resultado não reconhecido')
    orders={'votos':'r.votos DESC NULLS LAST','gastos':'c.gastos_campanha_total DESC NULLS LAST','custo_voto':'c.gastos_campanha_total/NULLIF(r.votos,0) DESC NULLS LAST'}
    if ordem not in orders: raise HTTPException(400, 'Ordenação desconhecida')
    order=orders[ordem]
    # Busca completa paginada; filtros como parâmetros preparados.
    sql=f'''
      SELECT c.id_candidatura id,c.id_candidato,c.id_municipio,c.nome_urna nome,c.numero_urna numero,p.sigla partido,
       UPPER(e.cargo) cargo,e.ano,c.uf,m.nome municipio,c.escolaridade_candidatura escolaridade,
       c.patrimonio patrimonio,c.gastos_campanha_total gastos,r.resultado resultado,r.votos votos,
       COUNT(*) OVER() total_encontrado
      FROM {DB}.main.Candidatura c
      JOIN {DB}.main.Eleicao e ON c.id_eleicao=e.id_eleicao
      LEFT JOIN {DB}.main.Partido p ON c.id_partido=p.id_partido
      LEFT JOIN {DB}.main.Municipio m ON c.id_municipio=m.id_municipio
      LEFT JOIN {DB}.main.Resultado_Candidatura r ON c.id_candidatura=r.id_candidatura
      WHERE e.ano=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        AND e.turno=1 AND (r.turno=1 OR r.turno IS NULL)
        AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
        AND (strip_accents(COALESCE(c.nome_urna,'')) ILIKE strip_accents(?) OR strip_accents(COALESCE(m.nome,'')) ILIKE strip_accents(?) OR strip_accents(COALESCE(p.sigla,'')) ILIKE strip_accents(?) OR CAST(c.numero_urna AS VARCHAR) ILIKE ?)
        AND (? IS NULL OR c.uf=?)
        AND (?='' OR UPPER(p.sigla)=UPPER(?))
        AND (?='' OR UPPER(e.cargo)=UPPER(?))
        AND (?='' OR (?='ELEITO' AND UPPER(COALESCE(r.resultado,'')) LIKE 'ELEITO%')
             OR (?='NÃO ELEITO' AND UPPER(COALESCE(r.resultado,'')) IN ('NÃO ELEITO','NAO ELEITO'))
             OR (?='SUPLENTE' AND UPPER(COALESCE(r.resultado,''))='SUPLENTE'))
      ORDER BY {order},c.nome_urna,c.id_candidatura
      LIMIT ? OFFSET ?'''
    sql=sql.replace('      ORDER BY',"        AND (?='' OR c.id_municipio=?)\n      ORDER BY")
    params=[ano,*([f'%{search}%']*4),uf,uf,partido,partido,cargo,cargo,resultado,resultado,resultado,resultado,municipio,municipio,limit,offset]
    rows=_rows(sql,params)
    return {'rows':[{k:v for k,v in row.items() if k!='total_encontrado'} for row in rows],
            'total':rows[0]['total_encontrado'] if rows else 0,'limit':limit,'offset':offset}

@app.get('/api/candidate-expenses/{candidate_id}')
def candidate_expenses(candidate_id:str, categoria:str=Query('',max_length=300),
                       limit:int=Query(40,ge=1,le=100),offset:int=Query(0,ge=0,le=1000000)):
    """Livro de lançamentos da candidatura. Não são arquivos de notas fiscais."""
    if not re.fullmatch(r'[0-9a-f]{32}',candidate_id):
        raise HTTPException(400, 'Identificador inválido')
    person=_rows(f'''SELECT c.id_candidatura id,c.nome_urna nome,c.numero_urna numero,
       p.sigla partido,e.ano,UPPER(e.cargo) cargo,c.uf,m.nome municipio,
       c.gastos_campanha_total gastos,r.votos,r.resultado
       FROM {DB}.main.Candidatura c JOIN {DB}.main.Eleicao e USING (id_eleicao)
       LEFT JOIN {DB}.main.Partido p USING (id_partido)
       LEFT JOIN {DB}.main.Municipio m USING (id_municipio)
       LEFT JOIN {DB}.main.Resultado_Candidatura r USING (id_candidatura)
       WHERE c.id_candidatura=? LIMIT 1''',[candidate_id])
    if not person: raise HTTPException(404, 'Candidatura não encontrada')
    summary=_rows(f'''SELECT categoria, COUNT(*) quantidade, ROUND(SUM(valor),2) valor
        FROM {DB}.main.Despesa_Candidatura WHERE id_candidatura=?
        GROUP BY categoria ORDER BY valor DESC NULLS LAST LIMIT 24''',[candidate_id])
    stats=_rows(f'''SELECT COUNT(*) quantidade,ROUND(SUM(valor),2) total
        FROM {DB}.main.Despesa_Candidatura WHERE id_candidatura=?''',[candidate_id])
    selected=_rows(f'''SELECT COUNT(*) quantidade FROM {DB}.main.Despesa_Candidatura
        WHERE id_candidatura=? AND (?='' OR categoria=?)''',[candidate_id,categoria,categoria])
    entries=_rows(f'''SELECT id_despesa id,categoria,ROUND(valor,2) valor
        FROM {DB}.main.Despesa_Candidatura WHERE id_candidatura=? AND (?='' OR categoria=?)
        ORDER BY valor DESC NULLS LAST,id_despesa LIMIT ? OFFSET ?''',[candidate_id,categoria,categoria,limit,offset])
    return {'candidate':person[0], 'categories':summary, 'entries':entries,
      'stats':stats[0], 'total_filtered':selected[0]['quantidade'], 'limit':limit,'offset':offset,
      'document_type':'EXTRATO_VISUAL',
      'disclaimer':'Documento visual produzido pelo portal com dados de Despesa_Candidatura. NÃO é nota fiscal, cupom fiscal nem comprovante oficial.'}


def _resolve_db(table_name: str) -> str:
    _rows(f"SELECT 1 FROM {DB}.main.{table_name} LIMIT 1")
    return DB


@app.get('/api/anos')
def anos():
    return {'anos': [2022, 2024]}


@app.get('/api/q3/{uf}/{ano}')
def q3_municipios(uf: str, ano: int):
    uf_val = _uf(uf)
    if not uf_val:
        raise HTTPException(400, 'UF obrigatória')
    _year(ano)
    db_m = _resolve_db('Municipio')
    db_p = _resolve_db('Participacao_Eleitoral')
    db_c = _resolve_db('Censo_Municipio')
    sql = f'''SELECT m.id_municipio, m.nome, m.uf,
      p.eleitorado_apto AS eleitorado,
      p.abstencoes,
      ROUND(100.0 * p.taxa_abstencao, 2) AS abstencao_pct,
      c.populacao,
      ROUND(c.pib / NULLIF(c.populacao, 0), 2) AS pib_per_capita,
      c.idhm
      FROM {db_m}.main.Municipio m
      JOIN {db_p}.main.Participacao_Eleitoral p ON p.id_municipio = m.id_municipio
      LEFT JOIN {db_c}.main.Censo_Municipio c ON c.id_municipio = m.id_municipio AND c.ano_referencia = 2022
      WHERE m.uf = ? AND p.ano_participacao = ?
      ORDER BY m.nome'''
    linhas = _rows(sql, [uf_val, ano])
    saida = {str(r["id_municipio"]).zfill(7): r for r in linhas}
    return {"uf": uf_val, "ano": ano, "municipios": saida}


@app.get('/api/municipios')
def municipios(search:str=Query('',max_length=75),uf:str|None=None,limit:int=Query(35,ge=1,le=1500)):
    uf=_uf(uf)
    db_m = _resolve_db('Municipio')
    db_c = _resolve_db('Censo_Municipio')
    db_p = _resolve_db('Participacao_Eleitoral')
    return _rows(f'''SELECT m.id_municipio id,m.nome,m.uf,m.regiao,
      c.populacao,c.idhm,ROUND(c.pib/NULLIF(c.populacao,0),2) pib_per_capita,
      ROUND(100*p.taxa_abstencao,2) abstencao_2024
      FROM {db_m}.main.Municipio m
      LEFT JOIN {db_c}.main.Censo_Municipio c ON c.id_municipio=m.id_municipio AND c.ano_referencia=2022
      LEFT JOIN {db_p}.main.Participacao_Eleitoral p ON p.id_municipio=m.id_municipio AND p.ano_participacao=2024
      WHERE strip_accents(m.nome) ILIKE strip_accents(?) AND (? IS NULL OR m.uf=?)
      ORDER BY m.nome LIMIT ?''',[f'%{search}%',uf,uf,limit])


# Todos os templates SQL abaixo são fixos. Os filtros de ano nunca são interpolados na instrução SQL.
QUERY = {
  1:f'''SELECT e.ano,UPPER(e.cargo) cargo,COUNT(*) candidaturas,
       COUNT(*) FILTER(WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
       ROUND(SUM(c.gastos_campanha_total),2) gasto_total,
       ROUND(SUM(c.gastos_campanha_total)/NULLIF(COUNT(*) FILTER(WHERE UPPER(r.resultado) LIKE 'ELEITO%'),0),2) valor
       FROM {DB}.main.Candidatura c JOIN {DB}.main.Eleicao e USING(id_eleicao)
       JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
       WHERE e.ano IN (2018,2020,2022,2024) AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
       AND UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE')
       GROUP BY 1,2 ORDER BY 1,2''',
  2:f'''WITH b AS (SELECT e.ano,UPPER(e.cargo) cargo,c.id_candidatura,c.patrimonio,
       CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1
            WHEN UPPER(r.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 0
            ELSE NULL END eleito
       FROM {DB}.main.Candidatura c JOIN {DB}.main.Eleicao e USING(id_eleicao)
       JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
       WHERE e.ano IN (2018,2020,2022,2024) AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
       AND UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE')
       AND c.patrimonio IS NOT NULL AND c.patrimonio >= 0),
       q AS(SELECT *,NTILE(4) OVER(PARTITION BY ano,cargo ORDER BY patrimonio,id_candidatura) quartil FROM b WHERE eleito IS NOT NULL)
       SELECT ano,cargo,quartil,COUNT(*) candidaturas,ROUND(100*AVG(eleito),2) taxa,
       ROUND(MEDIAN(patrimonio),2) mediana FROM q GROUP BY 1,2,3 ORDER BY 1,2,3''',
  3:f'''WITH b AS (SELECT a.ano_participacao ano,m.uf,c.idhm,
       c.pib/NULLIF(c.populacao,0) pib_pc, c.populacao,a.taxa_abstencao
       FROM {DB}.main.Participacao_Eleitoral a
       JOIN {DB}.main.Censo_Municipio c ON c.id_municipio=a.id_municipio AND c.ano_referencia=2022
       JOIN {DB}.main.Municipio m ON m.id_municipio=a.id_municipio)
       SELECT ano,uf,COUNT(*) municipios,ROUND(CORR(idhm,taxa_abstencao),4) r_idhm,
       ROUND(CORR(pib_pc,taxa_abstencao),4) r_pib_pc,
       ROUND(AVG(taxa_abstencao)*100,2) abstencao_media
       FROM b GROUP BY 1,2 ORDER BY 1,2''',
  4:f'''SELECT e.ano, UPPER(e.cargo) cargo,c.escolaridade_candidatura escolaridade,
       COUNT(*) candidaturas,COUNT(*) FILTER(WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos
       FROM {DB}.main.Candidatura c JOIN {DB}.main.Eleicao e USING(id_eleicao)
       JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
       WHERE e.ano IN(2018,2020,2022,2024) AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE')
       GROUP BY 1,2,3 ORDER BY 1,2,4 DESC''',
  5:f'''SELECT e.ano,UPPER(e.cargo) cargo,
       SUM(v.votos_legenda) legenda,SUM(v.votos_nominais) nominal,
       ROUND(100*SUM(v.votos_legenda)/NULLIF(SUM(v.votos_legenda+v.votos_nominais),0),2) pct_legenda
       FROM {DB}.main.Votos_Partido_Municipio v JOIN {DB}.main.Eleicao e USING(id_eleicao)
       WHERE UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL') AND v.turno=1 AND e.turno=1
       GROUP BY 1,2 ORDER BY 1,2''',
  6:f'''WITH x AS (SELECT e.ano,UPPER(e.cargo) cargo,
       date_diff('year',p.dt_nascimento,e.data) - CASE WHEN strftime(e.data,'%m-%d') < strftime(p.dt_nascimento,'%m-%d') THEN 1 ELSE 0 END idade
       FROM {DB}.main.Candidatura c JOIN {DB}.main.Candidato p USING(id_candidato)
       JOIN {DB}.main.Eleicao e USING(id_eleicao)
       WHERE e.ano IN(2018,2020,2022,2024) AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE'))
       SELECT ano,cargo,COUNT(*) candidaturas,COUNT(*) FILTER(WHERE idade BETWEEN 18 AND 29) jovens,
       COUNT(*) FILTER(WHERE idade IS NULL) sem_idade,
       ROUND(100.0*COUNT(*) FILTER(WHERE idade BETWEEN 18 AND 29)/NULLIF(COUNT(*) FILTER(WHERE idade IS NOT NULL),0),2) pct_jovens
       FROM x GROUP BY 1,2 ORDER BY 1,2''',
  7:f'''WITH votos AS(SELECT e.ano,v.id_municipio,v.id_partido,SUM(v.votos_nominais+v.votos_legenda) total
       FROM {DB}.main.Votos_Partido_Municipio v JOIN {DB}.main.Eleicao e USING(id_eleicao)
       WHERE e.ano IN(2020,2024) AND UPPER(e.cargo)='VEREADOR' AND v.turno=1 GROUP BY 1,2,3),
       top AS(SELECT *,ROW_NUMBER() OVER(PARTITION BY ano,id_municipio ORDER BY total DESC,id_partido) rn FROM votos),
       prev AS(SELECT id_municipio,id_partido FROM top WHERE ano=2020 AND rn=1),
       curr AS(SELECT id_municipio,id_partido FROM top WHERE ano=2024 AND rn=1)
       SELECT COUNT(*) municipios,COUNT(*) FILTER(WHERE prev.id_partido=curr.id_partido) estaveis,
       ROUND(100.0*COUNT(*) FILTER(WHERE prev.id_partido=curr.id_partido)/NULLIF(COUNT(*),0),2) pct_estaveis
       FROM prev JOIN curr USING(id_municipio)''',
  9:f'''SELECT categoria,COUNT(*) registros,ROUND(SUM(valor),2) total
       FROM {DB}.main.Despesa_Candidatura
       WHERE categoria ILIKE '%SANTINH%' OR categoria ILIKE '%ADESIV%'
       OR categoria ILIKE '%BANDEIRA%' OR categoria ILIKE '%IMPRESS%'
       GROUP BY 1 ORDER BY total DESC LIMIT 24''',
  10:f'''WITH s AS(SELECT c.id_candidato,COUNT(DISTINCT e.ano) n_anos,
       COUNT(DISTINCT c.id_partido) n_partidos,
       SUM(CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END) vitorias
       FROM {DB}.main.Candidatura c JOIN {DB}.main.Eleicao e USING(id_eleicao)
       JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
       WHERE e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' GROUP BY 1)
       SELECT COUNT(*) pessoas,COUNT(*) FILTER(WHERE n_anos>1) multi_anos,
       COUNT(*) FILTER(WHERE n_anos>=3) tres_anos,
       COUNT(*) FILTER(WHERE n_partidos>1) multi_partidos,
       COUNT(*) FILTER(WHERE vitorias>=2) multi_vitorias FROM s'''
}

@app.get('/api/analysis/{question}')
def analysis(question:int):
    if question==8:
        return {'question':8,'status':'indisponivel','rows':[],'message':'Não existe tabela de receitas eleitorais públicas/privadas no v4.'}
    if question==9:
        try:
            view_sql = f'''SELECT grupo_despesa AS categoria,
                SUM(registros_agregados) AS registros,
                ROUND(SUM(valor_contratado),2) AS total
                FROM {DB}.main.vw_q9_resumo_categorias
                WHERE grupo_despesa IS NOT NULL AND grupo_despesa NOT IN ('Não informada','Não classificada — revisar')
                GROUP BY 1 ORDER BY total DESC LIMIT 24'''
            rows = _rows(view_sql)
            if rows:
                return {'question':9,'status':'ok','rows':rows,'database':'pipeline_bdr_der_completo_v4','mode':'live','source':'vw_q9_resumo_categorias'}
        except Exception:
            pass
        return {'question':9,'status':'ok','rows':_rows(QUERY[9]),'database':'pipeline_bdr_der_completo_v4','mode':'live','source':'Despesa_Candidatura'}
    if question not in QUERY: raise HTTPException(404,'Investigação não encontrada')
    return {'question':question,'status':'ok','rows':_rows(QUERY[question]),'database':'pipeline_bdr_der_completo_v4','mode':'live'}


@app.get('/api/despesas/resumo-categorias')
def despesas_resumo_categorias():
    """Consome a view vw_q9_resumo_categorias com o detalhamento dos grupos de despesa."""
    try:
        rows = _rows(f'''SELECT grupo_despesa, status_classificacao, requer_revisao,
            eh_publicidade_sugerida, registros_agregados, candidaturas,
            descricoes_originais, registros_com_valor_finito, valor_contratado
            FROM {DB}.main.vw_q9_resumo_categorias
            ORDER BY valor_contratado DESC NULLS LAST''')
        return {'source': 'vw_q9_resumo_categorias', 'total_grupos': len(rows), 'rows': rows}
    except Exception as exc:
        raise HTTPException(503, f'View vw_q9_resumo_categorias indisponível no banco conectado: {exc}')


@app.get('/api/despesas/regras')
def despesas_regras():
    """Regras de categorização da view vw_q9_regras_categorias."""
    try:
        rows = _rows(f'''SELECT codigo_regra, grupo_despesa, modalidade_publicidade_sugerida,
            eh_publicidade_sugerida, padrao, exclusao
            FROM {DB}.main.vw_q9_regras_categorias ORDER BY codigo_regra''')
        return {'source': 'vw_q9_regras_categorias', 'rows': rows}
    except Exception as exc:
        raise HTTPException(503, f'View vw_q9_regras_categorias indisponível: {exc}')


@app.get('/api/descobertas')
def descobertas(ano: int=2024, cargo: str='VEREADOR', uf: str|None=None):
    """Rankings comparáveis por cargo/ano; sem extrapolação nacional."""
    _year(ano)
    uf=_uf(uf)
    offices={'VEREADOR','PREFEITO','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','SENADOR','GOVERNADOR','PRESIDENTE'}
    cargo=cargo.upper().strip()
    if cargo not in offices: raise HTTPException(400,'Cargo desconhecido')
    if cargo == 'PRESIDENTE' and ano not in (2018, 2022): raise HTTPException(400, 'Eleições para Presidente ocorreram em 2018 e 2022.')
    lideres=_rows(f'''SELECT c.id_candidatura id,c.nome_urna nome,c.numero_urna numero,
        p.sigla partido,c.uf,e.ano,UPPER(e.cargo) cargo,r.votos,
        ROUND(c.gastos_campanha_total,2) gastos,r.resultado
        FROM {DB}.main.Candidatura c
        JOIN {DB}.main.Eleicao e USING(id_eleicao)
        JOIN {DB}.main.Resultado_Candidatura r USING(id_candidatura)
        LEFT JOIN {DB}.main.Partido p USING(id_partido)
        WHERE e.ano=? AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        AND (? IS NULL OR c.uf=?) AND r.votos IS NOT NULL
        ORDER BY r.votos DESC,c.id_candidatura LIMIT 12''',[ano,cargo,uf,uf])
    # Sem criar ranking de 'melhores' municípios se ano solicitado não tiver participação correspondente.
    alta,baixa,ufs=[],[],[]
    if ano in (2022,2024):
        base=f'''SELECT m.nome,m.uf,p.eleitorado_apto eleitorado,
         ROUND(100*p.taxa_abstencao,2) percentual
         FROM {DB}.main.Participacao_Eleitoral p JOIN {DB}.main.Municipio m USING(id_municipio)
         WHERE p.ano_participacao=? AND p.eleitorado_apto>=10000 AND (? IS NULL OR m.uf=?)
         ORDER BY p.taxa_abstencao {{order}},m.nome LIMIT 10'''
        alta=_rows(base.format(order='DESC'),[ano,uf,uf]);baixa=_rows(base.format(order='ASC'),[ano,uf,uf])
        ufs=_rows(f'''SELECT m.uf,COUNT(*) municipios,
            ROUND(100.0*SUM(p.abstencoes)/NULLIF(SUM(p.eleitorado_apto),0),2) percentual
            FROM {DB}.main.Participacao_Eleitoral p JOIN {DB}.main.Municipio m USING(id_municipio)
            WHERE p.ano_participacao=? AND (? IS NULL OR m.uf=?) GROUP BY m.uf ORDER BY percentual DESC''',[ano,uf,uf])
    return {'ano':ano,'cargo':cargo,'uf':uf,'leaders':lideres,'abstencaoAlta':alta,'abstencaoBaixa':baixa,
            'porEstado':ufs,'limiar_eleitores':10000,'coverage':'CE, MA, MS, RJ, RN, RS',
            'methodology':'Votos por candidatura e cargo, pleitos ordinários. Abstenção municipal com >= 10 mil eleitores aptos. Percentuais estaduais ponderados por eleitorado.'}

@app.get('/api/adesivaria')
def adesivaria(ano:int=2024,uf:str|None=None,partido:str=Query('',max_length=35),
               cargo:str='VEREADOR',abrangencia:str='',municipio:str='',material:str='todos',
               limit:int=12,offset:int=0,offset_votos:int=0,offset_categorias:int=0):
    from adesivaria import summary
    return summary(ano,uf or '',partido,cargo,abrangencia,municipio,material,limit,offset,offset_votos,offset_categorias)


@app.get('/api/adesivaria/candidatura/{candidate_id}')
def adesivaria_candidate(candidate_id:str,ano:int=2024,uf:str='',partido:str=Query('',max_length=35),
                         cargo:str='VEREADOR',abrangencia:str='',municipio:str='',material:str='todos',
                         limit:int=Query(10,ge=1,le=50),offset:int=Query(0,ge=0,le=1000000)):
    from adesivaria import candidate
    return candidate(candidate_id,ano,uf,partido,cargo,abrangencia,municipio,material,limit,offset)


@app.exception_handler(RuntimeError)
def runtime_error(_,exc:RuntimeError):
    return JSONResponse({'error':'MotherDuck indisponível','reason':'Verifique a conexão e a configuração do servidor.'},status_code=503)


# Pain?is migrados: reutilizam a conex?o configurada deste portal.
from bdr_paineis import main as bdr_paineis

def _consultar_paineis(sql, params=()):
    try:
        with _lock:
            cur = _open().cursor()
            try:
                cur.execute('USE "pipeline_bdr_der_completo_v4".main')
                result = cur.execute(sql, list(params))
                columns = [item[0] for item in result.description]
                return [dict(zip(columns, (float(v) if isinstance(v, Decimal) else v for v in row))) for row in result.fetchall()]
            finally:
                cur.close()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, 'N?o foi poss?vel consultar este recorte do acervo.')

bdr_paineis._consultar = _consultar_paineis
bdr_paineis.BANCO = DB
def _coluna_ano_paineis():
    rows = _consultar_paineis('DESCRIBE "Participacao_Eleitoral"')
    columns = {row['column_name'].lower() for row in rows}
    return 'ano' if 'ano' in columns else 'ano_participacao'

bdr_paineis._obter_coluna_ano = _coluna_ano_paineis
app.include_router(bdr_paineis.app.router, prefix='/api/bdr')

from exhibition import router as exhibition_router
app.include_router(exhibition_router)
from legenda_investigacao import router as legenda_investigacao_router
app.include_router(legenda_investigacao_router)
from contexto import router as contexto_router
app.include_router(contexto_router)
from catalogo import router as catalogo_router
app.include_router(catalogo_router)

from pesquisa import router as pesquisa_router
app.include_router(pesquisa_router)
