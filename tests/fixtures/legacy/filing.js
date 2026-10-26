// Modelo do fichário: dados da navegação, sem dependência do Three.js.
// Usado tanto pelos botões acessíveis quanto pela representação tridimensional.
export const FACETS = [
  {id:'ano',label:'ANO ELEITORAL',caption:'Divisórias cronológicas'},
  {id:'partido',label:'PARTIDO',caption:'Siglas disponíveis'},
  {id:'cargo',label:'CARGO',caption:'Tipo de disputa'},
  {id:'uf',label:'ESTADO',caption:'Territórios do acervo'},
];
export const COLORS = ['#e5bb4e','#ba4a3a','#24669b','#23816b','#d28d55','#8a648d'];
export const YEARS = ['2024','2022','2020','2018','2016','2014','2012','2010','2008','2006','2004','2002'];
export const PARTIES = ['AGIR','AVANTE','CIDADANIA','DC','DEM','DEMOCRATA','MDB','MOBILIZA','NOVO','PAN','PATRI','PATRIOTA','PC DO B','PCB','PCO','PDT','PFL','PGT','PHS','PL','PMB','PMDB','PMN','PODE','PP','PPB','PPL','PPS','PR','PRB','PRD','PRONA','PROS','PRP','PRTB','PSB','PSC','PSD','PSDB','PSDC','PSL','PSOL','PST','PSTU','PT','PT DO B','PTB','PTC','PTN','PV','REDE','REPUBLICANOS','SD','SOLIDARIEDADE','UNIÃO','UP'];
export const OFFICES = ['PRESIDENTE','VEREADOR','PREFEITO','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','GOVERNADOR','SENADOR'];
export const STATES = ['CE','MA','MS','RJ','RN','RS'];
export function optionsForFacet(facet){
  if(facet==='ano')return YEARS;
  if(facet==='partido')return PARTIES;
  if(facet==='cargo')return OFFICES;
  if(facet==='uf')return STATES;
  return YEARS;
}
export function drawerOptions(facet,groupPage=0){
  return optionsForFacet(facet).slice(groupPage*6,groupPage*6+6).map((id,i)=>({id,label:id,short:id.length>15?id.slice(0,13)+'…':id,color:COLORS[(i+groupPage*6)%COLORS.length]}));
}
export function currentFacetValue(facet,filters){return String(filters[facet]||'')}
export function normalizeText(text){return String(text??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
export function matchesCandidate(c,filter){
 const search=normalizeText(filter.search);
 return (!filter.ano||String(c.ano)===String(filter.ano))&&(!filter.uf||c.uf===filter.uf)&&
 (!filter.partido||c.partido===filter.partido)&&(!filter.cargo||c.cargo===filter.cargo)&&
 (!filter.resultado|| (filter.resultado==='ELEITO' ? String(c.resultado||'').toUpperCase().startsWith('ELEITO') : filter.resultado==='NÃO ELEITO' ? ['NÃO ELEITO','NAO ELEITO'].includes(String(c.resultado||'').toUpperCase()) : String(c.resultado||'').toUpperCase()===filter.resultado))&&
 (!search||normalizeText([c.nome,c.municipio,c.partido,c.numero].join(' ')).includes(search));
}
export function compareIsEquivalent(items){return items.length>1&&items.every(c=>c.ano===items[0].ano&&c.cargo===items[0].cargo)}
