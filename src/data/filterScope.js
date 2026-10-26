export const proportionalOffices=['VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL'];
export const municipalOffice=cargo=>['VEREADOR','PREFEITO'].includes(cargo);
export function electionYearsForOffice(cargo,first=2002,last=2024){
 return Array.from({length:Math.max(0,last-first+1)},(_,i)=>first+i).filter(year=>year%4===(municipalOffice(cargo)?0:2));
}
export function normalizeInvestigationScope(input={}){
 const cargo=proportionalOffices.includes(input.cargo)?input.cargo:'VEREADOR';
 const years=electionYearsForOffice(cargo,2018);
 const result={...input,cargo,ano:years.includes(Number(input.ano))?String(input.ano):String(years.at(-1)),uf:input.uf||'',partido:input.partido||''};
 if(cargo!=='VEREADOR'||!result.uf){result.municipioId='';result.municipioNome=''}
 return result;
}
export function updateInvestigationScope(scope,patch){
 const next={...scope,...patch};
 if(['ano','cargo','uf'].some(key=>key in patch&&String(patch[key])!==String(scope[key])))next.partido='';
 if(['cargo','uf'].some(key=>key in patch&&patch[key]!==scope[key])){next.municipioId='';next.municipioNome=''}
 for(const key of ['candidaturaId','pessoaId','aviso'])next[key]='';
 return normalizeInvestigationScope(next);
}
export function isProportionalInvestigation(page,story=''){
 return ['plenario','partidos'].includes(page)||(page==='campanhas'&&story==='gastos')||(page==='arquivo'&&story==='patrimonio');
}
export function investigationFields(page,story=''){
 if(page==='atlas'&&story==='lideranca')return ['cargo','uf'];
 if(page==='partidos'&&story!=='representacao')return ['cargo','uf','partido','municipio'];
 if(page==='plenario'&&story==='proporcional')return ['cargo','ano','uf','municipio'];
 return ['cargo','ano','uf','partido','municipio'];
}
export function catalogRangeError(filters){
 for(const [key,label] of [['idade','idade'],['gasto','despesa'],['patrimonio','patrimônio']]){
  const min=filters[key+'_min'],max=filters[key+'_max'];
  if(min!==''&&min!=null&&Number(min)<0||max!==''&&max!=null&&Number(max)<0)return `Os limites de ${label} devem ser iguais ou maiores que zero.`;
  if(min!==''&&min!=null&&max!==''&&max!=null&&Number(min)>Number(max))return `O limite mínimo de ${label} deve ser menor ou igual ao máximo.`;
 }
 return '';
}
