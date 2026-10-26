import urllib.request,json,datetime,pathlib
base='https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial='
rows=[]
for start,end in [('01/01/2002','31/12/2011'),('01/01/2012','31/12/2021'),('01/01/2022','31/12/2024')]:
 rows+=json.load(urllib.request.urlopen(base+start+'&dataFinal='+end,timeout=30))
factors={};f=1.
for y in range(2024,2001,-1):
 factors[str(y)]=f
 for r in rows:
  if int(r['data'][-4:])==y:f*=1+float(r['valor'])/100
out={'source':'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados','base':'Dezembro/2024','method':'Fatores de dezembro de cada ano a dezembro de 2024, IPCA mensal, sem ajustar despesas pela data individual.','factors':factors}
p=pathlib.Path(__file__).resolve().parents[1]/'data'/'ipca.json';p.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8');print('IPCA importado:',len(rows),'meses;',len(factors),'fatores anuais')
