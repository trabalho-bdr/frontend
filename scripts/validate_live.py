"""Read-only validation through the actual backend connection. No secrets in output."""
import json
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / 'server/.env')
sys.path.insert(0, str(ROOT / 'server'))
import app
from fastapi.testclient import TestClient

paths = ['/api/diagnostico', '/api/indicadores/resultado?uf=CE',
         '/api/indicadores/gastos?uf=CE', '/api/indicadores/patrimonio?uf=CE', '/api/indicadores/trajetorias',
         '/api/exposicao/escolaridade?uf=CE', '/api/exposicao/continuidade?uf=CE',
         '/api/exposicao/territorio?uf=CE', '/api/exposicao/transicoes?uf=CE',
         '/api/legenda-investigacao/serie?cargo=VEREADOR',
         '/api/adesivaria?ano=2024&cargo=VEREADOR&uf=CE',
         '/api/questao1/eleitos?ano=2022&cargo=DEPUTADO%20FEDERAL&uf=CE',
         '/api/contexto/opcoes?ano=2024&cargo=VEREADOR&uf=CE',
         '/api/exposicao/patrimonio?uf=CE&municipio=2304400&partido=PT',
         '/api/exposicao/partidos?uf=CE&municipio=2304400&partido=PT',
         '/api/exposicao/gastos?uf=CE&municipio=2304400&partido=PT',
         '/api/exposicao/proporcional?uf=CE&municipio=2304400',
         '/api/bdr/legenda/opcoes', '/api/q2/municipios?ano=2024&cargo=VEREADOR&uf=CE',
         '/api/bdr/q9/despesas?ano=2024&cargo=VEREADOR&uf=CE']

report = {'database':'pipeline_bdr_der_completo_v4', 'read_only':True, 'checks':[]}
report['queries']=[]
original_read=app._rows
def audited_read(sql,params=()):
    report['queries'].append({'sql':sql,'parameters':list(params)})
    return original_read(sql,params)
app._rows=audited_read
try:
    report['schema'] = app._rows("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_catalog=current_database() ORDER BY table_name,ordinal_position")
    with TestClient(app.app, raise_server_exceptions=False) as client:
        for path in paths:
            r = client.get(path)
            try: data = r.json()
            except ValueError: data = {'error':'Invalid response'}
            report['checks'].append({'path':path,'status':r.status_code,'response':data})
            print(path, r.status_code, flush=True)
        elected=next((check['response'].get('rows',[]) for check in report['checks'] if '/questao1/eleitos' in check['path']),[])
        if elected:
            path='/api/exposicao/trajetoria/'+elected[0]['id']
            r=client.get(path)
            report['checks'].append({'path':path,'status':r.status_code,'response':r.json()})
            print(path,r.status_code,flush=True)
except Exception as exc:
    import traceback
    traceback.print_exc()
    report['connection_error_type'] = type(exc).__name__
    print('Connection failed:',type(exc).__name__,str(exc), flush=True)
out = ROOT/'artifacts/live-validation.json'
report['success']=bool(report.get('schema')) and bool(report['checks']) and all(check['status']==200 for check in report['checks'])
out.write_text(json.dumps(report,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
print('Report:',out)
if not report['success']:
    sys.exit(1)
