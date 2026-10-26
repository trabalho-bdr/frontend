import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeContext,connections} from '../src/data/investigationContext.js';
test('a municipal contest preserves year, party and municipality',()=>{
 const input={ano:'2024',cargo:'VEREADOR',uf:'CE',municipioId:'2304400',partido:'PT'};
 assert.deepEqual(normalizeContext(input),input);
});
test('a deputy contest removes municipal seats and adjusts year',()=>{
 assert.deepEqual(normalizeContext({ano:'2024',cargo:'DEPUTADO FEDERAL',uf:'CE',municipioId:'2304400',municipioNome:'Fortaleza',visao:'municipio',partido:'PT'}),{ano:'2022',cargo:'DEPUTADO FEDERAL',uf:'CE',visao:'estado',partido:'PT'});
});
test('connections declare evidence and preserved filters',()=>{
 for(const link of connections){assert.ok(link.requires.length);assert.ok(link.preserve.includes('uf'));assert.equal(link.available,true)}
});
