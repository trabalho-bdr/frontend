import {test} from 'node:test';
import assert from 'node:assert/strict';
import {questionModules,describe} from '../src/features/questions/registry.js';
test('all ten questions expose stable definitions and appropriate exploration capabilities',()=>{
 assert.equal(Object.keys(questionModules).length,10);
 for(const [id,module] of Object.entries(questionModules)){
  assert.equal(module.definition.id,Number(id));
  assert.equal(typeof module.describeResult,'function');
  assert.ok(module.definition.place.length>=2);
 }
 assert.equal(questionModules[9].map,false);
 assert.equal(questionModules[4].validatedYear,true);
 assert.equal(questionModules[6].validatedYear,false);
 assert.deepEqual(questionModules[5].allowedCargos,['VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL']);
 assert.deepEqual(questionModules[6].allowedCargos,[
  'VEREADOR',
  'PREFEITO',
  'DEPUTADO FEDERAL',
  'DEPUTADO ESTADUAL',
  'SENADOR',
  'GOVERNADOR',
  'VICE-PREFEITO',
  'VICE-GOVERNADOR',
 ]);
});
test('unknown data does not produce a numerical conclusion',()=>{
 assert.match(describe({rows:[]},1),/não tem registros/);
 assert.match(describe({status:'em_validacao',rows:[]},6),/validação/);
 assert.match(describe({status:'fonte_pendente',rows:[]},8),/não há receitas/);
});
test('schooling maps retain difference and distinct candidate/electorate measures',()=>{
 assert.deepEqual(questionModules[4].mapFields({}).map(f=>f.value),['diferenca_pp','x','y']);
 assert.equal(questionModules[1].mapFields({})[0].unit,'money');
 assert.equal(questionModules[2].mapFields({})[1].unit,'percent');
});
