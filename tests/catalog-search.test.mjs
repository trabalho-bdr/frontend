import test from 'node:test';
import assert from 'node:assert/strict';
import {peopleSearchError,peopleSearchOrder} from '../src/catalog/search.js';
import {emptyCatalogFilters} from '../src/catalog/logic.js';
test('a name query works without imposing an election',()=>{
 assert.equal(peopleSearchError({...emptyCatalogFilters,q:'Clara Prado'}),'');
});
test('a number needs the territory that identifies the contest',()=>{
 const partial={...emptyCatalogFilters,q:'12345',ano:'2024',cargo:'VEREADOR',uf:'MA'};
 assert.match(peopleSearchError(partial),/município/);
 assert.equal(peopleSearchError({...partial,municipio:'2112209'}),'');
 assert.equal(peopleSearchError({...partial,cargo:'DEPUTADO FEDERAL',ano:'2022'}),'');
});
test('inverted ranges explain the problem instead of returning misleading empty results',()=>{
 assert.match(peopleSearchError({...emptyCatalogFilters,q:'',gasto_min:'500',gasto_max:'100'}),/mínimo/);
 assert.equal(peopleSearchError({...emptyCatalogFilters,gasto_min:'0',gasto_max:'0'}),'');
});
test('applying a wider search resets vote sorting without changing the entered filters',()=>{
 const filters={...emptyCatalogFilters,q:'Clara'};
 assert.equal(peopleSearchOrder('votos',filters),'recentes');
 assert.equal(filters.q,'Clara');
 assert.equal(peopleSearchOrder('nome',filters),'nome');
});
test('financial sorting remains tied to the selected election',()=>{
 const filters={...emptyCatalogFilters,ano:'2024',cargo:'VEREADOR',uf:'MA',municipio:'2112209'};
 assert.equal(peopleSearchOrder('votos',filters),'votos');
 assert.equal(peopleSearchOrder('gastos',filters),'gastos');
 assert.equal(peopleSearchOrder('votos',{...filters,cargo:'PREFEITO'}),'recentes');
});
