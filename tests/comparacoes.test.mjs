import test from 'node:test';
import assert from 'node:assert/strict';
import {buildComparisonChart,comparisonMetrics,formatComparisonValue,isComparableCandidates} from '../src/data/comparisonLogic.js';
import {comparisonSnapshot} from './fixtures/legacy/comparisonSnapshot.js';

test('linha temporal preserva lacunas, sem inventar zero em anos sem dado',()=>{
 const chart=buildComparisonChart('legenda',[{ano:2022,serie:'PL',valor:5.58}], 'valor',[2018,2022]);
 assert.deepEqual(chart.points,[{periodo:'2018',PL:null},{periodo:'2022',PL:5.58}]);
});
test('amostra não se passa por consulta de UF ou partido não auditados',()=>{
 assert.equal(comparisonSnapshot('legenda',{cargo:'VEREADOR',uf:'SP'}),null);
 assert.equal(comparisonSnapshot('propaganda',{cargo:'VEREADOR',partido:'PT'}),null);
 assert.equal(comparisonSnapshot('legenda',{cargo:'VEREADOR',primeiro:'PSOL'}),null);
});
test('votos de legenda PT × PL possuem dois anos e percentuais auditados',()=>{
 const result=comparisonSnapshot('legenda',{cargo:'VEREADOR',primeiro:'PL',segundo:'PT'});
 const chart=buildComparisonChart('legenda',result.rows,'valor',[2020,2024]);
 assert.equal(chart.points[0].PT,8.9);
 assert.equal(chart.points[1].PL,5.64);
 assert.equal(chart.points[1].PT,7.2);
});
test('abstenção ponderada aparece como linha por estado e ano',()=>{
 const result=comparisonSnapshot('abstencao',{ufs:'RJ,RS'});
 assert.equal(result.rows.length,4);
 const chart=buildComparisonChart('abstencao',result.rows,'valor');
 assert.equal(chart.points[1].RJ,26.24);
 assert.equal(chart.points[1].RS,23.69);
});
test('graus de escolaridade têm taxas e quantidades distintas',()=>{
 const result=comparisonSnapshot('escolaridade',{ano:2024,cargo:'VEREADOR'});
 const fundamental=result.rows.find(r=>r.serie==='ENSINO FUNDAMENTAL INCOMPLETO');
 assert.equal(fundamental.valor,13.28);
 assert.equal(fundamental.candidaturas,9089);
 assert.equal(buildComparisonChart('escolaridade',result.rows,'candidaturas').points.length,result.rows.length);
});
test('preserva zeros verdadeiros e valores não informados nas fichas',()=>{
 const chart=buildComparisonChart('fichas',[{serie:'A',valor:0},{serie:'B',valor:null}]);
 assert.equal(chart.points[0].valor,0);
 assert.equal(chart.points[1].valor,null);
 assert.equal(formatComparisonValue(null,'votos','fichas'),'Sem registro');
});
test('comparação de fichas alerta diferenças no ano, cargo e UF',()=>{
 assert.equal(isComparableCandidates([{ano:2024,cargo:'VEREADOR',uf:'RS'},{ano:2024,cargo:'VEREADOR',uf:'RJ'}]),false);
 assert.equal(isComparableCandidates([{ano:2024,cargo:'VEREADOR',uf:'RS'},{ano:2024,cargo:'VEREADOR',uf:'RS'}]),true);
});
test('navegação inclui comparações de renda, escolaridade e propaganda sem nova página',()=>{
 assert.ok(comparisonMetrics('municipios').some(x=>x.key==='pib_per_capita'));
 assert.ok(comparisonMetrics('escolaridade').some(x=>x.key==='candidaturas'));
 assert.ok(comparisonMetrics('propaganda').some(x=>x.key==='lancamentos'));
});
