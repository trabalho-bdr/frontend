import test from 'node:test';
import assert from 'node:assert/strict';
import {drawerOptions,optionsForFacet,matchesCandidate,compareIsEquivalent} from './fixtures/legacy/filing.js';
const x={id:'1',nome:'JOÃO DA SILVA',numero:13000,municipio:'São Luís',partido:'PT',uf:'MA',ano:2024,cargo:'VEREADOR',resultado:'NÃO ELEITO'};
test('reorganiza gavetas por facetas e páginas',()=>{
 assert.deepEqual(optionsForFacet('ano').slice(0,4),['2024','2022','2020','2018']);
 assert.equal(optionsForFacet('ano').length,12);
 assert.equal(drawerOptions('partido',1)[0].id,'MDB');
 assert.equal(optionsForFacet('partido').length,56);
 assert.equal(drawerOptions('uf').length,6);
});
test('busca por nome sem acento e número',()=>{
 assert.equal(matchesCandidate(x,{ano:'2024',search:'joao'}),true);
 assert.equal(matchesCandidate(x,{ano:'2024',search:'13000'}),true);
 assert.equal(matchesCandidate(x,{ano:'2024',search:'Sao Luis'}),true);
 assert.equal(matchesCandidate(x,{ano:'2022',search:'joao'}),false);
});
test('filtro de eleitos NÃO inclui NÃO ELEITO',()=>{
 assert.equal(matchesCandidate(x,{resultado:'ELEITO'}),false);
 assert.equal(matchesCandidate(x,{resultado:'NÃO ELEITO'}),true);
 assert.equal(matchesCandidate({...x,resultado:'ELEITO POR QP'},{resultado:'ELEITO'}),true);
});
test('comparar somente cargo e ano equivalentes',()=>{
 assert.equal(compareIsEquivalent([x,{...x,id:'2'}]),true);
 assert.equal(compareIsEquivalent([x,{...x,ano:2022}]),false);
});
