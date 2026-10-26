import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreCatalog,emptyCatalogFilters,catalogQuery,isComparable,canOrderVotes,candidateContext,displayMoney} from '../src/catalog/logic.js';
import {normalizeContext} from '../src/data/investigationContext.js';
test('all-years catalog filters and pagination survive opening a newer candidature',()=>{
 const saved={filters:{...emptyCatalogFilters,q:'José',uf:'CE',ano:''},order:'nome',page:3};
 const restored=restoreCatalog({ano:'2024',cargo:'VEREADOR',catalogoEstado:JSON.stringify(saved)});
 assert.deepEqual(restored,saved);
});
test('catalog and person routes retain years before 2018',()=>{
 for(const etapa of ['catalogo','perfil'])assert.equal(normalizeContext({ano:2002,cargo:'DEPUTADO ESTADUAL',uf:'CE',etapa}).ano,2002);
});
test('deputy profiles do not attribute seats to the home municipality',()=>{
 const context=candidateContext({id:'application',id_candidato:'person',ano:2002,cargo:'DEPUTADO ESTADUAL',uf:'CE',municipio_id:'1'});
 assert.equal(context.municipioId,'');assert.equal(context.pessoaId,'person');assert.equal(context.candidaturaId,'application');
});
test('territorial voting analysis may retain a municipality for deputies',()=>{
 assert.equal(normalizeContext({ano:2022,cargo:'DEPUTADO FEDERAL',uf:'CE',municipioId:'1',etapa:'territorio'}).municipioId,'1');
});
test('votes cannot be ranked globally across elections and offices',()=>{
 assert.equal(isComparable({ano:'2024',cargo:'VEREADOR',uf:'CE'}),false);
 assert.equal(isComparable({ano:'2024',cargo:'VEREADOR',uf:'CE',municipio:'1'}),true);
 assert.equal(isComparable({ano:'2022',cargo:'DEPUTADO FEDERAL',uf:'CE'}),true);
});
test('empty years are omitted from API requests and missing money remains missing',()=>{
 assert.equal(catalogQuery({ano:'',uf:'CE',limit:12}),'uf=CE&limit=12');assert.equal(displayMoney(null),'Não informado');assert.notEqual(displayMoney(0),'Não informado');
});
test('legacy candidature records retain their municipality and replace the selected identity',()=>{
 const context=candidateContext({id:'new-application',id_candidato:'new-person',ano:2024,cargo:'VEREADOR',uf:'CE',id_municipio:'1'});
 assert.equal(context.candidaturaId,'new-application');assert.equal(context.pessoaId,'new-person');assert.equal(context.municipioId,'1');
});
test('a majoritarian contest with potential runoff is not offered as a single vote ranking',()=>{
 assert.equal(canOrderVotes({ano:2024,cargo:'PREFEITO',uf:'CE',municipio:'1'}),false);
 assert.equal(canOrderVotes({ano:2024,cargo:'VEREADOR',uf:'CE',municipio:'1'}),true);
});
