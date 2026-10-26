import assert from 'node:assert/strict';
import {test} from 'node:test';
import {findEvidence,ratio,comparisonMetrics,seatInk} from '../src/data/exploration.js';
import {researchScale} from '../src/atlas/researchScale.js';
import {NO_DATA_COLOR} from '../src/atlas/geography.js';
test('busca encontra município sem exigir acentos e preserva registros',()=>{const rows=[{nome:'São Luís',uf:'MA'},{nome:'Timon',uf:'MA'}];assert.deepEqual(findEvidence(rows,'sao luis'),[rows[0]]);assert.equal(findEvidence(rows,'').length,2)});
test('zero declarado e ausência não recebem a mesma cor ou taxa',()=>{assert.equal(ratio(0,10),0);assert.equal(ratio(null,10),null);assert.equal(ratio(3,0),null);assert.notEqual(seatInk({gastos:0},'gasto',{}),seatInk({gastos:null},'gasto',{}));assert.equal(seatInk({gastos:-1},'gasto',{}),seatInk({gastos:null},'gasto',{}));assert.equal(seatInk({gastos:''},'gasto',{}),seatInk({gastos:null},'gasto',{}))});
test('comparação não inventa resultado para fonte ainda não liberada',()=>{assert.deepEqual(comparisonMetrics(4,{status:'em_validacao',summary:{n:200}}),[]);assert.equal(comparisonMetrics(1,{summary:{valor:null,candidaturas:10}})[0].value,null)});
test('escala territorial mantém limites fixos e mostra ausência separada',()=>{const scale=researchScale({breaks:[10,25,50,75],unit:'percent'});assert.equal(scale.color(null),NO_DATA_COLOR);assert.notEqual(scale.color(0),NO_DATA_COLOR);assert.notEqual(scale.color(9),scale.color(10));assert.equal(scale.format(25),'25%');assert.equal(scale.legend.length,5)});
