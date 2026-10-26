import {isProportionalInvestigation,normalizeInvestigationScope} from './filterScope.js';
export const pageNames={perguntas:'As dez perguntas',legendas:'Partidos do acervo',candidatos:'Candidatos',territorios:'Estados e municípios',inicio:'Início',arquivo:'Arquivo',atlas:'Atlas',partidos:'Partidos',campanhas:'Campanhas',adesivos:'Adesivaria',plenario:'Plenário',descobertas:'Descobertas',investigacoes:'Investigações',metodologia:'Fontes e método'};
export function moneyDestination(page,story='',theme=''){
 if(page==='arquivo'&&story==='patrimonio')return {page:'campanhas',story:'patrimonio',theme:'dinheiro'};
 if(page==='adesivos')return {page:'campanhas',story:'publicidade',theme:'dinheiro'};
 if(page==='plenario'&&['custo','gastos'].includes(story))return {page:'campanhas',story:'custo',theme:'dinheiro'};
 return {page,story,theme};
}
export function parseRoute(hash=''){
 const text=hash.replace(/^#/,''),params=new URLSearchParams(text);
 const requested=params.get('page')||(pageNames[text]?text:'inicio');
 let page=Object.hasOwn(pageNames,requested)?requested:'inicio';
 let story=params.get('story')||(page==='investigacoes'?String(Math.max(1,Math.min(10,Number(params.get('q'))||1))):'');
 let theme=params.get('theme')||'';({page,story,theme}=moneyDestination(page,story,theme));
 if(page==='arquivo'&&story==='fichario'){page='candidatos';story='perfil';theme=''}
 let context=Object.fromEntries([...params].filter(([key])=>key.startsWith('q1_')));
 if(isProportionalInvestigation(page,story)){const scope=normalizeInvestigationScope(Object.fromEntries(Object.entries(context).map(([key,value])=>[key.slice(3),value])));context=Object.fromEntries(Object.entries(scope).map(([key,value])=>['q1_'+key,value]))}
 return {page,story,theme,context};
}
