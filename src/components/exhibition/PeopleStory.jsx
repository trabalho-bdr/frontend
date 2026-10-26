import {lazy,Suspense,useState,useEffect} from 'react';
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,CartesianGrid,LabelList} from 'recharts';
import {Lead,Meaning,Explore,Source,EvidenceRecords,useEvidence,Unavailable,ReadingScope,Counterpoint,RelatedStories} from './Story.jsx';
import {fmt} from '../../data/exhibition.js';
import {readContext,writeContext} from '../../data/investigationContext.js';
import {states} from '../../data/catalog.js';
import {getIndicadorTrajetorias} from '../../data/client.js';
const School=lazy(()=>import('../EscolaridadeDossie.jsx'));
const Wealth=lazy(()=>import('../PatrimonioMapaDossie.jsx'));

export default function PeopleStory({story='trajetorias',mode,onStory,onGo}){
 const [uf,setUf]=useState(()=>readContext().uf||'');
 const [trajetoriasData,setTrajetoriasData]=useState(null);
 const [trajetoriasLoading,setTrajetoriasLoading]=useState(false);

 const selected=story==='escolaridade'?'escolaridade':story==='patrimonio'?'patrimonio':story==='juventude'?'juventude':'trajetorias';
 const state=useEvidence(selected==='juventude'||selected==='trajetorias'?'continuidade':selected,{uf});
 const data=state.data,rows=data?.rows||[];
 const recorte=[data?.scope?.cargo,data?.scope?.ano,uf||'seis UFs'].filter(Boolean).join(' · ');

 useEffect(()=>{
  if(selected==='trajetorias'){
   let active=true;
   setTrajetoriasLoading(true);
   getIndicadorTrajetorias().then(res=>{
    if(active&&res?.resumo)setTrajetoriasData(res);
   }).catch(()=>{
    if(active)setTrajetoriasData(null);
   }).finally(()=>{
    if(active)setTrajetoriasLoading(false);
   });
   return()=>{active=false};
  }
 },[selected]);

 const totals=['18–29 anos','30 anos ou mais'].map(faixa=>{const list=rows.filter(row=>row.faixa===faixa),pessoas=list.reduce((sum,row)=>sum+row.pessoas,0),retornos=list.reduce((sum,row)=>sum+row.retornos,0);return {faixa,pessoas,retornos,taxa:pessoas?100*retornos/pessoas:null}});
 const [young,older]=totals;
 const schools=rows.filter(row=>row.definidos>0).map(row=>({...row,taxa:100*row.eleitos/row.definidos}));
 const noDegree=schools.filter(row=>row.escolaridade!=='SUPERIOR COMPLETO').reduce((sum,row)=>sum+row.eleitos,0);
 const degree=schools.find(row=>row.escolaridade==='SUPERIOR COMPLETO');
 const otherDefined=schools.filter(row=>row.escolaridade!=='SUPERIOR COMPLETO').reduce((sum,row)=>sum+row.definidos,0);
 const schoolComparison=degree&&otherDefined?[{grupo:'Sem superior completo',taxa:100*noDegree/otherDefined},{grupo:'Superior completo',taxa:degree.taxa}]:[];
 const wealth=rows.map(row=>({...row,grupo:row.quartil+'º quartil'})),lower=wealth[0],upper=wealth.at(-1);
 const wealthDelta=wealth.length>=2&&Number.isFinite(lower.taxa)&&Number.isFinite(upper.taxa)?upper.taxa-lower.taxa:null;
 const youthReady=young?.taxa!=null&&older?.taxa!=null;

 // Dados de Trajetórias (Q10)
 const trajResumo=trajetoriasData?.resumo;
 const trajTotal=trajResumo?.total_pessoas??null;
 const trajChartData=trajResumo?[
  {grupo:'Disputaram 2+ pleitos',pessoas:trajResumo.multi_anos,pct:100*trajResumo.multi_anos/trajTotal},
  {grupo:'Mudaram de partido',pessoas:trajResumo.multi_partidos,pct:100*trajResumo.multi_partidos/trajTotal},
  {grupo:'Disputaram 3+ pleitos',pessoas:trajResumo.tres_ou_mais_anos,pct:100*trajResumo.tres_ou_mais_anos/trajTotal},
  {grupo:'Duas ou mais vitórias',pessoas:trajResumo.multi_vitorias,pct:100*trajResumo.multi_vitorias/trajTotal}
 ]:rows.length?[
  {grupo:'Voltaram em 2024',pessoas:rows.reduce((s,r)=>s+r.retornos,0),pct:100*rows.reduce((s,r)=>s+r.retornos,0)/Math.max(1,rows.reduce((s,r)=>s+r.pessoas,0))},
  {grupo:'Mudaram de sigla',pessoas:rows.reduce((s,r)=>s+r.mudancas_partido,0),pct:100*rows.reduce((s,r)=>s+r.mudancas_partido,0)/Math.max(1,rows.reduce((s,r)=>s+r.pessoas,0))},
  {grupo:'Mudaram de cargo',pessoas:rows.reduce((s,r)=>s+r.mudancas_cargo,0),pct:100*rows.reduce((s,r)=>s+r.mudancas_cargo,0)/Math.max(1,rows.reduce((s,r)=>s+r.pessoas,0))}
 ]:[];

 return <section className="expo-story">
 <nav className="expo-story-tabs" aria-label="Histórias do Fichário">{[
  ['trajetorias','Trajetórias e retornos'],
  ['juventude','Juventude e coorte'],
  ['escolaridade','Escolaridade'],
  ['patrimonio','Patrimônio']
 ].map(([id,label])=><button key={id} aria-pressed={selected===id} onClick={()=>onStory(id)}>{label}</button>)}</nav>

 {selected==='trajetorias'?<>
 <Lead kicker="PESSOAS E TRAJETÓRIAS / TRAJETÓRIAS" question="Quantas vezes um nome volta a disputar?" discovery={trajResumo?`No acervo de 2002 a 2024, ${fmt(trajResumo.multi_anos,0)} das ${fmt(trajTotal,0)} pessoas (${fmt(100*trajResumo.multi_anos/trajTotal,1)}%) disputaram mais de uma eleição nas seis UFs.`:'Calculando as trajetórias das pessoas no acervo histórico…'}/>
 <ReadingScope>Pessoas com candidaturas entre 2002 e 2024 · seis UFs · pleitos ordinários</ReadingScope>
 {trajChartData.length?<><div className="expo-chart expo-chart-simple" aria-label="Distribuição de trajetórias eleitorais"><ResponsiveContainer width="100%" height={230}><BarChart data={trajChartData} layout="vertical" margin={{left:16,right:75,top:8,bottom:8}}><CartesianGrid horizontal={false} stroke="#e6ddcb"/><XAxis type="number" domain={[0,Math.min(100,Math.max(...trajChartData.map(r=>r.pct))*1.25||1)]} unit="%"/><YAxis type="category" dataKey="grupo" width={180} tick={{fontSize:13}}/><Tooltip formatter={(val,name,item)=>`${fmt(val,1)}% (${fmt(item.payload.pessoas,0)} pessoas)`}/><Bar dataKey="pct" name="Percentual de pessoas" fill="#173e78" barSize={26}><LabelList dataKey="pct" position="right" formatter={v=>fmt(v,1)+'%'}/></Bar></BarChart></ResponsiveContainer></div><Meaning limit="Cada pessoa é identificada pelo id_candidato. As candidaturas observadas referem-se às seis UFs analisadas. A ausência de registro entre pleitos não significa abandono da vida partidária.">As categorias se sobrepõem: uma pessoa pode ter disputado vários pleitos e mudado de partido. Ter concorrido em mais de um ano não indica necessariamente mandatos consecutivos exercidos.</Meaning><Source data={trajetoriasData||data} scope="Acervo histórico 2002–2024 · 6 UFs · primeiro turno"/></>:<Unavailable loading={trajetoriasLoading} empty={!trajetoriasLoading}/>}
 <Explore title="Explorar mais: coorte de vereadores 2020 → 2024"><Counterpoint>Entre quem disputou vereador em 2020 nas seis UFs, parte retornou em 2024 para o mesmo cargo e parte mudou de sigla ou de cargo. A permanência na disputa reflete tanto capital eleitoral quanto dinâmicas partidárias locais.</Counterpoint><EvidenceRecords rows={rows} name="coorte-trajetorias-2020-2024"/></Explore>
 </>:selected==='escolaridade'?<>
 <Lead kicker="PESSOAS E TRAJETÓRIAS / ESCOLARIDADE" question="É preciso ter ensino superior para se eleger?" discovery={data&&schools.length?`${fmt(noDegree,0)} candidaturas sem superior completo foram eleitas neste recorte; ter diploma superior não foi condição necessária.`:'Ainda não há dados suficientes deste recorte para avaliar a escolaridade.'}/>
 <ReadingScope>{recorte} · primeiro turno · resultado definido para calcular taxas</ReadingScope>
 {schoolComparison.length?<><div className="expo-chart expo-chart-simple" aria-label="Taxa de eleição com e sem superior completo"><ResponsiveContainer width="100%" height={190}><BarChart data={schoolComparison} layout="vertical" margin={{left:10,right:60,top:8,bottom:8}}><CartesianGrid horizontal={false} stroke="#e6ddcb"/><XAxis type="number" domain={[0,Math.min(100,Math.max(...schoolComparison.map(row=>row.taxa))*1.2||1)]} unit="%"/><YAxis type="category" dataKey="grupo" width={165} tick={{fontSize:14}}/><Tooltip formatter={value=>fmt(value)+'%'}/><Bar dataKey="taxa" name="Taxa de eleição" fill="#173e78" barSize={32}><LabelList dataKey="taxa" position="right" formatter={value=>fmt(value,1)+'%'} style={{fontSize:15,fontWeight:700}}/></Bar></BarChart></ResponsiveContainer></div><Meaning limit="A análise não ajusta gastos, experiência, partido ou município. A base não contém escolaridade do eleitorado e não demonstra causa.">Cada barra mostra eleitos divididos pelas candidaturas com resultado definido no grupo. A quantidade de eleitos, sozinha, não permite comparar chances entre grupos de tamanhos diferentes.</Meaning><Source data={data} scope={recorte+' · primeiro turno'}/></>:<Unavailable {...state} empty={!!data}/>}
 <Explore title="Explorar mais: escolaridade e diferenças estaduais"><Counterpoint>{degree?`Superior completo também teve ${fmt(degree.eleitos,0)} eleitos entre ${fmt(degree.definidos,0)} candidaturas com resultado definido, taxa de ${fmt(degree.taxa)}%. `:''}A existência de eleitos sem diploma não prova chances iguais entre os grupos. Confira os denominadores antes de comparar.</Counterpoint><EvidenceRecords rows={rows} name="escolaridade-vereador-2024"/><Suspense fallback={<p>Carregando o dossiê…</p>}><School/></Suspense></Explore>
 </>:selected==='patrimonio'?<>
 <Lead kicker="PESSOAS E TRAJETÓRIAS / PATRIMÔNIO" question="Quem tem mais patrimônio se elege mais?" discovery={wealthDelta==null?'Ainda não há faixas suficientes para comparar patrimônio e eleição neste recorte.':`A taxa de eleição na faixa de maior patrimônio ficou ${fmt(Math.abs(wealthDelta))} pontos percentuais ${wealthDelta>0?'acima':'abaixo'} da faixa de menor patrimônio.`}/>
 <ReadingScope>{recorte} · patrimônio declarado não negativo</ReadingScope>
 {wealthDelta!=null?<><div className="expo-chart expo-chart-simple" aria-label="Taxa de eleição nas faixas extremas de patrimônio"><ResponsiveContainer width="100%" height={190}><BarChart data={[{grupo:'Menor patrimônio',taxa:lower.taxa},{grupo:'Maior patrimônio',taxa:upper.taxa}]} layout="vertical" margin={{left:8,right:65,top:8,bottom:8}}><CartesianGrid horizontal={false} stroke="#e6ddcb"/><XAxis type="number" domain={[0,Math.min(100,Math.max(lower.taxa,upper.taxa)*1.2||1)]} unit="%"/><YAxis type="category" dataKey="grupo" width={135} tick={{fontSize:14}}/><Tooltip formatter={value=>fmt(value)+'%'}/><Bar dataKey="taxa" name="Taxa de eleição" fill="#173e78" barSize={32}><LabelList dataKey="taxa" position="right" formatter={value=>fmt(value,1)+'%'} style={{fontSize:15,fontWeight:700}}/></Bar></BarChart></ResponsiveContainer></div><Meaning limit="Patrimônio não negativo, resultado definido no primeiro turno. A diferença não demonstra causalidade. Quartis têm número semelhante de pessoas, não intervalos iguais em reais.">As barras mostram as faixas extremas entre quatro grupos de tamanho semelhante. {data?.coverage&&<>Cobertura: {fmt(data.coverage.conhecidos,0)} de {fmt(data.coverage.total,0)} candidaturas ({fmt(data.coverage.cobertura_pct)}%).</>} A taxa divide eleitos por candidaturas com resultado definido em cada faixa.</Meaning><Source data={data} scope={recorte+' · primeiro turno'}/></>:<Unavailable {...state} empty={!!data}/>}
 <Explore title="Explorar mais: patrimônio por faixa e município"><Counterpoint>Na faixa de menor patrimônio, {fmt(lower?.eleitos,0)} candidaturas também foram eleitas. Patrimônio declarado não determina sozinho o resultado; partido, território, gastos e experiência podem estar associados.</Counterpoint><EvidenceRecords rows={wealth} name="patrimonio-quartis-referencia"/><Suspense fallback={<p>Carregando o mapa de patrimônio…</p>}><Wealth mode={mode}/></Suspense></Explore>
 </>:<>
 <Lead kicker="PESSOAS E TRAJETÓRIAS / CONTINUIDADE" question="Quem consegue permanecer na disputa?" discovery={youthReady?`A taxa de retorno dos jovens ficou ${fmt(Math.abs(young.taxa-older.taxa))} pontos percentuais ${young.taxa>=older.taxa?'acima':'abaixo'} da taxa das pessoas de 30 anos ou mais.`:'Ainda não há grupos comparáveis para avaliar o retorno às candidaturas.'}/>
 <ReadingScope>Coorte de vereador em 2020 → candidaturas em 2024 · {uf||'seis UFs'}</ReadingScope>
 {youthReady?<><div className="expo-chart expo-chart-simple" aria-label="Taxa de retorno por faixa etária"><ResponsiveContainer width="100%" height={190}><BarChart data={totals} layout="vertical" margin={{left:8,right:65,top:8,bottom:8}}><CartesianGrid horizontal={false} stroke="#e6ddcb"/><XAxis type="number" domain={[0,100]} unit="%"/><YAxis type="category" dataKey="faixa" width={145} tick={{fontSize:14}}/><Tooltip formatter={value=>fmt(value)+'%'}/><Bar dataKey="taxa" name="Voltaram a disputar" fill="#173e78" barSize={32}><LabelList dataKey="taxa" position="right" formatter={value=>fmt(value,1)+'%'} style={{fontSize:15,fontWeight:700}}/></Bar></BarChart></ResponsiveContainer></div><Meaning limit="Idade em 2020; cada pessoa conta uma vez. O retorno observa candidaturas de 2024 nas seis UFs, em qualquer cargo disponível. Não reaparecer não significa abandonar a política.">A taxa divide as pessoas que retornaram pelo total de cada faixa etária em 2020. Os denominadores e registros estão no detalhamento abaixo.</Meaning><Source data={data} scope={`Vereador 2020 → candidaturas 2024 · ${uf||'6 UFs'}`}/></>:<Unavailable {...state} empty={!!data}/>}
 <Explore title="Explorar mais: investigue retorno, resultado e mudança de partido"><Counterpoint>{fmt(young.pessoas-young.retornos,0)} jovens da coorte não reapareceram no recorte observado. Isso não informa se exerceram mandato, concorreram fora das seis UFs ou por que deixaram de disputar.</Counterpoint><div className="expo-filters"><label>UF da candidatura de 2020<select value={uf} onChange={event=>setUf(event.target.value)}><option value="">Seis UFs</option>{states.map(item=><option key={item.uf}>{item.uf}</option>)}</select></label></div><EvidenceRecords rows={rows} name="juventude-continuidade-2020-2024"/></Explore>
 </>}

 <RelatedStories items={onGo?[{label:'Gastos e eleição',onClick:()=>onGo('plenario','gastos')},{label:'Votos e partidos',onClick:()=>onGo('partidos')},{label:'Municípios e abstenção',onClick:()=>onGo('atlas','territorio')}]:[]}/>
 </section>;
}
