"""Read-only research indicators. Aggregation precedes joins; no individual voter data."""
from __future__ import annotations
from pathlib import Path
from datetime import datetime,timezone
import json,math,statistics
from fastapi import APIRouter,HTTPException
from catalogo import BASE,DB,UFS,read,filters,where
from catalog_facets import facet_sql,facet_key

router=APIRouter(prefix='/api/pesquisa',tags=['pesquisa'])
DATA=Path(__file__).parent/'data'
PROPORTIONAL=('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL')
SCHOOLS=[('ANALFABETO','Analfabeto'),('LEEESCREVE','Lê e escreve'),('FUNDAMENTALINCOMPLETO','Fundamental incompleto'),('FUNDAMENTALCOMPLETO','Fundamental completo'),('MEDIOINCOMPLETO','Médio incompleto'),('MEDIOCOMPLETO','Médio completo'),('SUPERIORINCOMPLETO','Superior incompleto'),('SUPERIORCOMPLETO','Superior completo')]

def scope_filter(ano,cargo,uf,partido,municipio):
    return filters(q='',ano=ano,cargo=cargo,uf=uf,partido=partido,municipio=municipio,idade_min=None,idade_max=None,gasto_min=None,gasto_max=None,patrimonio_min=None,patrimonio_max=None)

def percent(a,b):return 100*a/b if b and a is not None else None

def wilson(successes,total):
    if not total:return (None,None)
    p=successes/total;z=1.96;d=1+z*z/total
    mid=(p+z*z/(2*total))/d;half=z*math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d
    return (100*max(0,mid-half),100*min(1,mid+half))

def correlation(rows,x,y):
    pairs=[(r.get(x),r.get(y)) for r in rows if r.get(x) is not None and r.get(y) is not None and math.isfinite(r[x]) and math.isfinite(r[y])]
    if len(pairs)<3:return {'n':len(pairs),'pearson':None,'spearman':None}
    a,b=zip(*pairs)
    def corr(a,b):
        ma=statistics.mean(a);mb=statistics.mean(b);den=math.sqrt(sum((v-ma)**2 for v in a)*sum((v-mb)**2 for v in b))
        return sum((v-ma)*(w-mb) for v,w in zip(a,b))/den if den else None
    def ranks(values):
        ordered=sorted(enumerate(values),key=lambda v:v[1]);out=[0]*len(values);i=0
        while i<len(ordered):
            j=i+1
            while j<len(ordered) and ordered[j][1]==ordered[i][1]:j+=1
            for k in range(i,j):out[ordered[k][0]]=(i+j-1)/2+1
            i=j
        return out
    return {'n':len(pairs),'pearson':corr(a,b),'spearman':corr(ranks(a),ranks(b))}

def candidate_scope(f):
    condition,params=where(f)
    return BASE+', scoped AS (SELECT * FROM b WHERE '+condition+') ',params

def cost(f):
    series={**f,'ano':None};base,params=candidate_scope(series)
    rows=read(base+'''SELECT ano,COUNT(*) candidaturas,COUNT(*) FILTER(WHERE gastos>=0 AND isfinite(gastos)) com_valor,
      COUNT(*) FILTER(WHERE situacao='ELEITO') eleitos,
      SUM(gastos) FILTER(WHERE gastos>=0 AND isfinite(gastos)) total,
      SUM(gastos) FILTER(WHERE gastos>=0 AND isfinite(gastos) AND situacao='ELEITO') gasto_eleitos,
      MEDIAN(gastos) FILTER(WHERE gastos>=0 AND isfinite(gastos) AND situacao='ELEITO') mediana
      FROM scoped GROUP BY ano ORDER BY ano''',params)
    ipca=json.loads((DATA/'ipca.json').read_text()) if (DATA/'ipca.json').exists() else {}
    for row in rows:
        row['grupo']=str(row['ano']);row['valor']=row['total']/row['eleitos'] if row['total'] is not None and row['eleitos'] else None
        row['apenas_eleitos']=row['gasto_eleitos']/row['eleitos'] if row['gasto_eleitos'] is not None and row['eleitos'] else None
        factor=ipca.get('factors',{}).get(str(row['ano']))
        row['corrigido']=row['valor']*factor if factor and row['valor'] is not None else None
    selected=next((r for r in rows if r['ano']==f['ano']),None)
    return dict(rows=rows,summary=selected,unit='money',method='Despesa conhecida de todas as candidaturas ÷ eleitos registrados. Último turno por candidatura. Não é custo por vaga disputada nem estimativa causal. Despesa ausente não é zero.',limitations=['A mediana e o gasto apenas dos eleitos são indicadores distintos. Eleito registrado não comprova mandato exercido.','Valores corrigidos usam IPCA de dezembro a dezembro, base dezembro/2024; é uma convenção para totais anuais, não a data de cada despesa.'],inflation=ipca)

def wealth(f):
    base,params=candidate_scope(f)
    coverage=read(base+'''SELECT COUNT(*) candidaturas,COUNT(*) FILTER(WHERE patrimonio>=0 AND isfinite(patrimonio)) conhecidos,
      COUNT(*) FILTER(WHERE situacao<>'INDEFINIDO') definidos FROM scoped''',params)[0]
    rows=read(base+''' , valid AS (SELECT *,CASE WHEN situacao='ELEITO' THEN 1 ELSE 0 END eleito FROM scoped WHERE patrimonio>=0 AND isfinite(patrimonio) AND situacao<>'INDEFINIDO'),
      cuts AS (SELECT QUANTILE_CONT(patrimonio,.25) q1,QUANTILE_CONT(patrimonio,.5) q2,QUANTILE_CONT(patrimonio,.75) q3 FROM valid WHERE patrimonio>0),
      grouped AS (SELECT *,CASE WHEN patrimonio=0 THEN 0 WHEN patrimonio<=q1 THEN 1 WHEN patrimonio<=q2 THEN 2 WHEN patrimonio<=q3 THEN 3 ELSE 4 END faixa FROM valid CROSS JOIN cuts)
      SELECT faixa,COUNT(*) candidaturas,SUM(eleito) eleitos,MIN(patrimonio) minimo,MAX(patrimonio) maximo,MEDIAN(patrimonio) mediana FROM grouped GROUP BY faixa ORDER BY faixa''',params)
    for row in rows:
        row['grupo']='Zero declarado' if row['faixa']==0 else f"Faixa {row['faixa']} de patrimônio positivo"
        row['valor']=percent(row['eleitos'],row['candidaturas']);row['intervalo_inferior'],row['intervalo_superior']=wilson(row['eleitos'],row['candidaturas']);row['amostra_pequena']=row['candidaturas']<30
    return dict(rows=rows,summary=coverage,unit='percent',method='Taxa = eleitos ÷ candidaturas com resultado definido e patrimônio conhecido. Zero separado; cortes por quartis do patrimônio positivo, com valores empatados na mesma faixa.',limitations=['Associação descritiva, sem estimar efeito causal ou controlar experiência e partido. Faixas podem ter tamanhos diferentes devido a empates.','Intervalos de Wilson de 95% são uma medida descritiva da precisão do grupo, não corrigem seleção nem confundimento.'])

def municipal_data(f):
    if f['cargo'] not in ('VEREADOR','PREFEITO'):raise HTTPException(422,'Esta comparação municipal usa vereador ou prefeito; deputados pertencem à disputa estadual.')
    uf=f['uf'];town=f['municipio'];year=f['ano'];school=facet_sql('grau_instrucao').replace('grau_instrucao','grau_instrucao')
    # School facet removes ENSINO, matching candidate categories.
    school=facet_sql('escolaridade').replace('escolaridade','grau_instrucao')
    return read(f'''WITH profile AS (
      SELECT id_municipio,SUM(quantidade_eleitores) eleitores,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria NOT IN ('INVÁLIDA','INVÁLIDO')) idade_conhecida,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria IN ('16 ANOS','17 ANOS')) jovens_16_17,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria IN ('18 ANOS','19 ANOS','20 ANOS','21 A 24 ANOS')) jovens_18_24,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria='25 A 29 ANOS') jovens_25_29,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria NOT IN ('16 ANOS','17 ANOS','INVÁLIDA','INVÁLIDO') AND ({school}) IN ('ANALFABETO','LEEESCREVE','FUNDAMENTALINCOMPLETO','FUNDAMENTALCOMPLETO','MEDIOINCOMPLETO','MEDIOCOMPLETO','SUPERIORINCOMPLETO','SUPERIORCOMPLETO')) instrucao_conhecida_18,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria NOT IN ('16 ANOS','17 ANOS','INVÁLIDA','INVÁLIDO') AND ({school})='SUPERIORCOMPLETO') superior_18,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria IN ('INVÁLIDA','INVÁLIDO')) idade_invalida
      FROM {DB}.main.Perfil_Eleitorado_Municipio WHERE ano=? GROUP BY id_municipio
    ), turnout AS (
      SELECT id_municipio,MAX(eleitorado_apto) aptos,MAX(abstencoes) abstencoes,
      COUNT(DISTINCT eleitorado_apto) denominadores,COUNT(DISTINCT abstencoes) numeradores
      FROM {DB}.main.Participacao_Eleitoral WHERE ano_participacao=? AND (cargo IS NULL OR UPPER(cargo)=?) GROUP BY id_municipio
    ), votes AS (
      SELECT v.id_municipio,SUM(v.votos_nominais+v.votos_legenda) votos,
      SUM(v.votos_nominais+v.votos_legenda) FILTER(WHERE p.sigla=?) votos_partido
      FROM {DB}.main.Votos_Partido_Municipio v JOIN {DB}.main.Eleicao e USING(id_eleicao)
      JOIN {DB}.main.Partido p USING(id_partido) WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND v.turno=1
      AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' GROUP BY v.id_municipio
    ) SELECT m.id_municipio id,m.nome,m.uf,p.*,t.aptos,t.denominadores,t.numeradores,
      CASE WHEN t.denominadores=1 AND t.numeradores=1 AND t.aptos>0 THEN 100.0*t.abstencoes/t.aptos END abstencao,
      CASE WHEN v.votos>0 AND ?<>'' THEN 100.0*COALESCE(v.votos_partido,0)/v.votos END participacao_partido,
      c.populacao,c10.idhm,c.idade_mediana,c.indice_envelhecimento
      FROM {DB}.main.Municipio m LEFT JOIN profile p USING(id_municipio) LEFT JOIN turnout t USING(id_municipio)
      LEFT JOIN votes v USING(id_municipio) LEFT JOIN {DB}.main.Censo_Municipio c ON c.id_municipio=m.id_municipio AND c.ano_referencia=2022
      LEFT JOIN {DB}.main.Censo_Municipio c10 ON c10.id_municipio=m.id_municipio AND c10.ano_referencia=2010
      WHERE m.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR m.uf=?) AND (?='' OR m.id_municipio=?) ORDER BY m.uf,m.nome''',
      [year,year,f['cargo'],f['partido'],year,f['cargo'],f['partido'],uf,uf,town,town])

def territory(f,metric,target):
    rows=municipal_data(f)
    if metric not in ('populacao','idhm','idade_mediana','indice_envelhecimento'):raise HTTPException(422,'Indicador territorial inválido.')
    if target not in ('abstencao','participacao_partido'):raise HTTPException(422,'Resultado territorial inválido.')
    for row in rows:row['x']=row.get(metric);row['y']=row.get(target)
    corr=correlation(rows,'x','y')
    return dict(rows=rows,summary=corr,unit='scatter',x_label={'populacao':'População residente · 2022','idhm':'IDHM · referência 2010','idade_mediana':'Idade mediana da população · 2022','indice_envelhecimento':'Índice de envelhecimento · 2022'}[metric],y_label='Abstenção (%)' if target=='abstencao' else 'Participação partidária nos votos (%)',method='Uma observação por município. Votos nominais + legenda do primeiro turno; participação da legenda no total do mesmo cargo. Pearson e Spearman sobre pares completos.',limitations=['Associação territorial, não preferência individual nem causalidade. Referência censitária fixa, sem afirmar que descreve a situação de todos os anos.','PIB não foi usado porque a unidade armazenada ainda precisa de validação. Abstenção é municipal/ano; a tabela não identifica cargo ou turno. Numerador/denominador conflitante não recebe taxa.','Sem partido escolhido, não se calcula participação partidária.'])

def electorate(f,question,youth,universe):
    if f['ano'] not in (2018,2020,2022,2024):raise HTTPException(422,'Perfil do eleitorado disponível de 2018 a 2024 em anos eleitorais.')
    # 2022 reconciliation is unresolved: do not publish a derived interpretation.
    if f['ano']!=2024:return dict(rows=[],summary=None,unit='percent',status='em_validacao',method='Perfil disponível, mas a reconciliação histórica ainda não foi liberada.',limitations=['2022 diverge da participação em 1.215 municípios; 2018 e 2020 não possuem reconciliação correspondente nesta tabela. Use 2024 para a comparação validada.'])
    rows=municipal_data(f)
    if question==6:
        if youth not in ('16_17','18_24','16_24','16_29'):raise HTTPException(422,'Faixa jovem inválida.')
        for r in rows:
            a=r.get('jovens_16_17') or 0;b=r.get('jovens_18_24') or 0;c=r.get('jovens_25_29') or 0
            r['jovens']={'16_17':a,'18_24':b,'16_24':a+b,'16_29':a+b+c}[youth]
            r['x']=percent(r['jovens'],r.get('idade_conhecida'));r['y']=r.get('participacao_partido') if f['partido'] else r.get('abstencao')
        corr=correlation(rows,'x','y')
        return dict(rows=rows,summary=corr,unit='scatter',x_label='Eleitorado jovem · '+youth.replace('_','–')+' anos (%)',y_label='Participação partidária (%)' if f['partido'] else 'Abstenção (%)',method='Participação jovem sobre eleitores de idade conhecida; cruzamento municipal com votação do partido selecionado ou abstenção. Faixas inválidas excluídas do denominador e informadas nas fichas.',limitations=['Não revela em quem os jovens votaram. O voto individual não está disponível.','Perfil e participação reconciliados para 2024; dados de outros anos permanecem em validação.'])
    if universe not in ('todos','18mais'):raise HTTPException(422,'Universo etário inválido.')
    base,params=candidate_scope(f);school=facet_sql('escolaridade')
    cand=read(base+f'''SELECT municipio_id,COUNT(*) candidaturas,
      COUNT(*) FILTER(WHERE ({school}) IN ('ANALFABETO','LEEESCREVE','FUNDAMENTALINCOMPLETO','FUNDAMENTALCOMPLETO','MEDIOINCOMPLETO','MEDIOCOMPLETO','SUPERIORINCOMPLETO','SUPERIORCOMPLETO')) conhecidos,
      COUNT(*) FILTER(WHERE ({school})='SUPERIORCOMPLETO') superior FROM scoped GROUP BY municipio_id''',params)
    byid={r['municipio_id']:r for r in cand}
    for row in rows:
        c=byid.get(row['id'],{});row['candidaturas']=c.get('candidaturas',0);row['candidatos_conhecidos']=c.get('conhecidos',0)
        row['x']=percent(row.get('superior_18'),row.get('instrucao_conhecida_18'));row['y']=percent(c.get('superior'),c.get('conhecidos'));row['diferenca_pp']=row['y']-row['x'] if row['x'] is not None and row['y'] is not None else None
    age="AND faixa_etaria NOT IN ('16 ANOS','17 ANOS','INVÁLIDA','INVÁLIDO')" if universe=='18mais' else ''
    # Compare complete distributions, using the same harmonized school keys.
    profile_school=facet_sql('escolaridade').replace('escolaridade','grau_instrucao')
    p=read(f'''SELECT ({profile_school}) chave,SUM(quantidade_eleitores) quantidade FROM {DB}.main.Perfil_Eleitorado_Municipio p JOIN {DB}.main.Municipio m USING(id_municipio)
      WHERE p.ano=? {age} AND (?='' OR m.uf=?) AND (?='' OR p.id_municipio=?) GROUP BY 1''',[f['ano'],f['uf'],f['uf'],f['municipio'],f['municipio']])
    c=read(base+f'SELECT ({school}) chave,COUNT(*) quantidade FROM scoped GROUP BY 1',params)
    pm={r['chave']:r['quantidade'] for r in p};cm={r['chave']:r['quantidade'] for r in c};valid={k for k,_ in SCHOOLS};pt=sum(v for k,v in pm.items() if k in valid);ct=sum(v for k,v in cm.items() if k in valid)
    distribution=[{'grupo':label,'eleitores':pm.get(k,0),'candidatos':cm.get(k,0),'valor':percent(cm.get(k,0),ct),'referencia':percent(pm.get(k,0),pt)} for k,label in SCHOOLS]
    return dict(rows=distribution,points=rows,summary={'eleitores_conhecidos':pt,'candidatos_conhecidos':ct,'eleitores_excluidos':sum(pm.values())-pt,'candidatos_excluidos':sum(cm.values())-ct,**correlation(rows,'x','y')},unit='distribution',x_label='Eleitores 18+ com superior completo (%)',y_label='Candidatos com superior completo (%)',method='Escolaridade harmonizada: percentuais entre categorias conhecidas. Distribuição do eleitorado '+('18 anos ou mais' if universe=='18mais' else 'de todas as idades')+'. Dispersão sempre compara eleitores 18+ e candidaturas municipais.',limitations=['Eleitorado não equivale à população residente. Categorias não informadas/não divulgáveis não entram no denominador conhecido.','A comparação educacional da população residente depende de integração específica do IBGE; a demografia populacional usa idade mediana e envelhecimento de 2022 nas fichas municipais.','Partido restringe os candidatos, não o eleitorado de referência; idade mínima e composição dos dois universos diferem.'])

def party_series(f,question,historico=False):
    if f['cargo'] not in PROPORTIONAL:raise HTTPException(422,'A série de votos de legenda usa cargos proporcionais.')
    votes=read(f'''SELECT e.ano,v.id_municipio,m.nome,m.uf,p.sigla partido,SUM(v.votos_nominais) nominais,SUM(v.votos_legenda) legenda
      FROM {DB}.main.Votos_Partido_Municipio v JOIN {DB}.main.Eleicao e USING(id_eleicao) JOIN {DB}.main.Municipio m USING(id_municipio) JOIN {DB}.main.Partido p USING(id_partido)
      WHERE e.ano BETWEEN 2002 AND 2024 AND UPPER(e.cargo)=? AND e.turno=1 AND v.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND m.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR m.uf=?) AND (?='' OR m.id_municipio=?) GROUP BY ALL ORDER BY e.ano,m.uf,m.nome,p.sigla''',[f['cargo'],f['uf'],f['uf'],f['municipio'],f['municipio']])
    if question==5:
        agg={}
        from party_events import canonical_party
        for r in votes:
            matches=canonical_party(r['partido'],r['ano'])==canonical_party(f['partido'],f['ano']) if historico else r['partido']==f['partido']
            if f['partido'] and not matches:continue
            label=canonical_party(r['partido'],r['ano']) if historico else r['partido']
            label=label if f['partido'] else 'Todos os partidos'
            k=(r['ano'],label)
            a=agg.setdefault(k,{'ano':r['ano'],'partido':label,'nominais':0,'legenda':0,'registros':0,'incompletos':0})
            a['registros']+=1
            observed=a.setdefault('siglas_observadas',[])
            if r['partido'] not in observed:observed.append(r['partido'])
            if r['nominais'] is None or r['legenda'] is None:a['incompletos']+=1;continue
            a['nominais']+=r['nominais'];a['legenda']+=r['legenda']
        rows=[]
        for a in agg.values():
            a['siglas_observadas']=', '.join(str(v) for v in a.get('siglas_observadas',[]))
            a['grupo']=str(a['ano'])+' · '+(a['partido'] or 'Sem sigla');a['total']=a['nominais']+a['legenda'];a['valor']=percent(a['legenda'],a['total']) if not a['incompletos'] else None;rows.append(a)
        return dict(rows=rows,summary={'anos':len({r['ano'] for r in rows}),'registros':len(votes)},unit='percent',method='Votos de legenda ÷ (nominais + legenda), contagens agregadas antes da divisão; mesmo cargo e primeiro turno. Siglas originais ou renomeações harmonizadas conforme a opção; fusões permanecem separadas.',limitations=['Ausência de dado não é zero. Uma série com células incompletas não recebe percentual.','Mudanças de nome, fusões e incorporações precisam ser lidas no histórico da legenda; séries não são coladas automaticamente.'])
    from party_events import canonical_party,transition_kind
    grouped={}
    for r in votes:
        if r['nominais'] is None or r['legenda'] is None:continue
        key=(r['ano'],r['id_municipio']);g=grouped.setdefault(key,{'nome':r['nome'],'uf':r['uf'],'votes':{}});label=canonical_party(r['partido'],r['ano']);g['votes'][label]=g['votes'].get(label,0)+r['nominais']+r['legenda']
    pairs=[];previous={}
    for (year,town),g in sorted(grouped.items()):
        total=sum(g['votes'].values())
        if total<=0:continue
        maximum=max(g['votes'].values());leaders=[p for p,v in g['votes'].items() if v==maximum];shares={p:100*v/total for p,v in g['votes'].items()};old=previous.get(town)
        if old and year-old['year']==4:
            changes=sum(abs(shares.get(p,0)-old['shares'].get(p,0)) for p in set(shares)|set(old['shares']))/2
            kind=transition_kind(old['leader'],leaders[0],year) if len(leaders)==1 and old['leader'] else 'Empate'
            pairs.append({'id':str(town)+':'+str(year),'municipio_id':town,'nome':g['nome'],'uf':g['uf'],'inicio':old['year'],'ano':year,'origem':old['leader'] or 'Empate','destino':leaders[0] if len(leaders)==1 else 'Empate','evento':kind,'valor':changes,'concentracao':sum((v/100)**2 for v in shares.values())})
        previous[town]={'year':year,'shares':shares,'leader':leaders[0] if len(leaders)==1 else None}
    selected=[r for r in pairs if r['ano']==f['ano']]
    counts={label:sum(r['evento']==label for r in selected) for label in ('Mesma organização','Mudança entre organizações','Fusão/incorporação','Empate')}
    return dict(rows=selected,series=[{'grupo':str(y),'valor':statistics.mean(r['valor'] for r in pairs if r['ano']==y),'municipios':sum(r['ano']==y for r in pairs)} for y in sorted({r['ano'] for r in pairs})],summary=counts,unit='volatility',method='Volatilidade = metade da soma das variações absolutas das parcelas partidárias (p.p.), em pares separados por quatro anos. Renomeações harmonizadas; fusões/incorporações identificadas como eventos.',limitations=['Mudanças associadas a fusão/incorporação não são migração individual nem prova de mudança de preferência.','Orientação é distribuição partidária; não há classificação ideológica validada. Cores não representam esquerda ou direita.','Volatilidade pode refletir eventos partidários e candidaturas. Empates recebem categoria própria. Séries usam pares completos, não eleições suplementares.'])

def trajectories(f):
    from party_events import RENAMES,EVENTS,transition_kind
    cohort={**f,'ano':None};base,params=candidate_scope(cohort)
    mapping="CASE WHEN partido='PL' AND ano<2006 THEN 'PL-HISTORICO' WHEN partido='PR' THEN 'PL' WHEN partido='PSD' AND ano<2011 THEN 'PSD-HISTORICO' "+' '.join("WHEN partido='"+old+"' THEN '"+new+"'" for old,new in RENAMES.items())+" ELSE partido END"
    labels=set(EVENTS)|{v[0] for v in EVENTS.values()}
    events=[]
    for old in labels:
        for new in labels:
            for year in (2003,2006,2007,2019,2022,2023):
                if transition_kind(old,new,year)=='Fusão/incorporação':
                    events.append("(anterior_partido='"+old+"' AND organizacao='"+new+"' AND ano>="+str(year)+")");break
    event=' OR '.join(events) or 'FALSE'
    rows=read(base+f""", safe AS (SELECT id_candidato FROM {DB}.main.Candidato GROUP BY id_candidato HAVING COUNT(DISTINCT dt_nascimento)<=1 AND COUNT(DISTINCT NULLIF(TRIM(titulo_eleitoral),''))<=1),
      cohort AS (SELECT DISTINCT id_candidato FROM scoped JOIN safe USING(id_candidato)),
      history AS (SELECT b.*,({mapping}) organizacao FROM b JOIN cohort USING(id_candidato)),
      offices AS (SELECT id_candidato,COUNT(DISTINCT cargo) cargos FROM history GROUP BY id_candidato),
      dedup AS (SELECT * FROM history QUALIFY ROW_NUMBER() OVER(PARTITION BY id_candidato,ano ORDER BY id)=1),
      lags AS (SELECT *,LAG(ano) OVER(PARTITION BY id_candidato ORDER BY ano) anterior,LAG(organizacao) OVER(PARTITION BY id_candidato ORDER BY ano) anterior_partido FROM dedup),
      people AS (SELECT id_candidato,COUNT(*) participacoes,COUNT(*) FILTER(WHERE anterior IS NOT NULL AND ano-anterior>4) intervalos,
        COUNT(*) FILTER(WHERE anterior IS NOT NULL AND ano-anterior<=4) consecutivas,
        MAX(CASE WHEN anterior_partido IS NOT NULL AND organizacao IS NOT NULL AND anterior_partido<>organizacao AND NOT ({event}) THEN 1 ELSE 0 END) mudanca_organizacional,
        COUNT(*) FILTER(WHERE situacao='ELEITO') vitorias,MIN(ano) primeiro,MAX(ano) ultimo FROM lags GROUP BY id_candidato)
      SELECT CASE WHEN participacoes=1 THEN 'Uma eleição observada' WHEN intervalos>0 THEN 'Retorno com intervalo maior que quatro anos' ELSE 'Sequência sem intervalo maior que quatro anos' END grupo,
      COUNT(*) pessoas,COUNT(*) FILTER(WHERE vitorias>0) com_vitoria,COUNT(*) FILTER(WHERE cargos>1) mais_de_um_cargo,SUM(mudanca_organizacional) mudanca_organizacional,MIN(primeiro) primeiro,MAX(ultimo) ultimo
      FROM people JOIN offices USING(id_candidato) GROUP BY 1 ORDER BY 1""",params)
    total=sum(r['pessoas'] for r in rows)
    for row in rows:row['valor']=percent(row['pessoas'],total)
    return dict(rows=rows,summary={'pessoas':total,'mais_de_um_cargo':sum(r['mais_de_um_cargo'] for r in rows),'mudanca_organizacional':sum(r['mudanca_organizacional'] for r in rows)},unit='percent',method='Coorte: pessoas que passaram pelo cargo, partido e território selecionados em qualquer ano. Histórico: todos os cargos e territórios dessas pessoas nas seis UFs entre 2002 e 2024. Uma pessoa por identidade consistente; categorias de frequência mutuamente exclusivas.',limitations=['Primeiro/último registro do acervo não provam estreia ou encerramento de carreira. Candidaturas não são mandatos exercidos.','Intervalo é ausência de candidatura observada por mais de quatro anos, uma definição operacional; não comprova interrupção da atividade política.','Mais de um cargo e mudança organizacional são indicadores adicionais que podem se sobrepor. Renomeações e eventos conhecidos de fusão/incorporação não contam como mudança entre organizações.','Para ordenar as transições, usa-se um registro estável por pessoa/ano; todas as combinações de cargo continuam nas fichas individuais.'])

def financing(f):
    path=DATA/'receitas-candidatos.parquet';manifest=DATA/'receitas-manifest.json'
    if not path.exists() or not manifest.exists():return dict(rows=[],summary=None,status='fonte_pendente',unit='percent',method='Receitas do TSE ainda não importadas.',limitations=['Não se infere origem a partir de despesa.'])
    import duckdb
    provenance=json.loads(manifest.read_text(encoding='utf8'));year=provenance['years'].get(str(f['ano']),{})
    if year.get('status')!='loaded':return dict(rows=[],summary=None,status='fonte_pendente',unit='percent',method='Receitas ainda não disponíveis para o ano selecionado.',limitations=[year.get('error','Escolha um ano importado.')],provenance=provenance)
    with duckdb.connect(':memory:') as con:
        result=con.execute('SELECT * FROM read_parquet(?) WHERE ano=?',[str(path),f['ano']]);keys=[c[0] for c in result.description];receipts={(str(r[1]).lstrip('0'),r[2],r[3].upper()):dict(zip(keys,r)) for r in result.fetchall()}
    base,params=candidate_scope(f)
    candidates=read(base+'SELECT sequencial,uf,cargo,situacao,municipio_id,municipio FROM scoped',params)
    locations={}
    groups={};matched=positive=0;totals={'publico':0.,'privado':0.,'nao_classificado':0.}
    for c in candidates:
        loc=locations.setdefault(c['municipio_id'],{'id':c['municipio_id'],'nome':c['municipio'],'uf':c['uf'],'candidaturas':0,'vinculadas':0,'receita':0.,'publico':0.,'nao_classificado':0.}) if c.get('municipio_id') else None
        if loc is not None:loc['candidaturas']+=1
        r=receipts.get((str(c['sequencial']).lstrip('0'),c['uf'],c['cargo'].upper()))
        if not r:continue
        matched+=1
        if loc is not None:
            loc['vinculadas']+=1
            for key,source in [('receita','total'),('publico','publico'),('nao_classificado','nao_classificado')]:loc[key]+=float(r[source])
        for k in totals:totals[k]+=float(r[k])
        total=float(r['total'])
        if total<=0:continue
        positive+=1
        share=float(r['publico'])/total
        group='Origem incompleta' if r['nao_classificado'] else 'Sem fundos públicos' if share==0 else 'Até 25% público' if share<=.25 else '25% a 50% público' if share<=.5 else '50% a 75% público' if share<=.75 else 'Mais de 75% público'
        a=groups.setdefault(group,{'grupo':group,'candidaturas':0,'definidos':0,'eleitos':0,'recebido':0.})
        a['candidaturas']+=1;a['recebido']+=total
        if c['situacao']!='INDEFINIDO':a['definidos']+=1;a['eleitos']+=int(c['situacao']=='ELEITO')
    if not matched:totals={k:None for k in totals}
    order=['Sem fundos públicos','Até 25% público','25% a 50% público','50% a 75% público','Mais de 75% público','Origem incompleta'];rows=[groups[k] for k in order if k in groups]
    for row in rows:row['valor']=percent(row['eleitos'],row['definidos']);row['intervalo_inferior'],row['intervalo_superior']=wilson(row['eleitos'],row['definidos'])
    for loc in locations.values():loc['valor']=percent(loc['publico'],loc['receita']) if not loc['nao_classificado'] else None
    return dict(rows=rows,points=list(locations.values()),summary={'candidaturas':len(candidates),'com_receita_final':matched,'com_receita_positiva':positive,**totals},unit='percent',status='parcial',method=provenance['method'],provenance=year,limitations=['Outros recursos é a origem não pública declarada no TSE; transferências não são rastreadas por uma cadeia de doadores nesta análise. Não afirmar origem última de repasses.','A análise usa apenas receitas financeiras finais. Não há conciliação independente com extratos bancários e eventuais devoluções; é uma resposta descritiva parcial, não auditoria contábil.','Vínculo por sequencial, ano, UF e cargo. Sem correspondência é ausência, não receita zero. Associação não isola tamanho do financiamento, experiência ou partido.'])

@router.get('/{question}')
def research(question:int,ano:int=2024,cargo:str='VEREADOR',uf:str='',partido:str='',municipio:str='',metric:str='populacao',target:str='abstencao',youth:str='16_24',universe:str='18mais',historico:str='0'):
    if historico not in ('0','1'):raise HTTPException(422,'Opção de histórico inválida.')
    if question not in (1,2,3,4,5,6,7,8,10):raise HTTPException(422,'Pergunta não atendida por este endpoint.')
    f=scope_filter(ano,cargo,uf,partido,municipio)
    if question==1:data=cost(f)
    elif question==2:data=wealth(f)
    elif question==3:data=territory(f,metric,target)
    elif question in (4,6):data=electorate(f,question,youth,universe)
    elif question in (5,7):data=party_series(f,question,historico=='1')
    elif question==8:data=financing(f)
    else:data=trajectories(f)
    return {'question':question,'scope':{k:v for k,v in f.items() if k in ('ano','cargo','uf','partido','municipio')},'settings':{'metric':metric,'target':target,'youth':youth,'universe':universe,'historico':historico},'source':'live','database':DB,'extracted_at':datetime.now(timezone.utc).isoformat(),'status':'disponivel',**data}


@router.get('/{question}/municipios')
def research_municipalities(question:int,ano:int=2024,cargo:str='VEREADOR',uf:str='',partido:str='',municipio:str=''):
    f=scope_filter(ano,cargo,uf,partido,municipio)
    if cargo not in ('VEREADOR','PREFEITO'):raise HTTPException(422,'O mapa de candidaturas requer cargo municipal; cadeiras de deputados pertencem à UF.')
    if question==8:
        result=financing(f)
        return {'rows':result.get('points',[]),'method':'Parcela pública nas receitas financeiras vinculadas. Ausência de vínculo e origem incompleta não são zero.','source':'live'}
    if question==5:
        if cargo!='VEREADOR':raise HTTPException(422,'Voto de legenda municipal disponível para vereador.')
        rows=read(f"""SELECT m.id_municipio id,m.nome,m.uf,SUM(v.votos_nominais+v.votos_legenda) total,
          SUM(CASE WHEN ?='' OR p.sigla=? THEN v.votos_legenda ELSE 0 END) legenda,
          SUM(CASE WHEN ?='' OR p.sigla=? THEN v.votos_nominais+v.votos_legenda ELSE 0 END) total_selecionado,
          COUNT(*) FILTER(WHERE v.votos_nominais IS NULL OR v.votos_legenda IS NULL) incompletos
          FROM {DB}.main.Votos_Partido_Municipio v JOIN {DB}.main.Eleicao e USING(id_eleicao) JOIN {DB}.main.Municipio m USING(id_municipio) JOIN {DB}.main.Partido p USING(id_partido)
          WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND v.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
          AND m.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR m.uf=?) AND (?='' OR m.id_municipio=?) GROUP BY 1,2,3 ORDER BY m.nome""",[partido,partido,partido,partido,ano,cargo,uf,uf,municipio,municipio])
        for row in rows:row['valor']=percent(row['legenda'],row['total_selecionado']) if not row['incompletos'] else None
        return {'rows':rows,'source':'live','method':'Votos de legenda da sigla selecionada ÷ votos nominais + legenda da mesma sigla e disputa. Sem sigla, agregado de todos os partidos. Siglas originais, sem harmonização nesta visão territorial.'}
    if question not in (1,2):raise HTTPException(422,'Mapa não disponível para esta pergunta neste endpoint.')
    base,params=candidate_scope(f)
    rows=read(base+"""SELECT municipio_id id,municipio nome,uf,COUNT(*) candidaturas,
      COUNT(*) FILTER(WHERE gastos>=0 AND isfinite(gastos)) com_despesa,
      SUM(gastos) FILTER(WHERE gastos>=0 AND isfinite(gastos)) despesas,
      COUNT(*) FILTER(WHERE situacao='ELEITO') eleitos,
      MEDIAN(patrimonio) FILTER(WHERE patrimonio>=0 AND isfinite(patrimonio)) patrimonio_mediano,
      COUNT(*) FILTER(WHERE patrimonio>=0 AND isfinite(patrimonio)) patrimonio_conhecido,
      COUNT(*) FILTER(WHERE patrimonio>=0 AND isfinite(patrimonio) AND situacao<>'INDEFINIDO') definidos_com_patrimonio,
      COUNT(*) FILTER(WHERE patrimonio>=0 AND isfinite(patrimonio) AND situacao='ELEITO') eleitos_com_patrimonio
      FROM scoped GROUP BY 1,2,3 ORDER BY municipio""",params)
    for row in rows:
        row['gasto_por_eleito']=row['despesas']/row['eleitos'] if row['eleitos'] and row['despesas'] is not None else None
        row['taxa_eleicao']=percent(row['eleitos_com_patrimonio'],row['definidos_com_patrimonio'])
        row['valor']=row['gasto_por_eleito'] if question==1 else row['patrimonio_mediano']
    return {'rows':rows,'source':'live','method':'Agregação municipal no mesmo ano, cargo e sigla. Gastos e patrimônio conhecidos; ausência não equivale a zero. Taxa entre resultados definidos com patrimônio conhecido.'}
