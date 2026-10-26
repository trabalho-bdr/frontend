import {useEffect,useState} from 'react';
import {request} from '../data/client.js';
import {readContext,compatibleYears} from '../data/investigationContext.js';
import {normalizeInvestigationScope,updateInvestigationScope} from '../data/filterScope.js';
import {states} from '../data/catalog.js';
import './investigation-filters.css';
const defaultFields=['cargo','ano','uf','partido','municipio'];
const officeNames={'VEREADOR':'Vereador','DEPUTADO ESTADUAL':'Deputado estadual','DEPUTADO FEDERAL':'Deputado federal'};
export default function InvestigationContext({onChange,fields=defaultFields}){
 const scope=normalizeInvestigationScope(readContext()),has=key=>fields.includes(key);
 const [state,setState]=useState(null),[revision,setRevision]=useState(0);
 const key=JSON.stringify([scope.ano,scope.cargo,scope.uf,has('ano'),has('partido'),revision]);
 useEffect(()=>{const ac=new AbortController();setState(null);Promise.all((!has('ano')&&has('partido')?compatibleYears(scope.cargo):[scope.ano]).map(ano=>request('/contexto/opcoes?'+new URLSearchParams({ano,cargo:scope.cargo,uf:scope.uf}),{signal:ac.signal}))).then(results=>{const data={...results[0],partidos:[...new Map(results.flatMap(result=>result.partidos||[]).filter(row=>row.sigla).map(row=>[row.sigla,row])).values()].sort((a,b)=>a.sigla.localeCompare(b.sigla))};if(!ac.signal.aborted)setState({key,data})}).catch(()=>{if(!ac.signal.aborted)setState({key,error:true})});return()=>ac.abort()},[key]);
 const data=state?.key===key?state.data:null,loading=!state||state.key!==key,error=state?.key===key&&state.error;
 const change=patch=>onChange(updateInvestigationScope(scope,patch));
 const period=scope.cargo==='VEREADOR'?'2020 → 2024':'2018 → 2022';
 const active=[has('ano')?scope.ano:period,officeNames[scope.cargo],scope.uf||'Todos os 6 estados',has('municipio')&&scope.municipioNome,has('partido')&&scope.partido].filter(Boolean).join(' · ');
 return <details className="expo-context"><summary>Filtros da investigação <span className="context-active">· {active}</span></summary><p className="context-filter-help">As alterações são aplicadas automaticamente à investigação. Os painéis de consulta detalhada têm filtros próprios.</p><div className="expo-filters">
 {has('cargo')&&<label>Cargo<select value={scope.cargo} onChange={e=>change({cargo:e.target.value})}>{Object.entries(officeNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
 {has('ano')&&<label>Ano da eleição<select value={scope.ano} onChange={e=>change({ano:e.target.value})}>{compatibleYears(scope.cargo).map(year=><option key={year}>{year}</option>)}</select></label>}
 {has('uf')&&<label>Estado<select value={scope.uf} onChange={e=>change({uf:e.target.value})}><option value="">Todos os 6 estados do acervo</option>{states.map(item=><option key={item.uf} value={item.uf}>{item.nome} · {item.uf}</option>)}</select></label>}
 {has('municipio')&&scope.cargo==='VEREADOR'&&<label>Município<select disabled={!scope.uf||loading||!!error} value={scope.municipioId||''} onChange={e=>change({municipioId:e.target.value,municipioNome:data?.municipios.find(row=>String(row.id)===e.target.value)?.nome||''})}><option value="">{!scope.uf?'Selecione um estado primeiro':loading?'Carregando municípios…':'Todos os municípios do estado'}</option>{!data&&scope.municipioId&&<option value={scope.municipioId}>{scope.municipioNome||'Município selecionado'}</option>}{(data?.municipios||[]).map(row=><option key={row.id} value={row.id}>{row.nome}</option>)}</select></label>}
 {has('partido')&&<label>Partido<select disabled={loading||!!error} value={scope.partido} onChange={e=>change({partido:e.target.value})}><option value="">{loading?'Carregando partidos…':'Todos os partidos'}</option>{!data&&scope.partido&&<option value={scope.partido}>{scope.partido}</option>}{(data?.partidos||[]).filter(row=>row.sigla).map(row=><option key={row.sigla}>{row.sigla}</option>)}</select></label>}
 </div>{loading&&<p role="status">Atualizando as opções do recorte…</p>}{error&&<p role="status">Não foi possível carregar partidos e municípios. <button onClick={()=>setRevision(n=>n+1)}>Tentar novamente</button></p>}<p>{has('ano')?'Trocar cargo, ano ou estado limpa o partido selecionado. O município é limpo ao trocar cargo ou estado.':`Comparação entre ${period}; o período é definido pelo cargo.`}{scope.cargo!=='VEREADOR'&&' A disputa de deputados é estadual; não há filtro municipal.'}</p><button className="context-reset" onClick={()=>change({ano:'2024',cargo:'VEREADOR',uf:'',partido:'',municipioId:'',municipioNome:''})}>Limpar filtros da investigação</button></details>;
}
