import {useEffect,useMemo,useState} from 'react';
import {getComparison} from '../data/client.js';
import {comparisonSnapshot} from '../data/comparisonSnapshot.js';
import useMotionPreference from '../hooks/useMotionPreference.js';
import './escolaridade-dossie.css';

const UFS=['CE','MA','MS','RJ','RN','RS'];
const SCOPES=[['2024','VEREADOR'],['2020','VEREADOR'],['2022','DEPUTADO ESTADUAL'],['2018','DEPUTADO ESTADUAL'],['2022','DEPUTADO FEDERAL'],['2018','DEPUTADO FEDERAL']];
const MEDIO='ENSINO MÉDIO COMPLETO',SUPERIOR='SUPERIOR COMPLETO';
const count=n=>Number(n||0).toLocaleString('pt-BR');
const pct=n=>Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
const signed=n=>(n>0?'+':'')+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+' p.p.';
const rate=r=>r.definidos?100*r.eleitos/r.definidos:0;
const label=s=>({[MEDIO]:'Médio completo',[SUPERIOR]:'Superior completo','ENSINO MÉDIO INCOMPLETO':'Médio incompleto','ENSINO FUNDAMENTAL COMPLETO':'Fundamental completo','ENSINO FUNDAMENTAL INCOMPLETO':'Fundamental incompleto','SUPERIOR INCOMPLETO':'Superior incompleto','LÊ E ESCREVE':'Lê e escreve'})[s]||s;
const sum=(rows,key)=>rows.reduce((a,r)=>a+Number(r[key]||0),0);
const getRows=(result)=>result?.rows?.map(r=>({...r,candidaturas:Number(r.candidaturas),eleitos:Number(r.eleitos),definidos:Number(r.definidos),excluidos:Number(r.excluidos??r.candidaturas-r.definidos)}))||[];

export default function EscolaridadeDossie(){
 const [scope,setScope]=useState('2024|VEREADOR'),[uf,setUf]=useState(''),[metric,setMetric]=useState('taxa');
 const [result,setResult]=useState(null),[states,setStates]=useState({}),[loading,setLoading]=useState(false);
 const reduced=useMotionPreference();
 const [ano,cargo]=scope.split('|');
 useEffect(()=>{let active=true;setLoading(true);setResult(null);setStates({});
   const params={ano,cargo};
   Promise.allSettled([getComparison('escolaridade',params),...UFS.map(state=>getComparison('escolaridade',{...params,uf:state}))])
     .then(out=>{if(!active)return;
       if(out[0].status==='fulfilled')setResult(out[0].value);
       setStates(Object.fromEntries(UFS.map((state,i)=>[state,out[i+1].status==='fulfilled'?getRows(out[i+1].value):null])));
     }).finally(()=>{if(active)setLoading(false)});
   return()=>{active=false};
 },[scope]);
 const archived=useMemo(()=>comparisonSnapshot('escolaridade',{ano,cargo}),[scope]);
 const liveRows=getRows(result);
 const rows=uf?(states[uf]||[]):(liveRows.length?liveRows:getRows(archived));
 const source=uf?'Consulta por UF':liveRows.length?'Consulta atual':'Recorte arquivado · 21/10/2026';
 const totals={candidaturas:sum(rows,'candidaturas'),eleitos:sum(rows,'eleitos'),definidos:sum(rows,'definidos'),excluidos:sum(rows,'excluidos')};
 const ordered=[...rows].sort((a,b)=>b.candidaturas-a.candidaturas);
 const max=Math.max(1,...ordered.map(r=>metric==='taxa'?rate(r):r[metric]));
 const selectedStates=UFS.map(state=>{
   const data=states[state]; const medio=data?.find(r=>r.serie===MEDIO),superior=data?.find(r=>r.serie===SUPERIOR);
   return medio&&superior?{state,medio,superior}:null;
 }).filter(Boolean);
 const maxState=Math.max(35,...selectedStates.map(s=>rate(s.superior)));
 const medio=rows.find(r=>r.serie===MEDIO),superior=rows.find(r=>r.serie===SUPERIOR);
 const composition=[...rows].sort((a,b)=>Math.abs(b.eleitos/(totals.eleitos||1)-b.candidaturas/(totals.candidaturas||1))-Math.abs(a.eleitos/(totals.eleitos||1)-a.candidaturas/(totals.candidaturas||1)));
 const archivedPartial=!liveRows.length&&!!archived?.rows?.length;
 const mismatch=ano==='2024'&&cargo==='VEREADOR'&&!uf&&liveRows.length&&
   (totals.candidaturas!==84953||totals.eleitos!==13139||totals.definidos!==82163||totals.excluidos!==2790);
 return <div className="school-dossier">
   <div className="school-intro"><span>DOSSIÊ 04 / ESCOLARIDADE E URNAS</span><p>Entre quem disputa uma eleição, como a escolaridade se relaciona com a possibilidade de ocupar uma cadeira?</p></div>
   <div className="school-controls"><label>Ano e cargo<select value={scope} onChange={e=>{setScope(e.target.value);setUf('')}}>{SCOPES.map(([year,office])=><option key={year+office} value={`${year}|${office}`}>{year} · {office==='VEREADOR'?'Vereador':office==='DEPUTADO ESTADUAL'?'Deputado estadual':'Deputado federal'}</option>)}</select></label><label>Território<select value={uf} onChange={e=>setUf(e.target.value)}><option value="">Seis estados disponíveis</option>{UFS.map(state=><option key={state}>{state}</option>)}</select></label></div>
   <p className="school-source">{source} · {ano} · {cargo.toLowerCase()} · pleitos suplementares excluídos · CE, MA, MS, RJ, RN e RS.{loading?' Consultando a base…':''}</p>
   {mismatch&&<p className="school-alert">A consulta diverge dos totais de referência. Confira a classificação e os registros de resultado antes de interpretar este recorte.</p>}
   {archivedPartial&&<p className="school-alert">O recorte arquivado contém apenas as categorias registradas no snapshot. Os totais abaixo são subtotais dessas categorias; consulte a base para conferir todas as candidaturas e comparar estados.</p>}
   {!rows.length||mismatch?<p className="school-empty">{mismatch?'Os gráficos aguardam a revisão dos totais retornados pela consulta.':loading?'Consultando os resultados…':uf?'Este estado exige conexão com a base para mostrar valores reais.':'Não há resultados disponíveis para este recorte.'}</p>:<>
   <div className="school-summary"><div><b>{count(totals.candidaturas)}</b><span>Candidaturas</span></div><div><b>{count(totals.eleitos)}</b><span>Eleitos</span></div><div><b>{count(totals.definidos)}</b><span>Resultado definido</span></div><div><b>{count(totals.excluidos)}</b><span>Excluídos da taxa</span></div></div>
   <section className="school-panel"><header><span>FIG. 01 / PARTICIPAÇÃO E SUCESSO</span><h4>Quem concorre e quem se elege?</h4><p>A taxa divide eleitos por candidaturas com resultado definido dentro de cada escolaridade.</p></header><div className="school-modes" role="group" aria-label="Medida do gráfico">{[['taxa','Taxa de eleição'],['candidaturas','Candidaturas'],['eleitos','Eleitos']].map(([key,name])=><button key={key} aria-pressed={metric===key} onClick={()=>setMetric(key)}>{name}</button>)}</div><div className="school-bars">{ordered.map(r=>{const value=metric==='taxa'?rate(r):r[metric];return <div className="school-bar-row" key={r.serie} title={`${label(r.serie)}: ${count(r.candidaturas)} candidaturas, ${count(r.eleitos)} eleitos, ${count(r.definidos)} resultados definidos, ${count(r.excluidos)} excluídos`}><span>{label(r.serie)}</span><div className="school-track"><div className="school-fill" style={{width:`${100*value/max}%`,transition:reduced?'none':undefined}}/></div><strong>{metric==='taxa'?pct(value):count(value)}</strong></div>})}</div><p className="school-caption">{count(totals.excluidos)} casos sem resultado definido ficam fora do denominador da taxa. Passe o cursor ou consulte a tabela para os números absolutos por grupo.</p></section>
   <section className="school-panel"><header><span>FIG. 02 / SEIS ESTADOS</span><h4>Em quais estados isso muda?</h4><p>Taxa de eleição: ensino médio completo e ensino superior completo. Selecione uma UF para atualizar o dossiê.</p></header>{selectedStates.length?<><div className="school-state-key"><i/> Médio completo <i/> Superior completo</div><div className="school-states">{selectedStates.map(s=>{const m=rate(s.medio),h=rate(s.superior);return <button className={uf===s.state?'active':''} key={s.state} onClick={()=>setUf(uf===s.state?'':s.state)} title={`${s.state}: médio ${count(s.medio.eleitos)} eleitos / ${count(s.medio.definidos)} definidos; superior ${count(s.superior.eleitos)} eleitos / ${count(s.superior.definidos)} definidos`}><strong>{s.state}</strong><div className="school-state-line"><span style={{left:`${100*m/maxState}%`}}/><span style={{left:`${100*h/maxState}%`}}/><i style={{left:`${100*Math.min(m,h)/maxState}%`,width:`${100*Math.abs(h-m)/maxState}%`}}/></div><b>{signed(h-m)}</b><small>{pct(m)} → {pct(h)}</small></button>})}</div>{uf&&<button className="school-reset" onClick={()=>setUf('')}>← Voltar aos seis estados</button>}</>:<p className="school-empty">A comparação entre UFs aparece quando a consulta ao banco estiver disponível. Nenhuma taxa estadual é estimada.</p>}</section>
   <section className="school-panel"><header><span>FIG. 03 / COMPOSIÇÃO</span><h4>Quem disputa e quem ocupa as cadeiras?</h4><p>Participação de cada escolaridade no total de candidaturas e no total de eleitos deste recorte.</p></header><div className="school-composition-head"><span>ESCOLARIDADE</span><span>CANDIDATURAS · {count(totals.candidaturas)}</span><span>ELEITOS · {count(totals.eleitos)}</span><span>DIFERENÇA</span></div>{composition.map(r=>{const a=100*r.candidaturas/totals.candidaturas,b=100*r.eleitos/totals.eleitos;return <div className="school-composition" key={r.serie}><strong>{label(r.serie)}</strong><div><i style={{width:`${a}%`}}/>{pct(a)}</div><div><i style={{width:`${b}%`}}/>{pct(b)}</div><b className={b-a>=0?'positive':'negative'}>{signed(b-a)}</b></div>})}<p className="school-caption">A diferença compara participações nas duas distribuições; ela não é a taxa individual de eleição.</p></section>
   <section className="school-panel"><header><span>FIG. 04 / DE CADA 100</span><h4>O que a taxa parece em fichas?</h4><p>Uma ficha colorida representa aproximadamente uma candidatura eleita entre 100 com resultado definido.</p></header><div className="school-waffles">{[superior,medio].filter(Boolean).map(r=>{const n=Math.round(rate(r));return <div className="school-waffle" key={r.serie}><h5>{label(r.serie)}</h5><div className="school-grid" role="img" aria-label={`De cada 100 candidaturas com ${label(r.serie)}, aproximadamente ${n} foram eleitas`}>{Array.from({length:100},(_,i)=><i key={i} className={i<n?'elected':''}/>)}</div><p>Entre 100 candidaturas com resultado definido, aproximadamente <strong>{n}</strong> foram eleitas. Exatos: {count(r.eleitos)} de {count(r.definidos)}; {count(r.excluidos)} excluídas.</p></div>})}</div></section>
   <details className="school-table"><summary>Ver tabela completa de dados</summary><div><table><thead><tr><th>Escolaridade</th><th>Candidaturas</th><th>Eleitos</th><th>Definidos</th><th>Excluídos</th><th>Taxa</th></tr></thead><tbody>{ordered.map(r=><tr key={r.serie}><td>{label(r.serie)}</td><td>{count(r.candidaturas)}</td><td>{count(r.eleitos)}</td><td>{count(r.definidos)}</td><td>{count(r.excluidos)}</td><td>{pct(rate(r))}</td></tr>)}</tbody></table></div></details>
   </>}
   <p className="school-method">A escolaridade é declarada pela candidatura. Resultados definidos incluem eleitos, não eleitos e suplentes; resultados nulos ou desconhecidos são excluídos da taxa. A diferença entre grupos é descritiva: competição, número de vagas e composição das candidaturas também variam. A base não traz escolaridade da população ou do eleitorado; uma comparação social exigiria outra fonte, como dados apropriados do IBGE.</p>
 </div>;
}
