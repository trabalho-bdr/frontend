"""Exercise the current application against the real read-only MotherDuck database."""
from pathlib import Path
import sys,json,time
from dotenv import load_dotenv
from fastapi.testclient import TestClient
root=Path(__file__).resolve().parents[1];load_dotenv(root/'server/.env');sys.path.insert(0,str(root/'server'))
import app
report={'database':app.DB,'read_only':True,'checks':[],'queries':[]}
original=app._rows
def audited(sql,params=()):
 report['queries'].append({'sql':sql,'parameters':list(params)})
 return original(sql,params)
app._rows=audited
def check(client,path):
 start=time.monotonic();r=client.get('/api/catalogo/'+path)
 try:body=r.json()
 except Exception:body={'bytes':len(r.content),'mime':r.headers.get('content-type')}
 report['checks'].append({'path':'/api/catalogo/'+path,'status':r.status_code,'elapsed_seconds':round(time.monotonic()-start,2),'response':body})
 print(path,r.status_code,round(time.monotonic()-start,2),flush=True)
 return body
try:
 with TestClient(app.app,raise_server_exceptions=False) as client:
  check(client,'opcoes');check(client,'opcoes?ano=2024&uf=CE&cargo=VEREADOR');check(client,'estados')
  towns=check(client,'estados/CE/municipios?q=Fortaleza');municipio=towns['rows'][0]['id']
  check(client,'municipios/'+str(municipio)+'?ano=2024&cargo=VEREADOR')
  results=check(client,'candidaturas?ano=2024&cargo=VEREADOR&uf=CE&municipio='+str(municipio)+'&limit=4&ordem=votos')
  candidate=results['rows'][0]
  check(client,'pessoas/'+candidate['id_candidato']+'?candidatura='+candidate['id'])
  check(client,'candidaturas/'+candidate['id'])
  if candidate.get('foto_url'):check(client,'fotos/'+candidate['id'])
  check(client,'candidaturas?q=MARIA&limit=3&offset=3')
  check(client,'candidaturas?ano=2002&cargo=DEPUTADO%20ESTADUAL&uf=CE&limit=3')
  check(client,'candidaturas?ano=2024&cargo=VEREADOR&uf=CE&municipio='+str(municipio)+'&resultado=ELEITO&gasto_min=0&escolaridade=SUPERIOR%20COMPLETO&limit=3')
except Exception as exc:report['error_type']=type(exc).__name__;print(type(exc).__name__,flush=True)
report['success']=bool(report['checks']) and all(r['status']==200 for r in report['checks']) and 'error_type' not in report
(root/'artifacts/catalog-live-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
if not report['success']:sys.exit(1)
