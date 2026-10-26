import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {geoArea,geoMercator,geoPath} from 'd3-geo';
import {COVERAGE,MAP_COLORS,NO_DATA_COLOR,indicatorSettings,indicatorLegend,hasIndicatorValue,formatIndicator,prepareGeography,municipalityId,mapColor} from '../src/atlas/geography.js';
import {loadAtlasMunicipios,atlasCoverage,filterAtlasRows} from '../src/atlas/data.js';
import {states} from './fixtures/legacy/snapshot.js';
import {municipiosAmostra} from './fixtures/legacy/municipios-amostra.js';
const load=name=>JSON.parse(readFileSync(new URL(`../public/maps/${name}.geojson`,import.meta.url)));
test('malhas do acervo contêm 1.236 códigos únicos e toda a amostra',()=>{
 const features=COVERAGE.flatMap(uf=>load(uf).features);
 const ids=new Set(features.map(municipalityId));
 assert.equal(ids.size,1236);
 for(const municipality of municipiosAmostra)assert.ok(ids.has(municipality.id),municipality.nome);
 assert.equal(load('estados').features.length,27);
});
test('orientação das malhas desenha o Brasil, sem preencher o exterior do globo',()=>{
 for(const name of ['estados',...COVERAGE]){
   const source=load(name),copy=JSON.stringify(source),geo=prepareGeography(source);
   assert.equal(JSON.stringify(source),copy);
   const path=geoPath(geoMercator().fitExtent([[38,24],[702,475]],geo));
   for(const feature of geo.features){
     assert.ok(geoArea(feature)<1);
     assert.ok(!path(feature).includes('NaN'));
     assert.ok(path.centroid(feature).every(Number.isFinite));
   }
 }
});
test('mapa distingue ausência de valor de zero e inclui extremos nas classes abertas',()=>{
 for(const value of [null,undefined,NaN,Infinity,'',' ',false]){
   assert.equal(hasIndicatorValue(value),false);
   assert.equal(mapColor(value,'populacao'),NO_DATA_COLOR);
 }
 assert.notEqual(mapColor(0,'populacao'),NO_DATA_COLOR);
 assert.equal(mapColor(6211223,'populacao'),MAP_COLORS.at(-1));
 assert.equal(mapColor('0','populacao'),MAP_COLORS[0]);
});
test('legenda numérica e mapa compartilham classes sem lacunas ou sobreposição',()=>{
 assert.deepEqual(indicatorLegend('abstencao_2024').map(bin=>bin.label),['< 15%','15% a < 20%','20% a < 25%','25% a < 30%','≥ 30%']);
 for(const indicator of Object.keys(indicatorSettings)){
   const bins=indicatorLegend(indicator);
   for(const bin of bins){
     const value=bin.lower??0;
     const matching=bins.filter(b=>(b.lower==null||value>=b.lower)&&(b.upper==null||value<b.upper));
     assert.equal(matching.length,1);
     assert.equal(mapColor(value,indicator),bin.color);
     if(bin.upper!=null)assert.equal(mapColor(bin.upper-Number.EPSILON*Math.max(1,bin.upper),indicator),bin.color);
   }
 }
 assert.equal(formatIndicator(.754,'idhm'),'0,754');
 assert.equal(formatIndicator(20000,'pib_per_capita'),'R$ 20.000');
});
test('a escala quantitativa escurece continuamente sem usar cores partidárias',()=>{
 const luminance=hex=>{
   const [r,g,b]=hex.match(/[a-f\d]{2}/gi).map(v=>{
     const x=parseInt(v,16)/255;
     return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
   });
   return .2126*r+.7152*g+.0722*b;
 };
 for(let i=1;i<MAP_COLORS.length;i++)assert.ok(luminance(MAP_COLORS[i])<luminance(MAP_COLORS[i-1]));
});
test('cobertura sem catálogo quantitativo usa apenas os municípios consultados',()=>{
 const all=atlasCoverage(municipiosAmostra,'abstencao_2024','');
 assert.deepEqual(all,{total:18,loaded:18,unloaded:0,withValue:18,withoutValue:0});
 for(const state of states){
   const geo=load(state.uf);
   assert.equal(geo.features.length,state.n);
   const summary=atlasCoverage(municipiosAmostra,'abstencao_2024',state.uf);
   assert.equal(summary.loaded,3);
   assert.equal(summary.unloaded,0);
 }
 const summary=atlasCoverage([{id:'1',uf:'CE',abstencao_2024:0},{id:'2',uf:'CE',abstencao_2024:null}],'abstencao_2024','CE');
 assert.equal(summary.loaded,2);assert.equal(summary.withValue,1);assert.equal(summary.withoutValue,1);
});
test('consulta carrega todas as fichas da UF sem busca nem corte de 120 registros',async()=>{
 for(const state of states){
   const features=load(state.uf).features;
   const records=features.map(f=>({id:municipalityId(f),nome:f.properties.nome,uf:state.uf,abstencao_2024:null}));
   const result=await loadAtlasMunicipios(state.uf,async params=>{
     assert.deepEqual(params,{uf:state.uf,limit:1500});
     return records;
   });
   assert.equal(result.length,state.n);
   assert.equal(atlasCoverage(result,'abstencao_2024',state.uf).unloaded,0);
   assert.equal(atlasCoverage(result,'abstencao_2024',state.uf).withValue,0);
 }
});
test('buscar fichas não remove dados do mapa e aceita nomes sem acentos',()=>{
 const copy=JSON.stringify(municipiosAmostra);
 const result=filterAtlasRows(municipiosAmostra,'sao luis','abstencao_2024','desc');
 assert.equal(result.length,1);assert.equal(result[0].nome,'São Luís');
 assert.equal(JSON.stringify(municipiosAmostra),copy);
 assert.equal(atlasCoverage(municipiosAmostra,'abstencao_2024','MA').loaded,3);
 const ordered=filterAtlasRows([{nome:'Sem valor',abstencao_2024:null},{nome:'Zero',abstencao_2024:0}],'','abstencao_2024','asc');
 assert.equal(ordered[0].nome,'Zero');
});
test('consulta municipal malformada permite ao Atlas acionar o fallback',async()=>{
 await assert.rejects(loadAtlasMunicipios('CE',async()=>({rows:[]})),/Resposta municipal inválida/);
});
