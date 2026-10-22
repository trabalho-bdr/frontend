/**
 * Folha de comparação reutilizada entre as seções existentes. Os gráficos usam
 * agregações auditadas e a mesma fonte de dados das fichas, sem inventar séries.
 * Contextos: arquivo, atlas, partidos, campanhas, adesivaria, plenario, mesa.
 */
import {useEffect,useMemo,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowLeftRight,ArrowUpRight,ChartNoAxesCombined,Download,FileSpreadsheet,Info,RefreshCw} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Cell,Line,LineChart,
        ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {getComparison} from '../data/client.js';
import {comparisonSnapshot} from '../data/comparisonSnapshot.js';
import {states} from '../data/snapshot.js';
import {comparisonMetrics,buildComparisonChart,formatComparisonValue,isComparableCandidates} from '../data/comparisonLogic.js';
import {seriesStyle,comparisonFindings,compactChartValue} from '../data/comparisonPresentation.js';
import {indicatorSettings} from '../atlas/geography.js';
import {PrintLabel} from './Editorial.jsx';
import useMotionPreference from '../hooks/useMotionPreference.js';

const ALL_CARGOS=['VEREADOR','DEPUTADO FEDERAL','DEPUTADO ESTADUAL','PRESIDENTE'];
const PARTIES=['','PT','PL','PSOL','PSD','MDB','UNIÃO','PP','REPUBLICANOS','PSDB','PDT','PSB','NOVO','REDE','PODE'];
const TITLES={legenda:'VOTOS DE LEGENDA',abstencao:'ABSTENÇÃO ELEITORAL',cadeiras:'CUSTO POR CADEIRA',escolaridade:'ESCOLARIDADE E VITÓRIA',propaganda:'GASTOS DE PROPAGANDA',patrimonio:'PATRIMÔNIO E ELEIÇÃO',fichas:'FICHAS LADO A LADO',municipios:'DOIS MUNICÍPIOS'};
const OPTIONS={
 arquivo:['escolaridade','patrimonio'],
 atlas:['abstencao','legenda','municipios'],
 partidos:['legenda','propaganda'],
 campanhas:['propaganda','cadeiras'],
 adesivos:['propaganda'],
 plenario:['cadeiras','legenda'],
 investigacoes:['legenda','escolaridade','patrimonio','cadeiras','abstencao','propaganda'],
 fichas:['fichas']
};
const OFFICE_LABEL={'VEREADOR':'Vereador','DEPUTADO FEDERAL':'Deputado federal','DEPUTADO ESTADUAL':'Deputado estadual','PRESIDENTE':'Presidente da República'};
const schoolScopes=[['2024','VEREADOR'],['2022','DEPUTADO ESTADUAL'],['2022','DEPUTADO FEDERAL'],['2022','PRESIDENTE'],['2018','PRESIDENTE']];
const wealthScopes=[['2024','VEREADOR'],['2020','VEREADOR'],['2022','DEPUTADO ESTADUAL'],['2018','DEPUTADO FEDERAL'],['2022','DEPUTADO FEDERAL'],['2018','DEPUTADO ESTADUAL'],['2022','PRESIDENTE'],['2018','PRESIDENTE']];
const valueOf=(v)=>v==null?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:2});
const s=(n)=>String(n??'');
function selectorsToRows(kind,municipios,candidatos,metrica,first,second){
 if(kind==='fichas')return candidatos.map(c=>({serie:c.nome,valor:c[metrica]??null,partido:c.partido,ano:c.ano,cargo:c.cargo,uf:c.uf}));
 if(kind==='municipios')return [first,second].map(id=>municipios.find(m=>m.id===id)).filter(Boolean).map(m=>({serie:`${m.nome} (${m.uf})`,valor:m[metrica]??null,id:m.id}));
 return [];
}
function downloadRows(filename,header,rows){
 const cell=v=>'"'+String(v==null?'':v).replaceAll('"','""')+'"';
 const csv='\uFEFF'+[header,...rows].map(r=>r.map(cell).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function CategoryTick({x,y,payload,horizontal=false}){
 const lines=[];
 for(const word of String(payload.value).split(' ')){
   const index=lines.length-1;
   if(index<0||lines[index].length+word.length> (horizontal?19:14))lines.push(word);
   else lines[index]+=' '+word;
 }
 return <text x={x} y={y} textAnchor={horizontal?'end':'middle'} fill="#344D51" fontSize={10} fontFamily="DM Sans, sans-serif">{lines.map((line,index)=><tspan x={x} dy={index===0?(horizontal?-(lines.length-1)*6:16):12} key={index}>{line}</tspan>)}</text>;
}
function FindingNotes({findings,formatDelta}){
 if(!findings.length)return null;
 return <aside className="compare-findings" aria-label="Leituras calculadas do gráfico">{findings.map((finding,index)=><article key={index}><span>{finding.type==='change'?`${finding.serie} · ${finding.fromYear} → ${finding.toYear}`:finding.type==='gap'?`DISTÂNCIA EM ${finding.year}`:'DIFERENÇA ENTRE EXTREMOS'}</span><strong>{finding.type==='change'?(finding.delta>0?'+':finding.delta<0?'−':''):''}{formatDelta(Math.abs(finding.delta))}</strong><p>{finding.type==='change'?'Variação observada na mesma série.':`${finding.high} − ${finding.low}`}</p></article>)}</aside>;
}
const Combo=({title,selected,onChange,options})=><label className="compare-label"><span>{title}</span><select value={selected} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
const UFOPTIONS=[{value:'',label:'Todos os seis estados'},...states.map(x=>({value:x.uf,label:x.nome}))];
const partiesOptions=PARTIES.map(p=>({value:p,label:p||'Todos os partidos'}));
const officeOptions=ALL_CARGOS.map(c=>({value:c,label:OFFICE_LABEL[c]}));
const toScopes=arr=>arr.map(([ano,cargo])=>({value:`${ano}|${cargo}`,label:`${ano} · ${OFFICE_LABEL[cargo]}`}));
const MetricOptions=({kind,metric,setMetric})=><div className="compare-metric-choices" role="group" aria-label="Indicador do gráfico">{comparisonMetrics(kind).map(({key,label})=><button type="button" key={key} className={metric===key?'active':''} aria-pressed={metric===key} onClick={()=>setMetric(key)}>{label}</button>)}</div>;
const formatTooltip=(value,metric,kind)=>value==null?'Sem informação':formatComparisonValue(value,metric,kind);

export default function ComparisonPanel({topic='investigacoes',mode='snapshot',candidates=[],municipios=[],defaultKind}){
 const choices=OPTIONS[topic]??OPTIONS.investigacoes;
 const [kind,setKind]=useState(defaultKind&&choices.includes(defaultKind)?defaultKind:choices[0]);
 const [cargo,setCargo]=useState('VEREADOR'),[uf,setUf]=useState('');
 const [firstParty,setFirstParty]=useState(''),[secondParty,setSecondParty]=useState(''),[promoParty,setPromoParty]=useState('');
 const [ufs,setUfs]=useState(['RJ','RS']);
 const [schoolScope,setSchoolScope]=useState('2024|VEREADOR'),[wealthScope,setWealthScope]=useState('2024|VEREADOR');
 const [metric,setMetric]=useState('valor');
 const [rowsResult,setRowsResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[version,setVersion]=useState(0);
 const [showTable,setShowTable]=useState(false);
 const [lineEffects,setLineEffects]=useState(true);
 const reducedMotion=useMotionPreference();
 const [focusSeries,setFocusSeries]=useState(null),[plotWidth,setPlotWidth]=useState(700);
 const [townOne,setTownOne]=useState(''),[townTwo,setTownTwo]=useState('');
 useEffect(()=>{setMetric(comparisonMetrics(kind)[0].key);setShowTable(false)},[kind]);
 useEffect(()=>setFocusSeries(null),[kind,firstParty,secondParty,uf,ufs.join(',')]);
 useEffect(()=>{if(!choices.includes(kind))setKind(choices[0])},[topic,choices.join('|')]);
 useEffect(()=>{if(municipios.length<1)return;
   if(!municipios.some(m=>m.id===townOne))setTownOne(municipios[0].id);
   if(!municipios.some(m=>m.id===townTwo))setTownTwo(municipios[Math.min(1,municipios.length-1)].id);
 },[municipios,townOne,townTwo]);
 const params=useMemo(()=>{
    if(kind==='legenda')return {cargo,uf,primeiro:firstParty,segundo:secondParty};
    if(kind==='abstencao')return {ufs:ufs.join(',')};
    if(kind==='cadeiras')return {cargo,uf};
    if(kind==='propaganda')return {cargo,uf,partido:promoParty};
    if(kind==='escolaridade'){const [ano,cargo]=schoolScope.split('|');return {ano,cargo,uf}}
    if(kind==='patrimonio'){const [ano,cargo]=wealthScope.split('|');return {ano,cargo,uf}}
    return {};
 },[kind,cargo,uf,firstParty,secondParty,promoParty,ufs.join(','),schoolScope,wealthScope]);
 const offline=useMemo(()=>comparisonSnapshot(kind,params),[kind,JSON.stringify(params)]);
 useEffect(()=>{
   let active=true;
   if(kind==='fichas'||kind==='municipios'){setRowsResult(null);setError('');setBusy(false);return;}
   if(mode!=='live'){setRowsResult(offline);setError('');setBusy(false);return;}
   setBusy(true);setError('');setRowsResult(null);
   const timer=setTimeout(()=>getComparison(kind,params).then(result=>{if(active)setRowsResult(result)}).catch(()=>{
      if(active){setError('Não foi possível atualizar esta comparação agora.');setRowsResult(offline)}
   }).finally(()=>{if(active)setBusy(false)}),140);
   return ()=>{active=false;clearTimeout(timer)};
 },[mode,kind,JSON.stringify(params),version,offline]);
 const local=kind==='fichas'||kind==='municipios';
 const localRows=useMemo(()=>selectorsToRows(kind,municipios,candidates,metric,townOne,townTwo),[kind,municipios,candidates,metric,townOne,townTwo]);
 const result=local?{rows:localRows,source:mode==='live'?'consulta':'snapshot'}:rowsResult;
 const rows=result?.rows??[];
 const comparable=isComparableCandidates(candidates);
 const expectedYears=useMemo(()=>(['legenda','cadeiras','propaganda'].includes(kind)?(cargo==='VEREADOR'?[2020,2024]:[2018,2022]):kind==='abstencao'?[2022,2024]:null),[kind,cargo]);
 const chart=useMemo(()=>buildComparisonChart(kind,rows,metric,expectedYears),[kind,rows,metric,expectedYears]);
 const unit=(kind==='fichas' || kind==='municipios')?null:result?.unidade;
 const moneyMetric=(kind==='fichas'&&['gastos','patrimonio'].includes(metric))||(kind==='municipios'&&metric==='pib_per_capita')||(kind==='cadeiras')||(kind==='propaganda'&&metric==='valor')||(kind==='patrimonio'&&metric==='mediana');
 const percentageMetric=(kind==='municipios'&&metric==='abstencao_2024')||(['legenda','abstencao','escolaridade','patrimonio'].includes(kind)&&metric==='valor');
 const formatter=(n)=>n==null?'—':moneyMetric?Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2}):percentageMetric?valueOf(n)+'%':Number(n).toLocaleString('pt-BR',{maximumFractionDigits:metric==='idhm'?3:2});
 const deltaFormatter=n=>percentageMetric?valueOf(n)+' p.p.':formatter(n);
 const findings=useMemo(()=>kind==='fichas'&&!comparable?[]:comparisonFindings(chart),[chart,kind,comparable]);
 const scope=kind==='municipios'?`${indicatorSettings[metric]?.context||''} · ${[...new Set(municipios.filter(m=>m.id===townOne||m.id===townTwo).map(m=>m.uf))].join(' / ')}`:
   kind==='fichas'?[...new Set(candidates.map(c=>`${c.ano} · ${c.cargo} · ${c.uf}`))].join(' / '):
   `${expectedYears?.join(' / ')||params.ano||'Ano do recorte'} · ${kind==='abstencao'?'Participação eleitoral · sem recorte por cargo':OFFICE_LABEL[params.cargo]||cargo} · ${kind==='abstencao'?ufs.join(' / '):uf||'CE / MA / MS / RJ / RN / RS'}`;
 const caption=kind==='fichas'?`${candidates.length} candidaturas selecionadas`:
    kind==='municipios'?'Municípios do atlas · mesma métrica':result?.escopo||'Dados do recorte eleitoral';
 const methodology=kind==='fichas'?'Valores declarados ou votação no recorte de cada candidatura; a comparação não indica causalidade.':
    kind==='municipios'?'Somente municípios cobertos pelo atlas. Compare o mesmo indicador; dados ausentes não equivalem a zero.':
    result?.metodo||'Selecione outro filtro para carregar dados deste recorte.';
 const rowsTable=kind==='fichas'||kind==='municipios'?rows.map(r=>[r.serie,r.valor]):
    chart.raw.map(r=>[r.ano??r.quartil??r.serie,r.serie,r[metric]??null,
       ...(kind==='legenda'?[r.legenda??null,r.nominais??null]:[]),
       ...(kind==='cadeiras'?[r.eleitos??null,r.gasto_total??null]:[]),
       ...(kind==='escolaridade'?[r.candidaturas??null,r.eleitos??null,r.definidos??null]:[]),
       ...(kind==='propaganda'?[r.lancamentos??null]:[])]);
 const tableHeaders=kind==='fichas'||kind==='municipios'?['Elemento','Valor']:
    ['Ano / grupo','Série','Indicador',
       ...(kind==='legenda'?['Votos de legenda','Votos nominais']:[]),
       ...(kind==='cadeiras'?['Eleitos','Despesas agregadas']:[]),
       ...(kind==='escolaridade'?['Candidaturas','Eleitos','Resultados definidos']:[]),
       ...(kind==='propaganda'?['Lançamentos']:[])];
 return <section className="comparison-panel" aria-label="Painel de gráficos comparativos">
   <header className="comparison-heading"><div><PrintLabel tone="blue"><ArrowLeftRight size={14}/> CADERNO ESTATÍSTICO / LEITURA CRUZADA</PrintLabel><h3>DOIS RECORTES.<br/><em>OUTRAS LEITURAS.</em></h3><p>Compare os números, acompanhe uma série e confira a fonte. Cada diferença começa com uma pergunta.</p></div><div className="comparison-seal">DADOS<br/>EM<br/>PERSPECTIVA <ArrowUpRight size={25}/></div></header>
   {choices.length>1&&<div className="compare-tabs" role="group" aria-label="Tipos de comparação">{choices.map(k=><button type="button" key={k} aria-pressed={kind===k} className={kind===k?'active':''} onClick={()=>setKind(k)}>{TITLES[k]}</button>)}</div>}
   <div className="compare-document"><div className="compare-doc-cap"><span>◉ {TITLES[kind]}</span><span>{caption}</span></div>
    <div className="compare-filters" aria-label="Filtros da comparação">
      {['legenda','cadeiras','propaganda'].includes(kind)&&<Combo title="Cargo (mesma disputa)" selected={cargo} onChange={setCargo} options={kind==='legenda'?officeOptions.filter(o=>o.value!=='PRESIDENTE'):officeOptions}/>}
      {['legenda','cadeiras','propaganda','patrimonio','escolaridade'].includes(kind)&&<Combo title="Estado" selected={uf} onChange={setUf} options={UFOPTIONS}/>}
      {kind==='legenda'&&<><Combo title="Partido / série 1" selected={firstParty} onChange={v=>{setFirstParty(v);if(!v||v===secondParty)setSecondParty('')}} options={partiesOptions}/>
       {firstParty&&<Combo title="Comparar com" selected={secondParty} onChange={setSecondParty} options={[{value:'',label:'Sem segunda série'},...partiesOptions.filter(p=>p.value&&p.value!==firstParty)]}/>}</>}
      {kind==='propaganda'&&<Combo title="Partido" selected={promoParty} onChange={setPromoParty} options={partiesOptions}/>}
      {kind==='escolaridade'&&<Combo title="Eleição e cargo" selected={schoolScope} onChange={setSchoolScope} options={toScopes(schoolScopes)}/>}
      {kind==='patrimonio'&&<Combo title="Eleição e cargo" selected={wealthScope} onChange={setWealthScope} options={toScopes(wealthScopes)}/>}
      {kind==='abstencao'&&<div className="compare-ufs"><span>COMPARAR ESTADOS (ATÉ 3)</span><div>{states.map(({uf})=><button type="button" key={uf} aria-pressed={ufs.includes(uf)} className={ufs.includes(uf)?'active':''} onClick={()=>setUfs(prev=>prev.includes(uf)?(prev.length>1?prev.filter(v=>v!==uf):prev):(prev.length>=3?[...prev.slice(1),uf]:[...prev,uf]))}>{uf}</button>)}</div></div>}
      {kind==='municipios'&&<><Combo title="Município A" selected={townOne} onChange={setTownOne} options={municipios.map(m=>({value:m.id,label:`${m.nome} / ${m.uf}`}))}/><Combo title="Município B" selected={townTwo} onChange={setTownTwo} options={municipios.map(m=>({value:m.id,label:`${m.nome} / ${m.uf}`}))}/></>}
     </div>
     <MetricOptions kind={kind} metric={metric} setMetric={setMetric}/>
     {chart.type==='line'&&<div className="compare-effect-controls"><button type="button" aria-pressed={lineEffects} disabled={reducedMotion} onClick={()=>setLineEffects(v=>!v)}>{reducedMotion?'MOVIMENTO REDUZIDO':'DESENHO DAS LINHAS '+(lineEffects?'ATIVO':'DESATIVADO')}</button><span>A leitura segue do primeiro ao último ano. Lacunas continuam sem ligação.</span></div>}
     {busy?<div className="compare-state" role="status"><RefreshCw className="compare-spin"/> Consultando os dados do recorte…</div>:rows.length===0?<div className="compare-state" role="status"><Info size={25}/>{local&&kind==='fichas'?'Retire ao menos duas fichas e coloque-as na mesa para comparar.':(!local&&mode!=='live'?'Este filtro não faz parte da amostra arquivada. Ative a consulta ao acervo para ver o resultado.':error||'Nenhum valor disponível neste recorte.')}</div>:
     <AnimatePresence mode="wait"><motion.div className="compare-chart-shell" key={kind+'-'+metric+'-'+JSON.stringify(params)} initial={reducedMotion?false:{opacity:.4,y:10}} animate={{opacity:1,y:0}} exit={reducedMotion?undefined:{opacity:0}} transition={{duration:reducedMotion?0:.25}}>
        {error&&<p role="alert" className="compare-alert">{error} Exibindo somente os dados arquivados compatíveis com o filtro.</p>}
        <div className="compare-graph-title"><span className="compare-figure-number">FIG. 01 / {percentageMetric?'PORCENTAGEM':moneyMetric?'VALORES NOMINAIS EM R$':metric==='idhm'?'ÍNDICE MUNICIPAL':'VALORES DO INDICADOR'}</span><h4>{kind==='escolaridade'&&metric==='candidaturas'?'Quem disputa a eleição?':kind==='cadeiras'&&metric==='gasto_total'?'As despesas de cada eleição':result?.titulo||TITLES[kind]}</h4><p>{scope}</p></div>
        <div className="compare-actions"><div className="compare-view-switch" role="group" aria-label="Forma de leitura"><button type="button" aria-pressed={!showTable} onClick={()=>setShowTable(false)}><ChartNoAxesCombined size={15}/> GRÁFICO</button><button type="button" aria-pressed={showTable} onClick={()=>setShowTable(true)}><FileSpreadsheet size={15}/> TABELA</button></div><button type="button" onClick={()=>downloadRows(`arquivo-comparativo-${kind}.csv`,[...tableHeaders,'Recorte','Indicador','Fonte'],rowsTable.map(row=>[...row,scope,comparisonMetrics(kind).find(m=>m.key===metric)?.label,result?.source==='snapshot'?'Snapshot auditado em 21/10/2026':'Consulta ao acervo']))}><Download size={15}/> BAIXAR CSV</button></div>
        {chart.type==='line'&&!showTable&&<div className="compare-series-key" aria-label="Destaque uma série">{chart.series.map(serie=><button key={serie} type="button" aria-pressed={focusSeries===serie} onClick={()=>setFocusSeries(v=>v===serie?null:serie)}><i style={{borderColor:seriesStyle(serie).color,borderTopStyle:seriesStyle(serie).dash?'dashed':'solid'}} aria-hidden="true"/>{serie}</button>)}<small>Toque para destacar. As cores identificam séries, sem classificação política.</small></div>}
        {!showTable?<div className="compare-plot" role="group" aria-label={`Gráfico comparativo · ${scope}; veja a tabela para valores exatos`}><ResponsiveContainer width="100%" height={chart.type==='bar-horizontal'?Math.max(330,chart.points.length*45):350} onResize={width=>setPlotWidth(width)}>
          {chart.type==='line'?<LineChart accessibilityLayer data={chart.points} margin={{top:25,right:plotWidth<500?16:32,left:0,bottom:15}}><CartesianGrid vertical={false} stroke="#BBC9C6" strokeDasharray="2 5"/><XAxis dataKey="periodo" padding={{left:22,right:22}} tick={{fontSize:12,fill:'#274A55',fontWeight:700}} axisLine={{stroke:'#809A9D'}} tickLine={false}/><YAxis tickFormatter={compactChartValue} tick={{fontSize:10,fill:'#50666B'}} width={plotWidth<500?50:70} axisLine={false} tickLine={false}/><Tooltip formatter={v=>formatter(v)} labelFormatter={v=>'ELEIÇÃO '+v} contentStyle={{background:'#FFFCF5',border:'1px solid #547B8C',fontSize:12}}/>{chart.series.map(serie=><Line key={serie} dataKey={serie} name={serie} type="linear" stroke={seriesStyle(serie).color} strokeDasharray={seriesStyle(serie).dash} strokeOpacity={!focusSeries||focusSeries===serie?1:.25} strokeWidth={focusSeries===serie?4:3} dot={{r:5,strokeWidth:2,fill:'#FFFCF5',opacity:!focusSeries||focusSeries===serie?1:.25}} activeDot={{r:7}} connectNulls={false} isAnimationActive={lineEffects&&!reducedMotion} animationDuration={850} animationEasing="ease-out"/>)}</LineChart>:
          <BarChart accessibilityLayer data={chart.points} layout={chart.type==='bar-horizontal'?'vertical':'horizontal'} margin={{top:18,right:16,left:0,bottom:10}}><CartesianGrid stroke="#BBC9C6" strokeDasharray="2 5" vertical={chart.type==='bar-horizontal'} horizontal={chart.type!=='bar-horizontal'}/><XAxis type={chart.type==='bar-horizontal'?'number':'category'} dataKey={chart.type==='bar-horizontal'?undefined:'rotulo'} tick={chart.type==='bar-horizontal'?{fontSize:10}:<CategoryTick/>} tickFormatter={chart.type==='bar-horizontal'?compactChartValue:undefined} height={chart.type==='bar-horizontal'?35:90} interval={chart.type==='bar-horizontal'?'preserveStartEnd':0} tickLine={false} axisLine={{stroke:'#809A9D'}}/><YAxis type={chart.type==='bar-horizontal'?'category':'number'} dataKey={chart.type==='bar-horizontal'?'rotulo':undefined} width={chart.type==='bar-horizontal'?(plotWidth<500?120:175):55} interval={chart.type==='bar-horizontal'?0:undefined} tick={chart.type==='bar-horizontal'?<CategoryTick horizontal/>:{fontSize:10}} tickFormatter={chart.type==='bar-horizontal'?undefined:compactChartValue} tickLine={false} axisLine={false}/><Tooltip formatter={v=>formatter(v)} contentStyle={{background:'#FFFCF5',border:'1px solid #547B8C',fontSize:12}}/><Bar dataKey="valor" name={comparisonMetrics(kind).find(m=>m.key===metric)?.label} maxBarSize={42} isAnimationActive={!reducedMotion} animationDuration={550}>{chart.points.map((p,i)=><Cell key={i} fill={seriesStyle(p.rotulo).color}/>)}</Bar></BarChart>}
         </ResponsiveContainer></div>:<div className="compare-table-wrap"><table><caption>{TITLES[kind]} · {scope}</caption><thead><tr>{tableHeaders.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rowsTable.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{local&&j===1?formatter(v):j>=2&&typeof v==='number'?valueOf(v):v==null?'—':s(v)}</td>)}</tr>)}</tbody></table></div>}
        <FindingNotes findings={findings} formatDelta={deltaFormatter}/>
        <p className="compare-provenance">{result?.source==='snapshot'?'RECORTE ARQUIVADO · 21/10/2026':'CONSULTA ATUAL DO ACERVO'} · Diferenças calculadas somente sobre os valores disponíveis neste gráfico.</p>
      </motion.div></AnimatePresence>}
     <div className="compare-method"><Info size={18}/><p>{methodology}{kind==='fichas'&&!comparable&&candidates.length>1?' Atenção: fichas de anos, cargos ou UFs diferentes não formam uma disputa equivalente.':''} {kind==='municipios'&&townOne===townTwo?' Você selecionou o mesmo município nos dois campos.':''} <strong>Base limitada aos estados CE, MA, MS, RJ, RN e RS.</strong></p></div>
   </div>
 </section>;
}
