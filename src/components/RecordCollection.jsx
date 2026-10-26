import {useState} from 'react';
import './record-collection.css';

/** Editorial records, with an optional proportional bar and expandable details. */
export default function RecordCollection({items=[],title='',empty='Nenhum registro neste recorte.',pageSize=8}){
 const [visible,setVisible]=useState(pageSize);
 return <section className="archive-records" aria-label={title||'Fichas do recorte'}>
 {title&&<p className="archive-records-caption">{title}</p>}
 {!items.length?<p role="status">{empty}</p>:<><ol>{items.slice(0,visible).map((item,index)=><li key={item.id??index}><article className={item.selected?'is-selected':''}>
 <header><div><span className="archive-record-number">{String(index+1).padStart(2,'0')} / FICHA</span><h4>{item.title}</h4>{item.subtitle&&<p>{item.subtitle}</p>}</div>{item.value!=null&&<strong>{item.value}</strong>}</header>
 {item.bar&&Number.isFinite(item.bar.value)&&Number.isFinite(item.bar.max)&&item.bar.max>0&&<div className="archive-record-bar" role="img" aria-label={item.bar.label||String(item.value??item.bar.value)}><i style={{width:`${Math.min(100,Math.max(0,100*item.bar.value/item.bar.max))}%`}}/></div>}
 {item.fields?.length>0&&<details><summary>Detalhes desta ficha</summary><dl>{item.fields.map((field,i)=><div key={field.label+'-'+i}><dt>{field.label}</dt><dd>{field.value??'Não informado'}</dd></div>)}</dl></details>}
 {item.onSelect&&<button type="button" className="archive-record-action" aria-pressed={!!item.selected} onClick={item.onSelect}>{item.actionLabel||'Explorar este registro'} ↗</button>}
 </article></li>)}</ol>{visible<items.length&&<button type="button" className="archive-records-more" onClick={()=>setVisible(n=>n+pageSize)}>Mostrar mais fichas · {Math.min(visible,items.length)} de {items.length}</button>}</>}
 </section>;
}
