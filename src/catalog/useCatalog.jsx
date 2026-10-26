import {useEffect,useState} from 'react';
import {request} from '../data/client.js';
import {catalogQuery} from './logic.js';
export {catalogQuery,municipal,isComparable,displayNumber,displayMoney,candidateContext} from './logic.js';

export function useCatalog(path,params={},enabled=true,delay=0){
 const query=catalogQuery(params),key=path+'?'+query;
 const [state,setState]=useState(null),[revision,setRevision]=useState(0);
 useEffect(()=>{if(!enabled)return;const ac=new AbortController();setState(null);const timer=setTimeout(()=>{
 request('/catalogo/'+key,{signal:ac.signal,timeout:45000}).then(data=>{if(!ac.signal.aborted)setState({key,data})}).catch(()=>{if(!ac.signal.aborted)setState({key,error:true})});
 },delay);return()=>{clearTimeout(timer);ac.abort()}},[key,enabled,revision,delay]);
 const current=state?.key===key?state:null;
 return {data:enabled?current?.data:null,error:enabled&&!!current?.error,loading:enabled&&!current,retry:()=>setRevision(n=>n+1)};
}

export function CatalogState({state,empty=false}){
 if(state.loading)return <p className="catalog-state" role="status">Consultando os registros do acervo…</p>;
 if(state.error)return <div className="catalog-state" role="alert"><p>Não foi possível consultar este recorte. Nenhum registro arquivado substitui a consulta.</p><button onClick={state.retry}>Tentar novamente</button></div>;
 return empty?<p className="catalog-state">Nenhum registro encontrado. Experimente mudar os filtros.</p>:null;
}
