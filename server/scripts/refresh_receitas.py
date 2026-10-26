from remote_receipts import RemoteZip
import urllib.request,json,zipfile,csv,io,collections,pathlib,hashlib,unicodedata,datetime
from decimal import Decimal,InvalidOperation
import duckdb
ROOT=pathlib.Path(__file__).resolve().parents[1]/'data';ROOT.mkdir(exist_ok=True)
UFS=('CE','MA','MS','RJ','RN','RS')
def key(s):return ''.join(c for c in unicodedata.normalize('NFD',s.upper()) if unicodedata.category(c)!='Mn')
def amount(v):
 try:return Decimal(v.replace('.','').replace(',','.'))
 except InvalidOperation:return None
manifest={'extracted_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'years':{},'method':'Receitas FINANCEIRAS de prestações FINAL/REGULARIZAÇÃO, última data por candidatura. Fundo Especial/Partidário = público. Outros recursos = classificação declarada não pública; origem não informada permanece separada. Receitas estimáveis não entram no indicador financeiro. Transferências podem reaparecer em contas distintas; soma não mede recursos únicos do sistema.'}
allrows=[]
for year in (2018,2020,2022,2024):
 try:
  slug='dadosabertos-tse-jus-br-dataset-prestacao-de-contas-eleitorais-2022' if year==2022 else 'prestacao-de-contas-eleitorais-'+str(year)
  meta=json.load(urllib.request.urlopen('https://dadosabertos.tse.jus.br/api/3/action/package_show?id='+slug,timeout=30))['result']
  urls=[x['url'] for x in meta['resources'] if 'candidatos' in x.get('name','').lower() and 'prestacao_contas/' in x['url'] and x['url'].endswith('.zip')]
  if not urls:raise ValueError('Arquivo anual não localizado')
  url=urls[0];stats={'url':url,'files':[]};bycandidate=collections.defaultdict(list)
  with zipfile.ZipFile(RemoteZip(url)) as z:
   for uf in UFS:
    name=next(n for n in z.namelist() if n.lower().endswith(f'receitas_candidatos_{year}_{uf}.csv'.lower()))
    data=z.read(name);reader=csv.DictReader(io.StringIO(data.decode('latin1')),delimiter=';');count=skipped=0
    required={'SQ_CANDIDATO','SQ_RECEITA','VR_RECEITA','DS_FONTE_RECEITA','DS_NATUREZA_RECEITA','TP_PRESTACAO_CONTAS','DT_PRESTACAO_CONTAS'}
    if not required.issubset(reader.fieldnames):raise ValueError('Dicionário incompatível: '+str(required-set(reader.fieldnames)))
    for row in reader:
     count+=1
     if key(row['TP_PRESTACAO_CONTAS']) not in ('FINAL','REGULARIZACAO DA OMISSAO'):skipped+=1;continue
     val=amount(row['VR_RECEITA'])
     if val is None or val<0:skipped+=1;continue
     try:date=datetime.datetime.strptime(row['DT_PRESTACAO_CONTAS'],'%d/%m/%Y').date().isoformat()
     except ValueError:skipped+=1;continue
     # No names, documents or donor identifiers are retained.
     bycandidate[(row['SQ_CANDIDATO'],uf,row['DS_CARGO'])].append((date,row['SQ_RECEITA'],val,key(row['DS_FONTE_RECEITA']),key(row['DS_NATUREZA_RECEITA'])))
    stats['files'].append({'uf':uf,'name':name,'sha256':hashlib.sha256(data).hexdigest(),'rows':count,'excluded_before_snapshot':skipped})
    print(f'{year} {uf}: {count} lançamentos conferidos',flush=True)
  conflicts=duplicates=0
  for (seq,uf,cargo),records in bycandidate.items():
   last=max(x[0] for x in records);receipts={};bad=False
   for date,rid,val,source,nature in records:
    if date!=last:continue
    current=(val,source,nature)
    if rid in receipts:
     duplicates+=1
     if receipts[rid]!=current:bad=True;conflicts+=1
    receipts[rid]=current
   if bad:continue
   totals=collections.defaultdict(Decimal);n=0
   for val,source,nature in receipts.values():
    if nature!='FINANCEIRO':totals['estimaveis']+=val;continue
    n+=1;totals['total']+=val
    if source in ('FUNDO ESPECIAL','FUNDO PARTIDARIO') or 'FINANCIAMENTO DE CAMPANHA' in source:totals['publico']+=val
    elif source=='OUTROS RECURSOS':totals['privado']+=val
    else:totals['nao_classificado']+=val
   allrows.append({'ano':year,'sequencial':seq,'uf':uf,'cargo':cargo,'prestacao':last,'receitas':n,**{k:str(totals[k]) for k in ('total','publico','privado','nao_classificado','estimaveis')}})
  stats.update({'status':'loaded','candidaturas':sum(x['ano']==year for x in allrows),'conflicts_excluded':conflicts,'duplicates_removed':duplicates})
  manifest['years'][str(year)]=stats
 except Exception as e:
  manifest['years'][str(year)]={'status':'unavailable','error':str(e)[:160]};print(f'{year}: {type(e).__name__}: {str(e)[:160]}',flush=True)
# Refuse partial refreshes: preserve the previous complete local dataset.
if any(v['status']!='loaded' for v in manifest['years'].values()):raise SystemExit('Atualização incompleta: base publicada preservada.')
# Atomic sanitized output.
tmp=ROOT/'receitas-sanitizadas.tmp.json';tmp.write_text(json.dumps(allrows),encoding='utf8')
con=duckdb.connect();con.read_json(str(tmp)).project('ano,sequencial::VARCHAR sequencial,uf,cargo,prestacao,receitas,total::DECIMAL(20,2) total,publico::DECIMAL(20,2) publico,privado::DECIMAL(20,2) privado,nao_classificado::DECIMAL(20,2) nao_classificado,estimaveis::DECIMAL(20,2) estimaveis').write_parquet(str(ROOT/'receitas-candidatos.next.parquet'));con.close();(ROOT/'receitas-candidatos.next.parquet').replace(ROOT/'receitas-candidatos.parquet');tmp.unlink()
(ROOT/'receitas-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'loaded_years':[y for y,v in manifest['years'].items() if v['status']=='loaded'],'candidaturas':len(allrows)},ensure_ascii=False),flush=True)
