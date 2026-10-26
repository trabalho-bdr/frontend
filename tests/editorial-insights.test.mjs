import test from 'node:test';
import assert from 'node:assert/strict';
import {seriesStyle,comparisonFindings,compactChartValue} from '../src/data/comparisonPresentation.js';
import {buildComparisonChart} from '../src/data/comparisonLogic.js';
import {comparisonSnapshot} from '../src/data/comparisonSnapshot.js';
import {territorialFindings} from '../src/atlas/data.js';
import {municipiosAmostra} from '../src/data/municipios-amostra.js';

test('identidade da série permanece estável ao trocar filtros e ordem',()=>{
 const first=new Map(['PT','PL','CE','RJ','RS'].map(key=>[key,seriesStyle(key)]));
 for(const key of ['RS','PL','PT','RJ','CE'])assert.deepEqual(seriesStyle(key),first.get(key));
 assert.notEqual(seriesStyle('PT').color,seriesStyle('PL').color);
 assert.notEqual(seriesStyle('CE').color,seriesStyle('RJ').color);
});
test('anotações calculam variação e diferença reais de PT e PL no mesmo cargo',()=>{
 const rows=comparisonSnapshot('legenda',{cargo:'VEREADOR',primeiro:'PT',segundo:'PL'}).rows;
 const chart=buildComparisonChart('legenda',rows,'valor',[2020,2024]);
 const findings=comparisonFindings(chart);
 const gap=findings.find(f=>f.type==='gap');
 assert.equal(gap.year,'2024');assert.equal(gap.high,'PT');assert.equal(gap.low,'PL');
 assert.ok(Math.abs(gap.delta-1.56)<1e-9);
 const pt=findings.find(f=>f.type==='change'&&f.serie==='PT');
 assert.equal(pt.fromYear,'2020');assert.equal(pt.toYear,'2024');
 assert.ok(Math.abs(pt.delta+1.7)<1e-9);
});
test('um ano ausente não cria variação nem comparação artificial',()=>{
 const chart=buildComparisonChart('legenda',[{ano:2020,serie:'PL',valor:4.96},{ano:2024,serie:'PT',valor:7.2}],'valor',[2020,2024]);
 assert.deepEqual(comparisonFindings(chart),[]);
});
test('barras locais leem valor normalizado mesmo quando a métrica tem outro nome',()=>{
 for(const [kind,metric] of [['municipios','idhm'],['municipios','populacao'],['fichas','gastos']]){
   const chart=buildComparisonChart(kind,[{serie:'A',valor:0},{serie:'B',valor:10},{serie:'Sem registro',valor:null}],metric);
   assert.deepEqual(chart.points.map(p=>p.valor),[0,10,null]);
   assert.deepEqual(comparisonFindings(chart),[{type:'spread',low:'A',high:'B',delta:10}]);
 }
});
test('comparar a mesma categoria duas vezes não produz uma descoberta',()=>{
 const chart=buildComparisonChart('municipios',[{serie:'A',valor:10},{serie:'A',valor:10}],'populacao');
 assert.deepEqual(comparisonFindings(chart),[]);
});
test('achados territoriais usam somente o indicador carregado e preservam a amostra',()=>{
 const before=JSON.stringify(municipiosAmostra);
 const result=territorialFindings(municipiosAmostra,'abstencao_2024');
 assert.equal(result.count,18);
 assert.equal(result.minimum.nome,'Caucaia');assert.equal(result.maximum.nome,'Canoas');
 const values=municipiosAmostra.map(r=>r.abstencao_2024).filter(Number.isFinite);
 assert.ok(Math.abs(result.range-(Math.max(...values)-Math.min(...values)))<1e-9);
 assert.equal(JSON.stringify(municipiosAmostra),before);
 assert.equal(territorialFindings([{id:'1',idhm:null}],'idhm'),null);
 const zero=territorialFindings([{id:'1',populacao:0},{id:'2',populacao:null},{id:'3',populacao:10}],'populacao');
 assert.equal(zero.count,2);assert.equal(zero.minimum.populacao,0);assert.equal(zero.range,10);
});
test('rótulos compactos preservam sinal e formato brasileiro',()=>{
 assert.equal(compactChartValue(1500000),'1,5 mi');
 assert.equal(compactChartValue(-17000),'-17 mil');
 assert.equal(compactChartValue(.75),'0,75');
});
