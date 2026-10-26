import test from 'node:test';
import assert from 'node:assert/strict';
import {savedEvidence,correlation,transitions,questionDestinations,themes} from '../src/data/exhibition.js';
import fixture from '../src/data/exhibitionSnapshot.json' with {type:'json'};
import {wealthFallback} from '../src/data/wealthFallback.js';
test('archived territory is complete and state filters retain their actual scope',()=>{
 assert.equal(savedEvidence('territorio',{ano:2024}),null);const full=fixture.territorio;assert.equal(full.database,'pipeline_bdr_der_completo_v4');assert.equal(full.rows.length,1236);assert.equal(new Set(full.rows.map(r=>r.id)).size,1236);
 const ce={rows:fixture.territorio.rows.filter(row=>row.uf==='CE')};assert.equal(ce.rows.length,184);assert.ok(ce.rows.every(r=>r.uf==='CE'));
 assert.equal(savedEvidence('territorio',{ano:2022}),null);assert.equal(savedEvidence('partidos',{uf:'CE'}),null);
});
test('correlation excludes missing pairs and returns no value for constant variables',()=>{
 assert.equal(correlation([{x:1,y:2},{x:2,y:4},{x:3,y:6},{x:null,y:9}],'x','y'),1);
 assert.equal(correlation([{x:1,y:2},{x:1,y:4},{x:1,y:6}],'x','y'),null);
});
test('party transitions reconcile to the comparable population, not the entire map',()=>{
 const rows=fixture.transicoes.rows;assert.equal(rows.length,1231);assert.equal(new Set(rows.map(r=>r.id)).size,1231);assert.equal(transitions(rows).reduce((sum,r)=>sum+r.total,0),1231);
});
test('spending rates reconcile numerator and denominator in every quartile',()=>{
 for(const r of fixture.gastos.rows){assert.ok(Math.abs(r.taxa-100*r.eleitos/r.candidaturas)<1e-9);assert.ok(r.minimo<=r.mediana&&r.mediana<=r.maximo)}
});
test('continuity rates use original cohorts including the non-returners',()=>{
 for(const r of fixture.continuidade.rows){assert.ok(r.retornos<=r.pessoas);assert.ok(r.mudancas_partido<=r.retornos);assert.ok(Math.abs(r.taxa-100*r.retornos/r.pessoas)<1e-9)}
});
test('legacy questions reach environments rather than a mandatory investigations destination',()=>{
 assert.equal(themes.length,4);for(const [page,story] of Object.values(questionDestinations)){assert.notEqual(page,'investigacoes');assert.ok(story)}
});
test('wealth fallbacks never relabel another year or substitute a median for a mean',()=>{
 assert.equal(wealthFallback('map',{ano:2020}).source,'unavailable');assert.equal(wealthFallback('summary',{cargo:'PREFEITO'}).source,'unavailable');assert.equal(wealthFallback('summary',{uf:'CE',municipio:'9999999'}).source,'unavailable');
 const result=wealthFallback('summary',{uf:'CE',municipio:'2300101'});assert.equal(result.source,'snapshot');assert.equal(result.resumo_situacao[0].patrimonio_medio,null);assert.equal(result.cobertura.negativos,null);
});
