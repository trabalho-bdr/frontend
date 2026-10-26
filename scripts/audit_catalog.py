"""Read-only schema and quality checks; never prints personal identifiers."""
from pathlib import Path
import sys,json
from dotenv import load_dotenv
root=Path(__file__).resolve().parents[1]
load_dotenv(root/'server/.env');sys.path.insert(0,str(root/'server'))
import app
db=app.DB
queries={
 'schema':"SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_catalog=current_database() AND table_name IN ('Foto_Candidato','Perfil_Eleitorado_Municipio','Candidato','Candidatura','Cargo','Eleicao','Municipio','Resultado_Candidatura','Patrimonio_Candidato','Despesa_Candidatura','Censo_Municipio','Participacao_Eleitoral','Partido','Votos_Partido_Municipio') ORDER BY table_name,ordinal_position",
 'photos':f'''SELECT COUNT(*) registros,COUNT(DISTINCT id_candidato) pessoas,
 COUNT(*) FILTER(WHERE tamanho_bytes>0 AND largura>0 AND altura>0) com_metadados,
 COUNT(*) FILTER(WHERE regexp_matches(url_fonte,'^https://([^/]+[.])?tse[.]jus[.]br/')) fonte_tse,
 MIN(ano_foto) primeiro_ano,MAX(ano_foto) ultimo_ano FROM {db}.main.Foto_Candidato''',
 'photo_links':f'''SELECT COUNT(*) fotos_vinculadas FROM {db}.main.Foto_Candidato f WHERE EXISTS
 (SELECT 1 FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
 WHERE c.id_candidato=f.id_candidato AND e.ano=f.ano_foto AND c.uf=f.uf AND c.sequencial=f.sq_candidato)''',
 'identity':f'''SELECT COUNT(*) ids_conflitantes FROM (SELECT id_candidato FROM {db}.main.Candidato GROUP BY 1
 HAVING COUNT(DISTINCT NULLIF(TRIM(titulo_eleitoral),''))>1 OR COUNT(DISTINCT dt_nascimento)>1)''',
 'electorate':f'''SELECT ano,COUNT(*) registros,COUNT(DISTINCT id_municipio) municipios,
 COUNT(*) FILTER(WHERE quantidade_eleitores IS NULL OR quantidade_eleitores<0) invalidos,
 COUNT(DISTINCT fonte) fontes,COUNT(DISTINCT data_geracao) geracoes FROM {db}.main.Perfil_Eleitorado_Municipio GROUP BY ano ORDER BY ano''',
 'electorate_duplicates':f'''SELECT COUNT(*) grupos_duplicados FROM (SELECT id_municipio,ano,faixa_etaria,genero,grau_instrucao,COUNT(*) n FROM {db}.main.Perfil_Eleitorado_Municipio GROUP BY ALL HAVING COUNT(*)>1)''',
}
report={'database':db,'read_only':True,'checks':{}}
for key,sql in queries.items():
 try:report['checks'][key]={'sql':sql,'rows':app._rows(sql)}
 except Exception as exc:report['checks'][key]={'error_type':type(exc).__name__}
 print(key,json.dumps(report['checks'][key].get('rows',report['checks'][key]),ensure_ascii=True) if key!='schema' else 'inspected',flush=True)
report['success']=all('rows' in value for value in report['checks'].values())
(root/'artifacts/catalog-schema-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
if not report['success']:sys.exit(1)
