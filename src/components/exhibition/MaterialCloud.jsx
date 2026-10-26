import RecordCollection from '../RecordCollection.jsx';
import {useState} from 'react';
import {brl,csvDownload,fmt} from '../../data/exhibition.js';

const key=row=>`${row.tipo}::${row.categoria_normalizada}`;
const colors={'Adesivos':'blue','Santinhos':'red','Bandeiras':'yellow'};

export default function MaterialCloud({data,caption}){
 const [chosen,setChosen]=useState('');
 const all=data?.cloud||[];
 const words=all.filter(row=>Number.isFinite(row.valor)&&row.valor>0).slice(0,18);
 const selected=all.find(row=>key(row)===chosen);
 const maximum=words[0]?.valor||1;
 return <section className="expo-material-cloud" aria-labelledby="cloud-title">
  <div className="expo-cloud-heading"><span className="expo-kicker">DESCRIÇÕES PADRONIZADAS · PAINÉIS BDR</span><h2 id="cloud-title">O que aparece nos lançamentos?</h2><p>Palavras maiores representam valores maiores dentro da seleção mostrada. Escolha uma para conferir as descrições que a formaram.</p></div>
  {words.length?<><div className="expo-cloud-words" aria-label="Categorias padronizadas das descrições de maior valor">{words.map(row=>{
   const weight=Math.sqrt(row.valor/maximum),size=16+Math.round(weight*20);
   return <button type="button" key={key(row)} className={`expo-cloud-word ${colors[row.tipo]||'blue'}`} aria-pressed={chosen===key(row)} onClick={()=>setChosen(old=>old===key(row)?'':key(row))} style={{fontSize:`${size}px`}} title={`${row.tipo} · ${brl(row.valor)} nas descrições incluídas`}><span>{row.categoria_normalizada}</span><small>{row.tipo}</small></button>;
  })}</div><p className="expo-cloud-note">Nuvem parcial: {fmt(data.cloud_scope?.origens_incluidas,0)} descrições originais de maior saldo positivo, entre {fmt(data.cloud_scope?.origens_total,0)} categorias do recorte. As três barras acima usam todos os lançamentos elegíveis; não some os valores da nuvem para reproduzir seu total.</p>
  {selected&&<div className="expo-cloud-detail"><div><span className="expo-kicker">CATEGORIA SELECIONADA · {selected.tipo}</span><h3>{selected.categoria_normalizada}</h3><p>{brl(selected.valor)} nos {fmt(selected.registros,0)} lançamentos das descrições incluídas na nuvem.{selected.requer_revisao?' Parte desta padronização depende de regra textual e requer revisão.':''}</p></div><button type="button" onClick={()=>csvDownload(selected.origens.map(row=>({material:selected.tipo,categoria_normalizada:selected.categoria_normalizada,...row})),`descricoes-${selected.tipo.toLowerCase()}`)}>Baixar descrições em CSV</button><RecordCollection title={`Descrições originais · ${caption}`} items={selected.origens.map(row=>({id:row.categoria_original,title:row.categoria_original,value:brl(row.valor),fields:[{label:'Lançamentos',value:fmt(row.registros,0)},{label:'Classificação',value:row.status_classificacao.replaceAll('_',' ').toLowerCase()}]}))}/></div>}</>:<p className="expo-unavailable">{data?'Não há categorias com saldo positivo nesta seleção. Consulte os registros originais abaixo.':'A nuvem de categorias padronizadas aparecerá após a consulta ao acervo.'}</p>}
 </section>;
}
