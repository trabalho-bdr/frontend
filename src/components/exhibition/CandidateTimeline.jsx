import {useEffect,useState} from 'react';
import {request} from '../../data/client.js';
import {brl,fmt} from '../../data/exhibition.js';
import {EvidenceRecords,Source} from './Story.jsx';
export default function CandidateTimeline({candidate}){
 const [state,setState]=useState(null);useEffect(()=>{if(!candidate)return;const ac=new AbortController();setState(null);request('/exposicao/trajetoria/'+encodeURIComponent(candidate.id),{signal:ac.signal}).then(data=>{if(!ac.signal.aborted)setState({data})}).catch(()=>{if(!ac.signal.aborted)setState({error:true})});return()=>ac.abort()},[candidate?.id]);
 if(!candidate)return null;const rows=state?.data?.rows||[];
 const wins=rows.filter(row=>row.resultado?.startsWith('ELEITO'));
 const parties=new Set(rows.map(row=>row.partido).filter(Boolean));
 const offices=new Set(rows.map(row=>row.cargo).filter(Boolean));
 const firstWin=wins[0],elapsed=firstWin&&rows[0]?firstWin.ano-rows[0].ano:null;

 return <section className="expo-timeline"><span className="expo-kicker">LINHA DO TEMPO / CANDIDATURAS OBSERVADAS</span><h3>{candidate.nome}</h3>{!state?<p role="status">Buscando as eleições desta pessoa…</p>:state.error?<p>O histórico completo exige consulta ao acervo. A ficha selecionada não permite reconstruir eleições anteriores.</p>:!rows.length?<p>Nenhuma trajetória vinculada a este identificador.</p>:<><p>{fmt(rows.length,0)} candidaturas e {fmt(wins.length,0)} vitórias observadas; {fmt(parties.size,0)} siglas e {fmt(offices.size,0)} cargos. {firstWin?`Primeira vitória observada em ${firstWin.ano}, ${elapsed} anos após a primeira candidatura registrada.`:'Nenhuma vitória observada neste período.'}</p><ol>{rows.map(r=><li key={r.id}><strong>{r.ano}</strong><div><b>{r.cargo} · {r.partido||'Sigla não informada'}</b><p>{r.municipio||'Disputa estadual'} / {r.uf} · {fmt(r.votos,0)} votos</p><p>{r.resultado||'Resultado indefinido'} · Despesas: {brl(r.gastos)} · Patrimônio: {brl(r.patrimonio)} · Idade na eleição: {fmt(r.idade,0)} · {r.escolaridade||'Escolaridade não informada'}</p></div></li>)}</ol><Source data={state.data} scope="Último turno por ano, cargo e território"/><EvidenceRecords rows={rows} name="trajetoria-candidaturas"/></>}<p className="expo-limit">A linha mostra candidaturas vinculadas à mesma pessoa, não mandatos efetivamente exercidos. Lacunas não explicam saída da política.</p></section>;
}
