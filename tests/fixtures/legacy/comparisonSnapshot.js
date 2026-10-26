/**
 * Agregações de leitura do acervo em 21/10/2026. Recorte: RS, MA, CE, RN, RJ, MS.
 * NÃO representam o Brasil inteiro. Nunca fingir que outros filtros foram consultados.
 */
const legendaGeral=[
 {ano:2018,cargo:'DEPUTADO ESTADUAL',serie:'Todos os partidos',valor:8.35},
 {ano:2018,cargo:'DEPUTADO FEDERAL',serie:'Todos os partidos',valor:6.49},
 {ano:2020,cargo:'VEREADOR',serie:'Todos os partidos',valor:5.43},
 {ano:2022,cargo:'DEPUTADO ESTADUAL',serie:'Todos os partidos',valor:6.95},
 {ano:2022,cargo:'DEPUTADO FEDERAL',serie:'Todos os partidos',valor:4.15},
 {ano:2024,cargo:'VEREADOR',serie:'Todos os partidos',valor:3.69},
];
const legendaPartidos=[
 {ano:2018,cargo:'DEPUTADO FEDERAL',serie:'PT',valor:11.26},
 {ano:2020,cargo:'VEREADOR',serie:'PL',valor:4.96},
 {ano:2020,cargo:'VEREADOR',serie:'PT',valor:8.90},
 {ano:2022,cargo:'DEPUTADO FEDERAL',serie:'PL',valor:5.58},
 {ano:2022,cargo:'DEPUTADO FEDERAL',serie:'PT',valor:10.02},
 {ano:2024,cargo:'VEREADOR',serie:'PL',valor:5.64},
 {ano:2024,cargo:'VEREADOR',serie:'PT',valor:7.20},
];
const abstencao=[
 [2022,'CE',17.45],[2022,'MA',22.20],[2022,'MS',22.08],[2022,'RJ',22.74],[2022,'RN',18.17],[2022,'RS',19.78],
 [2024,'CE',14.21],[2024,'MA',17.05],[2024,'MS',23.89],[2024,'RJ',26.24],[2024,'RN',16.54],[2024,'RS',23.69]
].map(([ano,serie,valor])=>({ano,serie,valor}));
const cadeiras=[
 [2018,'DEPUTADO ESTADUAL',777964.76,203048801.67,261],
 [2018,'DEPUTADO FEDERAL',2294220.62,305131342.28,133],
 [2018,'PRESIDENTE',196480000.00,196480000.00,1],
 [2020,'VEREADOR',21755.19,287277235.41,13205],
 [2022,'DEPUTADO ESTADUAL',1448803.47,378137705.80,261],
 [2022,'DEPUTADO FEDERAL',5458150.64,725934034.99,133],
 [2022,'PRESIDENTE',310822451.14,310822451.14,1],
 [2024,'VEREADOR',51493.01,676566596.81,13139]
].map(([ano,serie,valor,gasto_total,eleitos])=>({ano,serie,valor,gasto_total,eleitos}));
const propaganda=[
 [2018,'PRESIDENTE','Adesivos',854000.00,120],[2018,'PRESIDENTE','Bandeiras',620000.00,85],[2018,'PRESIDENTE','Santinhos',2140000.00,310],
 [2020,'VEREADOR','Adesivos',23726423.88,65602],[2020,'VEREADOR','Bandeiras',7832823.14,14485],[2020,'VEREADOR','Santinhos',15254650.31,30908],
 [2022,'PRESIDENTE','Adesivos',3240000.00,340],[2022,'PRESIDENTE','Bandeiras',1950000.00,180],[2022,'PRESIDENTE','Santinhos',5420000.00,520],
 [2024,'VEREADOR','Adesivos',45185118.40,79361],[2024,'VEREADOR','Bandeiras',22116234.92,24685],[2024,'VEREADOR','Santinhos',28419058.61,32537]
].map(([ano,cargo,serie,valor,lancamentos])=>({ano,cargo,serie,valor,lancamentos}));
const escolaridade=[
 [2018,'PRESIDENTE','SUPERIOR COMPLETO',11,1,11,9.09],
 [2018,'PRESIDENTE','ENSINO MÉDIO COMPLETO',2,0,2,0],
 [2022,'DEPUTADO ESTADUAL','SUPERIOR COMPLETO',2066,195,2000,9.75],
 [2022,'DEPUTADO ESTADUAL','ENSINO MÉDIO COMPLETO',1280,44,1232,3.57],
 [2022,'DEPUTADO ESTADUAL','SUPERIOR INCOMPLETO',445,18,429,4.20],
 [2022,'DEPUTADO ESTADUAL','ENSINO FUNDAMENTAL COMPLETO',256,4,241,1.66],
 [2022,'DEPUTADO ESTADUAL','ENSINO FUNDAMENTAL INCOMPLETO',118,0,107,0],
 [2022,'DEPUTADO ESTADUAL','ENSINO MÉDIO INCOMPLETO',109,0,105,0],
 [2022,'DEPUTADO ESTADUAL','LÊ E ESCREVE',35,0,32,0],
 [2022,'PRESIDENTE','SUPERIOR COMPLETO',10,1,10,10.0],
 [2022,'PRESIDENTE','ENSINO MÉDIO COMPLETO',2,0,2,0],
 [2024,'VEREADOR','ENSINO MÉDIO COMPLETO',33061,4784,31947,14.97],
 [2024,'VEREADOR','SUPERIOR COMPLETO',23865,4827,23309,20.71],
 [2024,'VEREADOR','ENSINO FUNDAMENTAL INCOMPLETO',9089,1158,8721,13.28],
 [2024,'VEREADOR','ENSINO FUNDAMENTAL COMPLETO',8976,1222,8627,14.16],
 [2024,'VEREADOR','SUPERIOR INCOMPLETO',4693,606,4547,13.33],
 [2024,'VEREADOR','ENSINO MÉDIO INCOMPLETO',3742,399,3606,11.06],
 [2024,'VEREADOR','LÊ E ESCREVE',1525,143,1406,10.17]
].map(([ano,cargo,serie,candidaturas,eleitos,definidos,valor])=>({ano,cargo,serie,candidaturas,eleitos,definidos,valor}));
const patrimonio=[
 [2018,'PRESIDENTE',1,0.0,375000],[2018,'PRESIDENTE',2,0.0,1750000],[2018,'PRESIDENTE',3,25.0,2850000],[2018,'PRESIDENTE',4,0.0,377000000],
 [2020,'VEREADOR',1,9.92,7000],[2020,'VEREADOR',2,16.18,39000],[2020,'VEREADOR',3,19.63,120000],[2020,'VEREADOR',4,24.41,367401.58],
 [2022,'PRESIDENTE',1,0.0,197000],[2022,'PRESIDENTE',2,0.0,1040000],[2022,'PRESIDENTE',3,0.0,7400000],[2022,'PRESIDENTE',4,33.33,24600000],
 [2024,'VEREADOR',1,13.18,9800],[2024,'VEREADOR',2,19.68,54500],[2024,'VEREADOR',3,24.30,163249.15],[2024,'VEREADOR',4,27.68,500000],
].map(([ano,cargo,quartil,valor,mediana])=>({ano,cargo,quartil,serie:`Quartil ${quartil}`,valor,mediana}));

const withMeta=(rows,kind)=>({
 rows,source:'snapshot',titulo:({legenda:'Participação dos votos de legenda',abstencao:'Abstenção eleitoral',cadeiras:'Gasto agregado por eleito',escolaridade:'Escolaridade e eleição',propaganda:'Materiais de campanha',patrimonio:'Patrimônio e eleição'})[kind],
 escopo:'Consultas auditadas em 21/10/2026 · seis estados',
 metodo:({
 legenda:'Votos de legenda ÷ (nominais + legenda), comparados somente no mesmo cargo e primeiro turno.',
 abstencao:'Abstenção ponderada por eleitores aptos. 2022 e 2024 são eleições de abrangências diferentes.',
 cadeiras:'Despesas de todas as candidaturas ÷ eleitos; valores nominais, não corrigidos por inflação.',
 escolaridade:'Eleitos ÷ candidaturas com resultado definido. Não é escolaridade do eleitorado.',
 propaganda:'Apenas categorias iniciadas em SANTINH, ADESIV ou BANDEIRA; valores nominais.',
 patrimonio:'Quartis de patrimônio entre candidaturas com resultado definido; associação não é causal.'
 })[kind]
});
/** Retorna null quando um filtro não está contido no snapshot — jamais simula resultado. */
export function comparisonSnapshot(kind,params={}){
 const uf=params.uf||'';
 if(kind==='legenda'){
   if(uf)return null;
   const cargo=params.cargo||'VEREADOR',first=params.primeiro||'',second=params.segundo||'';
   if(!first && second)return null;
   if(first && !['PT','PL'].includes(first))return null;
   if(second && !['PT','PL'].includes(second))return null;
   const rows=(first?legendaPartidos.filter(r=>r.serie===first||r.serie===second):legendaGeral).filter(r=>r.cargo===cargo);
   return rows.length?withMeta(rows,'legenda'):null;
 }
 if(kind==='abstencao'){
   const parts=(params.ufs||'RJ,RS').split(',').filter(Boolean);
   return withMeta(abstencao.filter(r=>parts.includes(r.serie)),'abstencao');
 }
 if(kind==='cadeiras'){
   if(uf)return null;
   return withMeta(cadeiras.filter(r=>r.serie===(params.cargo||'VEREADOR')),'cadeiras');
 }
 if(kind==='escolaridade'){
   if(uf)return null;
   const cargo=params.cargo||'VEREADOR',ano=Number(params.ano||2024);
   const rows=escolaridade.filter(r=>r.cargo===cargo&&r.ano===ano);
   return rows.length?withMeta(rows,'escolaridade'):null;
 }
 if(kind==='propaganda'){
   if(uf||params.partido)return null;
   const cargo=params.cargo||'VEREADOR';
   if(!['VEREADOR','PRESIDENTE'].includes(cargo))return null;
   const rows=propaganda.filter(r=>r.cargo===cargo);
   return withMeta(rows,'propaganda');
 }
 if(kind==='patrimonio'){
   if(uf)return null;
   const cargo=params.cargo||'VEREADOR';
   if(!['VEREADOR','PRESIDENTE'].includes(cargo))return null;
   const ano=Number(params.ano|| (cargo==='PRESIDENTE'?2022:2024));
   const rows=patrimonio.filter(r=>r.ano===ano&&r.cargo===cargo);
   return rows.length?withMeta(rows,'patrimonio'):null;
 }
 return null;
}
