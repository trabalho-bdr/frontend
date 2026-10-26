import {isProportionalInvestigation,normalizeInvestigationScope} from './filterScope.js';
import {useEffect,useState} from 'react';

export const compatibleYears=cargo=>['VEREADOR','PREFEITO'].includes(cargo)?[2020,2024]:[2018,2022];
export function readContext(){
 const params=new URLSearchParams(globalThis.location?.hash?.slice(1)||'');
 const scope=Object.fromEntries([...params].filter(([key])=>key.startsWith('q1_')).map(([key,value])=>[key.slice(3),value]));
 return isProportionalInvestigation(params.get('page'),params.get('story')||'')?normalizeInvestigationScope(scope):scope;
}
export function normalizeContext(context){
 const result={...context};
 if(result.cargo&&!['VEREADOR','PREFEITO'].includes(result.cargo)&&result.etapa!=='territorio'){
  delete result.municipioId;delete result.municipioNome;
  if(result.visao==='municipio')result.visao='estado';
 }
 if(!['catalogo','perfil','territorio'].includes(result.etapa)&&result.cargo&&result.ano&&!compatibleYears(result.cargo).includes(Number(result.ano)))result.ano=String(compatibleYears(result.cargo).at(-1));
 return result;
}
export function writeContext(patch){
 const context=normalizeContext({...readContext(),...patch});
 const params=new URLSearchParams(location.hash.slice(1));
 for(const key of [...params.keys()])if(key.startsWith('q1_'))params.delete(key);
 for(const [key,value] of Object.entries(context))if(value!=null&&value!=='')params.set('q1_'+key,String(value));
 history.replaceState(null,'','#'+params);
 return context;
}
export function useScope(initial={}){
 const [scope,setScope]=useState(()=>{const context=normalizeContext({...initial,...readContext()});return {...initial,...context}});
 useEffect(()=>{writeContext(scope)},[JSON.stringify(scope)]);
 return [scope,patch=>setScope(current=>normalizeContext({...current,...(typeof patch==='function'?patch(current):patch)}))];
}

// Each transition declares the preserved entities and the necessary evidence.
export const connections=[
 {from:'plenario',to:'arquivo',story:'trajetorias',label:'Essa pessoa já disputou outras eleições?',preserve:['candidato','ano','cargo','uf','municipioId','partido'],requires:['Candidatura','Candidato'],available:true},
 {from:'arquivo',to:'plenario',story:'custo',label:'Quanto custou a cadeira nessa disputa?',preserve:['ano','cargo','uf','municipioId','partido'],requires:['Despesa_Candidatura','Resultado_Candidatura'],available:true},
 {from:'atlas',to:'partidos',story:'legenda',label:'Como votou este município?',preserve:['ano','cargo','uf','municipioId','partido'],requires:['Votos_Partido_Municipio'],available:true},
 {from:'partidos',to:'atlas',story:'lideranca',label:'Onde mudou a liderança partidária?',preserve:['ano','cargo','uf','municipioId','partido'],requires:['Votos_Partido_Municipio'],available:true},
 {from:'adesivos',to:'arquivo',story:'trajetorias',label:'Quem são as pessoas por trás da propaganda?',preserve:['ano','cargo','uf','municipioId','partido','categoria','candidato'],requires:['Despesa_Candidatura','Candidatura'],available:true}
];
