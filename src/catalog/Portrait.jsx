import {useState} from 'react';
export default function Portrait({name='',url=null,large=false,photoYear=null}){
 const [failedUrl,setFailedUrl]=useState(null);
 const available=!!url&&failedUrl!==url;
 const initials=name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('');
 const description=available?`Fotografia oficial de ${name}${photoYear?` · ${photoYear}`:''}`:undefined;
 return <div className={'catalog-portrait'+(large?' is-large':'')} aria-label={available?undefined:'Sem fotografia oficial validada'}>
 {available?<><img src={url} alt={description} loading="lazy" onError={()=>setFailedUrl(url)}/></>:<span aria-hidden="true">{initials||'—'}</span>}
 </div>;
}
