import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeInvestigationScope,updateInvestigationScope,investigationFields,electionYearsForOffice,catalogRangeError} from '../src/data/filterScope.js';
test('switching office retains a compatible year and clears dependent selections',()=>{
 const original={ano:'2018',cargo:'DEPUTADO ESTADUAL',uf:'CE',partido:'PT',municipioId:'1',municipioNome:'Fortaleza',pessoaId:'p',candidaturaId:'c'};
 const next=updateInvestigationScope(original,{cargo:'DEPUTADO FEDERAL'});
 assert.equal(next.ano,'2018');assert.equal(next.partido,'');assert.equal(next.municipioId,'');assert.equal(next.pessoaId,'');assert.equal(next.candidaturaId,'');assert.equal(original.partido,'PT');
});
test('changing election or state never retains an incompatible candidate or party',()=>{
 const current={ano:'2024',cargo:'VEREADOR',uf:'MA',municipioId:'1',municipioNome:'Timon',partido:'PSB',candidaturaId:'old'};
 const year=updateInvestigationScope(current,{ano:'2020'});assert.equal(year.ano,'2020');assert.equal(year.partido,'');assert.equal(year.municipioId,'1');assert.equal(year.candidaturaId,'');
 const state=updateInvestigationScope(current,{uf:'CE'});assert.equal(state.municipioId,'');assert.equal(state.municipioNome,'');assert.equal(state.partido,'');
});
test('proportional routes reject an unsupported office and impossible election years',()=>{
 assert.equal(normalizeInvestigationScope({cargo:'PREFEITO',ano:'2024'}).cargo,'VEREADOR');
 assert.equal(normalizeInvestigationScope({cargo:'DEPUTADO FEDERAL',ano:'2024'}).ano,'2022');
 assert.equal(normalizeInvestigationScope({cargo:'VEREADOR',ano:'2024',municipioId:'1'}).municipioId,'');
});
test('only filters actually used by each investigation are offered',()=>{
 assert.deepEqual(investigationFields('atlas','lideranca'),['cargo','uf']);
 assert.ok(!investigationFields('partidos','legenda').includes('ano'));
 assert.ok(!investigationFields('plenario','proporcional').includes('partido'));
 assert.ok(investigationFields('campanhas').includes('partido'));
});
test('municipal and statewide elections offer compatible years including historical records',()=>{
 assert.deepEqual(electionYearsForOffice('VEREADOR',2018),[2020,2024]);
 assert.deepEqual(electionYearsForOffice('PREFEITO',2018),[2020,2024]);
 assert.deepEqual(electionYearsForOffice('DEPUTADO FEDERAL',2018),[2018,2022]);
 assert.ok(electionYearsForOffice('SENADOR').includes(2002));
});
test('invalid numeric ranges explain the problem while zero stays a valid value',()=>{
 assert.match(catalogRangeError({idade_min:'50',idade_max:'20'}),/mínimo de idade/);
 assert.match(catalogRangeError({gasto_min:'100',gasto_max:'10'}),/mínimo de despesa/);
 assert.match(catalogRangeError({patrimonio_min:'-1'}),/zero/);
 assert.equal(catalogRangeError({gasto_min:'0',gasto_max:'0'}),'');
 assert.equal(catalogRangeError({gasto_min:'',gasto_max:'100'}),'');
});
