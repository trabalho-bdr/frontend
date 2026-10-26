import ThemeSection from './pages/ThemeSection.jsx';
import {parseRoute,moneyDestination} from './data/routes.js';
import AcervoNav from './catalog/AcervoNav.jsx';
import './catalog/acervo.css';
import {isProportionalInvestigation,normalizeInvestigationScope,investigationFields} from './data/filterScope.js';
import RecordCollection from './components/RecordCollection.jsx';
import {candidateContext} from './catalog/logic.js';
import {useEffect,useMemo,useRef,useState,lazy,Suspense} from 'react';
import {readContext,normalizeContext,connections} from './data/investigationContext.js';
import InvestigationContext from './components/InvestigationContext.jsx';
import {themes,questionDestinations} from './data/exhibition.js';
import {Explore,Lead,Meaning} from './components/exhibition/Story.jsx';
import PaineisBDR from './components/PaineisBDR.jsx';
import {AnimatePresence,motion} from 'motion/react';
import gsap from 'gsap';
import {
  Archive,ArrowRight,ArrowLeft,ArrowUpRight,BookOpen,Clapperboard,Coins,
  Database,FileText,Flag,FolderOpen,Globe2,Landmark,MapPin,Menu,Newspaper,
  Play,RotateCcw,Search,ChevronDown,SlidersHorizontal,SquareArrowOutUpRight,Ticket,
  Tv2,Users,Wallet,X,CheckCircle2,AlertTriangle
} from 'lucide-react';
import {
  BarChart,Bar,LineChart,Line,CartesianGrid,XAxis,YAxis,Tooltip,
  ResponsiveContainer,PieChart,Pie,Cell,Legend,ReferenceLine
} from 'recharts';
import GeoAtlas from './components/GeoAtlas.jsx';
import HomeEditorial from './pages/HomeEditorial.jsx';
import AtlasDiscoveries from './components/AtlasDiscoveries.jsx';
import {EditorialHeading,PrintLabel} from './components/Editorial.jsx';
import useMotionPreference from './hooks/useMotionPreference.js';
import {indicatorSettings as atlasIndicators,formatIndicator as formatAtlasIndicator} from './atlas/geography.js';
import {loadAtlasMunicipios,atlasCoverage,filterAtlasRows} from './atlas/data.js';
import ComparisonPanel from './components/ComparisonPanel.jsx';
import EscolaridadeDossie from './components/EscolaridadeDossie.jsx';
import CustoCadeiraDossie from './components/CustoCadeiraDossie.jsx';
import Descobertas from './pages/Descobertas.jsx';
import {blockSeats} from './components/data.js';
import {analyses,states,overview,stamp} from './data/catalog.js';
import {getHealth,getOverview,getAnalysis,request} from './data/client.js';


import PatrimonioMapaDossie from './components/PatrimonioMapaDossie.jsx';

const ProportionalStory=lazy(()=>import('./components/exhibition/ProportionalStory.jsx'));

const TerritoryStory=lazy(()=>import('./components/exhibition/TerritoryStory.jsx'));
const PeopleStory=lazy(()=>import('./components/exhibition/PeopleStory.jsx'));
const PartyStory=lazy(()=>import('./components/exhibition/PartyStory.jsx'));
const LegendaInvestigation=lazy(()=>import('./components/exhibition/LegendaInvestigation.jsx'));
const ExhibitionMethod=lazy(()=>import('./pages/ExhibitionMethod.jsx'));
const MoneySection=lazy(()=>import('./pages/MoneySection.jsx'));
const ResearchPage=lazy(()=>import('./pages/ResearchPage.jsx'));
const PartyCatalog=lazy(()=>import('./pages/PartyCatalog.jsx'));
const CandidateCatalog=lazy(()=>import('./pages/CandidateCatalog.jsx'));
const PersonProfile=lazy(()=>import('./pages/PersonProfile.jsx'));
const TerritoryCatalog=lazy(()=>import('./pages/TerritoryCatalog.jsx'));



const MuralCampanhas=lazy(()=>import('./pages/MuralCampanhas.jsx'));
const PrestacaoDeContas=lazy(()=>import('./pages/PrestacaoDeContas.jsx'));
const CostPerSeatStory=lazy(()=>import('./components/questao1/CostPerSeatStory.jsx'));


const COLORS=['#173e78','#d24c39','#e7b83d','#21765e','#68718a','#bb7847'];
const fNum=(n)=>n==null?'—':Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2});
const money=(n)=>n==null?'—':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
function initialRoute(){return parseRoute(location.hash)}



function Eyebrow({children}){return <div className="eyebrow"><span className="eyebrow-dot"/>{children}</div>}
function Frame({children,className='',label='',right=''}){return <div className={'frame '+className}><div className="frame-caption"><span>● {label}</span><span>{right||'ARQUIVO DA DEMOCRACIA · 2026'}</span></div>{children}</div>}
function Stamp({children,tone='red'}){return <span className={'stamp stamp-'+tone}>{children}</span>}
function Status({mode}){return <span className={'status status-'+(mode==='live'?'live':'snap')}><span/>{mode==='live'?'ACERVO ATUALIZADO':'ACERVO CONSULTÁVEL'}</span>}
function SectionHero({kicker,title,detail,children}){return <div className="section-header"><div><Eyebrow>{kicker}</Eyebrow><h2>{title}</h2><p>{detail}</p></div>{children}</div>}
function Atlas({mode,onResearch,onGo,initialUf='',initialMunicipio='',initialMunicipioNome=''}){
 const [uf,setUf]=useState(initialUf),[text,setText]=useState(initialMunicipioNome),[liveData,setLiveData]=useState(null),[failedUf,setFailedUf]=useState(null),[requestVersion,setRequestVersion]=useState(0);
 const [indicator,setIndicator]=useState('abstencao_2024'),[order,setOrder]=useState('desc'),[selected,setSelected]=useState(null);
 const [visibleCount,setVisibleCount]=useState(60);
 useEffect(()=>{
   if(mode!=='live')return;
   let active=true;setLiveData(null);setFailedUf(null);
   loadAtlasMunicipios(uf).then(rows=>{if(active)setLiveData({uf,rows})}).catch(()=>{if(active)setFailedUf(uf)});
   return()=>{active=false};
 },[mode,uf,requestVersion]);
 useEffect(()=>setVisibleCount(60),[uf,text,indicator,order]);
 const liveReady=mode==='live'&&liveData?.uf===uf;
 const loading=mode==='live'&&!liveReady&&failedUf!==uf;
 const atlasRows=useMemo(()=>liveReady?liveData.rows:[],[liveReady,liveData,loading,uf]);
 useEffect(()=>{if(!initialMunicipio&&!initialMunicipioNome||!atlasRows.length)return;const found=atlasRows.find(row=>String(row.id)===String(initialMunicipio)||row.nome?.toLocaleLowerCase('pt-BR')===initialMunicipioNome.toLocaleLowerCase('pt-BR'));if(found)setSelected(found)},[atlasRows,initialMunicipio,initialMunicipioNome]);
 const filtered=useMemo(()=>filterAtlasRows(atlasRows,text,indicator,order),[atlasRows,text,indicator,order]);
 const coverage=atlasCoverage(atlasRows,indicator,uf);
 const fmt=m=>formatAtlasIndicator(m?.[indicator],indicator);
 const chooseUf=value=>{setUf(value);setSelected(null)};
 return <section className="br-atlas br-scope"><EditorialHeading number="02" kicker="CADERNO TERRITORIAL" title={<>Um país.<br/><em>Muitos recortes.</em></>} aside={<PrintLabel tone="blue">CARTOGRAFIA · CE / MA / MS / RJ / RN / RS</PrintLabel>}><p>DESDOBRE O ATLAS. Selecione uma UF e leia o território município a município. As cores indicam valores; as fichas mostram os números exatos.</p></EditorialHeading>
 <div className="atlas-indicator-strip"><span>ESCOLHA UMA LEITURA</span>{Object.entries(atlasIndicators).filter(([key])=>key!=='lideranca_mudou').map(([key,v],index)=><button key={key} className={indicator===key?'active':''} aria-pressed={indicator===key} onClick={()=>{setIndicator(key);setSelected(null)}}><small>0{index+1}</small><span>{v.label}</span></button>)}</div>
 <div className="atlas-layout"><Frame label="ATLAS MUNICIPAL · INDICADORES" right="SEIS UNIDADES FEDERATIVAS">
 <div className="atlas-filter"><button className={!uf?'active':''} aria-pressed={!uf} onClick={()=>chooseUf('')}>BRASIL</button>{states.map(s=><button className={uf===s.uf?'active':''} aria-pressed={uf===s.uf} key={s.uf} onClick={()=>chooseUf(s.uf)}>{s.uf}</button>)}</div>
 <div className="atlas-reading-context"><span>INDICADOR EM LEITURA</span><p>{atlasIndicators[indicator].context} · {uf||'6 UFs'}</p></div>
 <GeoAtlas uf={uf} onUf={chooseUf} onSelect={setSelected} municipios={atlasRows} indicator={indicator} selected={selected} loading={loading}/>
 </Frame>
 <Frame label="FICHÁRIO TERRITORIAL" right="COMPARE MUNICÍPIOS"><div className="municipality-panel">
 <div className="atlas-coverage" role="status" aria-live="polite"><span className="atlas-data-edition">{loading?'ABRINDO O ACERVO':liveReady?'CONSULTA AO ACERVO':'AMOSTRA DO ACERVO'}</span><h3>{uf||'SEIS ESTADOS'} <small> / COBERTURA PARCIAL</small></h3>
 {loading?<p>Carregando os dados dos {fNum(coverage.total)} municípios deste recorte…</p>:<><div className="atlas-coverage-counts"><div><strong>{fNum(coverage.loaded)}<small> / {fNum(coverage.total)}</small></strong><span>com ficha carregada</span></div><div><strong>{fNum(coverage.unloaded)}</strong><span>sem dados carregados</span></div></div><p>{atlasIndicators[indicator].label}: <b>{fNum(coverage.withValue)} com valor</b> · {fNum(coverage.withoutValue)} sem valor disponível no recorte. Ausência de dados não significa zero.</p>{liveReady&&coverage.unloaded>0&&<p>A consulta retornou uma cobertura parcial da UF. Os municípios sem ficha permanecem cinzas.</p>}{failedUf===uf&&<p>Consulta indisponível. Nenhum valor arquivado será exibido. <button type="button" onClick={()=>setRequestVersion(v=>v+1)}>Tentar novamente</button></p>}</>}
 </div>
 <div className="input-search"><Search size={18}/><input aria-label="Buscar município" placeholder="Encontre uma ficha pelo nome..." value={text} onChange={e=>{setText(e.target.value);setSelected(null)}}/></div><div className="atlas-sort"><strong>{filtered.length} FICHAS ENCONTRADAS</strong><select aria-label="Ordenar indicadores" value={order} onChange={e=>setOrder(e.target.value)}><option value="desc">Maiores valores</option><option value="asc">Menores valores</option></select></div>
 {selected&&<div className="atlas-selected"><span>FICHA SELECIONADA</span><h3>{selected.nome} · {selected.uf}</h3><div><b>{atlasIndicators[indicator].label}</b><strong>{fmt(selected)}</strong></div><p>População: {fNum(selected.populacao)} · Abstenção 2024: {selected.abstencao_2024==null?'—':fNum(selected.abstencao_2024)+'%'}</p>{onGo&&<div className="atlas-selected-actions" style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'10px',paddingTop:'10px',borderTop:'1px dashed #c4b59f'}}><button type="button" onClick={()=>onGo('territorios','municipio','',{uf:selected.uf,municipioId:selected.id,municipioNome:selected.nome})} style={{padding:'5px 9px',fontSize:'11px',fontWeight:700,fontFamily:'monospace',background:'#173e78',color:'#fff',border:'none',borderRadius:'3px',cursor:'pointer'}}>Perfil eleitoral ↗</button><button type="button" onClick={()=>onGo('candidatos','','',{uf:selected.uf,municipioId:selected.id,cargo:'VEREADOR',ano:'2024'})} style={{padding:'5px 9px',fontSize:'11px',fontWeight:700,fontFamily:'monospace',background:'#f4e8d3',color:'#173e78',border:'1px solid #173e78',borderRadius:'3px',cursor:'pointer'}}>Candidaturas ↗</button><button type="button" onClick={()=>onGo('adesivos','','',{uf:selected.uf,municipioId:selected.id})} style={{padding:'5px 9px',fontSize:'11px',fontWeight:700,fontFamily:'monospace',background:'#f4e8d3',color:'#173e78',border:'1px solid #173e78',borderRadius:'3px',cursor:'pointer'}}>Despesas ↗</button></div>}</div>}
 {loading?<p className="data-unavailable">Abrindo fichas do território…</p>:<><div className="municipio-list atlas-scroll-list">{filtered.slice(0,visibleCount).map(m=><button className={selected?.id===m.id?'active':''} key={m.id} onClick={()=>{setSelected(m);setUf(m.uf)}}><span><strong>{m.nome}</strong><small>{m.uf}</small></span><b>{fmt(m)}</b></button>)}{!filtered.length&&<p>Nenhuma ficha encontrada no recorte atual.</p>}</div>{visibleCount<filtered.length&&<button type="button" className="atlas-more" onClick={()=>setVisibleCount(n=>n+60)}>MOSTRAR MAIS FICHAS · {Math.min(visibleCount,filtered.length)} DE {filtered.length}</button>}</>}
 <p className="atlas-count-note">A busca filtra somente o fichário e mantém os dados do mapa. O Atlas cobre CE, MA, MS, RJ, RN e RS; não representa todo o país.</p></div></Frame></div>
 <AtlasDiscoveries rows={atlasRows} indicator={indicator} uf={uf} coverage={coverage} loading={loading} archived={!liveReady} onSelect={record=>{setSelected(record);setUf(record.uf)}}/>
 <div className="atlas-investigate"><div><strong>O QUE O TERRITÓRIO EXPLICA?</strong><p>Compare população, PIB por habitante e abstenção. Os períodos e a composição estadual precisam ser analisados separadamente.</p></div><button onClick={()=>onResearch(3)}>DESDOBRAR ESTA INVESTIGAÇÃO <ArrowUpRight size={15}/></button><button onClick={()=>onResearch(7)}>VER A MUDANÇA NOS PARTIDOS <ArrowUpRight size={15}/></button></div>
 <ComparisonPanel topic="atlas" mode={liveReady?'live':'snapshot'} municipios={filtered}/>
 <p className="editorial-note">População/PIB e participação eleitoral podem ter anos de referência distintos; confira a metodologia de cada análise.</p></section>;
}

function Plenario({onResearch,mode,onOpenCandidate}){
 // Reutiliza ComparisonPanel topic="plenario" dentro de CostPerSeatStory
 return <>
  <SectionHero kicker="REPORTAGEM ESPECIAL · QUESTÃO 01" title={<>QUANTO CUSTA UMA <em>CADEIRA?</em></>} detail="Uma investigação interativa sobre o custo financeiro agregado por mandato, a disparidade entre candidaturas e a relação entre dinheiro e votos nas eleições brasileiras (2018–2024)."/>
  <CostPerSeatStory mode={mode} onResearch={onResearch} onOpenCandidate={onOpenCandidate}/>
 </>;
}

function getChartData(meta,live){
 if(!live?.rows?.length)return [];
 const rows=live.rows;
 if(meta.id===1)return rows.map(r=>({label:`${r.cargo==='VEREADOR'?'Ver.':r.cargo==='DEPUTADO FEDERAL'?'Dep. fed.':'Dep. est.'} ${r.ano}`,value:r.valor}));
 if(meta.id===2){const y=rows.filter(r=>r.cargo==='VEREADOR'&&(r.ano===2020||r.ano===2024));return [1,2,3,4].map(q=>({label:q===1?'25% menores':q===4?'25% maiores':`${q}º quartil`,y2020:y.find(x=>x.ano===2020&&x.quartil===q)?.taxa??null,y2024:y.find(x=>x.ano===2024&&x.quartil===q)?.taxa??null}));}
 if(meta.id===3)return rows.filter(r=>r.ano===2024).map(r=>({label:r.uf,value:r.r_idhm})); // correlações por UF, jamais média de coeficientes
 if(meta.id===4)return rows.filter(r=>r.ano===2024&&r.cargo==='VEREADOR').sort((a,b)=>b.candidaturas-a.candidaturas).slice(0,7).map(r=>({label:r.escolaridade,value:r.candidaturas}));
 if(meta.id===5)return [2018,2020,2022,2024].map(y=>({label:String(y),federal:rows.find(r=>r.ano===y&&r.cargo==='DEPUTADO FEDERAL')?.pct_legenda??null,estadual:rows.find(r=>r.ano===y&&r.cargo==='DEPUTADO ESTADUAL')?.pct_legenda??null,vereador:rows.find(r=>r.ano===y&&r.cargo==='VEREADOR')?.pct_legenda??null}));
 if(meta.id===6)return rows.map(r=>({label:`${r.cargo==='VEREADOR'?'Ver.':'Dep. est.'} ${r.ano}`,value:r.pct_jovens}));
 if(meta.id===7)return [{label:'Mesmo partido',value:rows[0].estaveis},{label:'Líder diferente',value:rows[0].municipios-rows[0].estaveis}];
 if(meta.id===9)return rows.slice(0,9).map(r=>({label:r.categoria,value:r.total}));
 if(meta.id===10)return [{label:'Mais de um ano',value:rows[0].multi_anos},{label:'Três ou mais anos',value:rows[0].tres_anos},{label:'Mais de um partido',value:rows[0].multi_partidos},{label:'Duas ou mais vitórias',value:rows[0].multi_vitorias}];
 return meta.data;
}
const AxisTick=(props)=><text x={props.x} y={props.y+9} textAnchor="end" transform={`rotate(-23 ${props.x} ${props.y})`} fontSize="10" fill="#334155">{String(props.payload.value).slice(0,22)}</text>;
function AnalysisChart({meta,live}){
 const data=getChartData(meta,live);
 if(meta.type==='missing')return <div className="not-available"><AlertTriangle size={36}/><h3>AINDA NÃO HÁ DADOS DE RECEITAS.</h3><p>É preciso integrar ao banco a origem pública e privada dos recursos de campanha. A tabela de despesas não responde à pergunta.</p></div>;
 const percent=[2,5,6].includes(meta.id);
 return <div className="chart-stage" role="img" aria-label={meta.measure}><div className="graph-title"><span>{meta.id===3&&live?.rows?.length?'Correlação IDHM × abstenção por UF (2024)':meta.measure}</span><span>SEIS ESTADOS · ACERVO PARCIAL</span></div>
 <ResponsiveContainer width="100%" height={330}>
 {meta.type==='donut'?<PieChart><Tooltip formatter={v=>fNum(v)+' municípios'}/><Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={68} outerRadius={112} label={({name,percent})=>`${name}: ${(percent*100).toFixed(1)}%`}>{data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Legend/></PieChart>:
 meta.type==='lines'?<LineChart data={data} margin={{top:25,right:25,left:0,bottom:68}}><CartesianGrid strokeDasharray="4 5" stroke="#dfd5bf"/><XAxis dataKey="label" tick={AxisTick} interval={0} height={76}/><YAxis/><Tooltip formatter={v=>v==null?'—':fNum(v)+'%'}/><Line type="monotone" dataKey={meta.id===2?'y2020':'federal'} name={meta.id===2?'2020':'Deputado federal'} connectNulls stroke="#173e78" strokeWidth={3}/><Line type="monotone" dataKey={meta.id===2?'y2024':'estadual'} name={meta.id===2?'2024':'Deputado estadual'} connectNulls stroke="#d24c39" strokeWidth={3}/>{meta.id===5&&<Line type="monotone" dataKey="vereador" name="Vereador" connectNulls stroke="#21765e" strokeWidth={3}/>}<Legend verticalAlign="top"/></LineChart>:
 <BarChart data={data} margin={{top:25,right:22,left:3,bottom:88}}><CartesianGrid strokeDasharray="4 5" stroke="#e6ddcb"/><XAxis dataKey="label" tick={AxisTick} interval={0} height={88}/><YAxis tickFormatter={v=>meta.id===3?v.toFixed(1):v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'k':String(v)} width={48}/><Tooltip formatter={v=>meta.id===1||meta.id===9?money(v):percent?fNum(v)+'%':fNum(v)}/>{meta.id===3&&<ReferenceLine y={0} stroke="#263345"/>}<Bar dataKey="value" radius={[4,4,0,0]} maxBarSize={65}>{data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar></BarChart>}
 </ResponsiveContainer><p className="chart-foot">{live?.rows?.length?'Consulta aos dados eleitorais disponíveis.':'Consulta aos dados indisponível para este gráfico.'}</p></div>;
}
function Investigacoes({defaultId=1,mode,onGo,onOpenCandidate}){
 const [id,setId]=useState(defaultId),[live,setLive]=useState(null),[busy,setBusy]=useState(false),[viewRecords,setViewRecords]=useState(false),[theme,setTheme]=useState('todos');
 useEffect(()=>setId(defaultId),[defaultId]);
 useEffect(()=>{let active=true;setLive(null);if(mode==='live'&&id!==4&&id!==1&&id!==2){setBusy(true);getAnalysis(id).then(v=>{if(active)setLive(v)}).finally(()=>{if(active)setBusy(false)})}return()=>{active=false}},[id,mode]);
 const data=analyses.find(q=>q.id===id)??analyses[0];const chartData=getChartData(data,live);
 const themes=[...new Set(analyses.map(x=>x.theme))];
 return <><SectionHero kicker="LABORATÓRIO EDITORIAL / 10 INVESTIGAÇÕES" title={<>OS DADOS TÊM <em>PERGUNTAS.</em></>} detail="As questões da pesquisa aparecem aqui como investigações editoriais conectadas entre si — o restante do portal é livre para exploração."/>
 <div className="research-filters"><button onClick={()=>setTheme('todos')} className={theme==='todos'?'active':''}>TODOS</button>{themes.map(t=><button key={t} className={theme===t?'active':''} onClick={()=>setTheme(t)}>{t}</button>)}</div>
 <div className="investigations-layout"><div className="question-stack">{analyses.filter(a=>theme==='todos'||a.theme===theme).map(x=><button className={id===x.id?'active':''} key={x.id} onClick={()=>{setId(x.id);setViewRecords(false)}}><span>#{String(x.id).padStart(2,'0')}</span><strong>{x.title}</strong><small>{x.theme}</small></button>)}</div>
 <Frame label={'DOSSIÊ '+String(id).padStart(2,'0')+' / DADOS REAIS'} right={busy?'CONSULTANDO…':data.status.toUpperCase()}><div className="investigation-document"><div className="investigation-title"><Eyebrow>{data.theme} · {data.years}</Eyebrow><h3>{data.title}</h3><p>{data.subtitle}</p></div><div className="analysis-status"><span className={'status-label status-'+data.status}>{data.status==='verificado'?(live?.rows?.length?'● CONSULTA ATUAL':'◐ REFERÊNCIA / VEJA A FONTE DO GRÁFICO'):data.status==='parcial'?'◐ ANÁLISE PARCIAL':'○ FONTE NECESSÁRIA'}</span>{id!==4&&<button className="table-toggle" onClick={()=>setViewRecords(v=>!v)}>{viewRecords?'VER GRÁFICO':'VER FICHAS DOS DADOS'}</button>}</div>
 {id===4?<EscolaridadeDossie/>:id===1&&!viewRecords?<CustoCadeiraDossie mode={mode} onOpenCandidate={onOpenCandidate}/>:id===2&&!viewRecords?<PatrimonioMapaDossie mode={mode}/>:<>{viewRecords?<RecordCollection items={chartData.map((row,index)=>({id:index,title:row.label,fields:Object.keys(row).filter(key=>key!=='label').map(key=>({label:key,value:row[key]==null?'Não informado':fNum(row[key])}))}))}/>:([3,5,7,9].includes(id)?<PaineisBDR question={id}/>:<AnalysisChart meta={data} live={live}/>)}</>}<div className="document-method"><strong>COMO LER ESTE RESULTADO</strong><p>{data.note}</p><span>ORIGEM DOS DADOS: {data.id===3||data.id===6?'TSE e IBGE':'Tribunal Superior Eleitoral'} · Veja os critérios acima.</span></div><div className="relational"><strong>CRUZE COM OUTRAS INVESTIGAÇÕES</strong><div>{data.related.map(n=><button key={n} onClick={()=>{setId(n);setTheme('todos');setViewRecords(false)}}>Q{String(n).padStart(2,'0')} <ArrowUpRight size={13}/></button>)}</div></div></div></Frame></div>
 {id!==4&&<ComparisonPanel topic="investigacoes" key={id} defaultKind={({1:'cadeiras',2:'patrimonio',3:'abstencao',5:'legenda',9:'propaganda'})[id]||'legenda'} mode={mode}/>}
 </>;
}
function Footer(){return <footer><div className="footer-brand-wrap"><img src="/logo.jpg" alt="Logotipo Arquivo da Democracia" className="footer-logo-img"/><div><strong>ARQUIVO DA DEMOCRACIA</strong><span>ACERVO INDEPENDENTE · SEM VÍNCULO COM A JUSTIÇA ELEITORAL</span></div></div><p>Dados eleitorais de seis estados, consultados no acervo. Gráficos, filtros e definições devem ser acompanhados de documentação metodológica. Imagens e interfaces são interpretações autorais; nunca simulam canais oficiais.</p></footer>}
export default function App(){
 const [route,setRoute]=useState(initialRoute),{page,story}=route;
 const [mode,setMode]=useState('live'),[counts,setCounts]=useState({}),[mobileMenu,setMobileMenu]=useState(false),[campaignCandidate,setCampaignCandidate]=useState(null),[archiveCandidate,setArchiveCandidate]=useState(null);
 const [campaignLookupError,setCampaignLookupError]=useState(false),[campaignLookupRevision,setCampaignLookupRevision]=useState(0);
 const mainRef=useRef();const reducedMotion=useMotionPreference();
 const currentTheme=themes.find(t=>t.id===route.theme)||themes.find(t=>t.places.some(([id])=>id===page));
 const routeReader=useRef(parseRoute);routeReader.current=parseRoute;
 useEffect(()=>{const sync=()=>setRoute(routeReader.current(location.hash));window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}},[parseRoute]);
 useEffect(()=>{getHealth().then(h=>{if(h.connected)setMode('live')});getOverview().then(setCounts)},[]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});const a=mainRef.current&&!reducedMotion?gsap.fromTo(mainRef.current,{opacity:.5,y:8},{opacity:1,y:0,duration:.25}):null;return()=>a?.kill()},[page,story,reducedMotion]);
 const go=(page,story='',theme='',context={})=>{
  ({page,story,theme}=moneyDestination(page,story,theme));
  const raw={...readContext(),...Object.fromEntries(Object.entries(context).map(([key,value])=>[key.replace(/^q1_/,''),value]))};
  raw.etapa=['arquivo','candidatos'].includes(page)&&story==='perfil'?'perfil':(['candidatos','legendas','perguntas','investigacoes'].includes(page)||(page==='arquivo'&&['escolaridade','juventude','trajetorias'].includes(story))||(page==='campanhas'&&story!=='candidatura')||page==='atlas')?'catalogo':page==='territorios'?'territorio':'investigacao';
  const normalized=normalizeContext(isProportionalInvestigation(page,story)?normalizeInvestigationScope(raw):raw);
  if(raw.cargo&&raw.cargo!==normalized.cargo)normalized.aviso=`Esta investigação compara cargos proporcionais. O recorte foi ajustado para ${normalized.cargo.toLowerCase()} em ${normalized.ano}.`;
  else if(raw.ano&&String(raw.ano)!==String(normalized.ano))normalized.aviso=`A candidatura de origem é de ${raw.ano}. Esta investigação usa ${normalized.ano}, ano compatível com ${normalized.cargo}.`;
  else if(raw.municipioId&&!normalized.municipioId)normalized.aviso='Nesta investigação, a disputa é estadual. O município não delimita cadeiras de deputados.';
  else if(context.aviso)normalized.aviso=context.aviso;else delete normalized.aviso;
  context=Object.fromEntries(Object.entries(normalized).map(([key,value])=>['q1_'+key,value]));
  const next={page,story,theme,context};setRoute(next);const params=new URLSearchParams({page});if(story)params.set('story',story);if(theme)params.set('theme',theme);
  for(const [key,value] of Object.entries(context))if(value!=null&&value!=='')params.set(key,String(value));
  location.hash=params.toString();setMobileMenu(false);
 };
 const openPerson=candidate=>go('candidatos','perfil','',candidateContext(candidate));

 const goResearch=q=>{const [page,story]=questionDestinations[q]||questionDestinations[1];go(page,story)};
 const openCampaign=c=>{setCampaignCandidate(c);go('campanhas','candidatura','',candidateContext(c))};
 useEffect(()=>{
  const id=route.context?.q1_candidaturaId;
  if(page!=='campanhas'||story!=='candidatura'||!id||campaignCandidate?.id===id)return;
  const ac=new AbortController();setCampaignCandidate(null);setCampaignLookupError(false);
  request('/catalogo/candidaturas/'+encodeURIComponent(id),{signal:ac.signal,timeout:45000}).then(data=>{if(!ac.signal.aborted)setCampaignCandidate(data.selecionada)}).catch(()=>{if(!ac.signal.aborted)setCampaignLookupError(true)});
  return()=>ac.abort();
 },[page,story,route.context?.q1_candidaturaId,campaignLookupRevision]);

 return <div className="site"><a className="expo-skip" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById('main-content')?.focus()}}>Pular para o conteúdo</a><header className="site-header expo-site-header"><button className="brand" onClick={()=>go('inicio')} aria-label="Arquivo da Democracia, início"><img src="/logo.jpg" alt="Logotipo Arquivo da Democracia" className="brand-emblem"/><div><strong>ARQUIVO <em>DA</em> DEMOCRACIA</strong><small>PERGUNTAS · DESCOBERTAS · EVIDÊNCIAS</small></div></button><nav id="main-navigation" className={mobileMenu?'mobile-open':''} aria-label="Navegação principal"><details className="acervo-menu" onClick={event=>{if(event.target.closest('button'))event.currentTarget.open=false}}><summary><span>Consultar o acervo</span><ChevronDown size={16} className="acervo-menu-chevron" aria-hidden="true"/></summary><div className="acervo-menu-options">{[['candidatos','Pessoas e candidatos'],['territorios','Estados e municípios'],['legendas','Partidos e suas candidaturas'],['perguntas','Perguntas e método da pesquisa']].map(([target,label])=><button key={target} onClick={()=>go(target)} aria-current={page===target?'page':undefined}>{label}</button>)}</div></details><div className="home-nav-group" role="group" aria-label="Explorar por tema"><span className="home-nav-label">EXPLORAR POR TEMA</span>{themes.map(t=><button key={t.id} onClick={()=>go(t.page,'',t.id)} className={currentTheme?.id===t.id?'active':''} aria-current={currentTheme?.id===t.id?'page':undefined}>{t.title}</button>)}</div></nav><button className="menu-toggle" onClick={()=>setMobileMenu(v=>!v)} aria-label={mobileMenu?"Fechar menu":"Abrir menu"} aria-controls="main-navigation" aria-expanded={mobileMenu}><Menu size={21}/></button></header>
 <div className="utility-ribbon"><span>EXPOSIÇÃO DE DESCOBERTAS ELEITORAIS</span><button onClick={()=>go('metodologia')}>FONTES E MÉTODO ↗</button></div>

 <main id="main-content" tabIndex={-1} ref={mainRef} className="content-shell">{!['inicio','candidatos','territorios','legendas','perguntas','adesivos','metodologia','investigacoes'].includes(page)&&!(page==='arquivo'&&['perfil','fichario','trajetorias','juventude','escolaridade',''].includes(story||''))&&!['atlas','partidos','plenario'].includes(page)&&!(page==='campanhas')&&<InvestigationContext fields={investigationFields(page,story)} onChange={context=>go(page,story,route.theme,context)}/>} {route.context?.q1_aviso&&<p className="catalog-transition" role="status">{route.context.q1_aviso}</p>}{['candidatos','territorios','legendas'].includes(page)&&<AcervoNav active={page} onGo={go}/>}<Suspense key={JSON.stringify(route.context)} fallback={<p className="expo-loading" role="status">Abrindo a próxima história…</p>}>
 {page==='candidatos'&&story!=='perfil'&&<CandidateCatalog onGo={go} onOpenPerson={openPerson}/>}
 {page==='perguntas'&&<ResearchPage question={story} onGo={go}/>}
 {page==='legendas'&&<PartyCatalog onGo={go}/>}
 {page==='territorios'&&<TerritoryCatalog onGo={go}/>}
 {['arquivo','candidatos'].includes(page)&&story==='perfil'&&<PersonProfile personId={route.context?.q1_pessoaId} candidateId={route.context?.q1_candidaturaId} onGo={go} onOpenCampaign={openCampaign}/>}
 {page==='inicio'&&<HomeEditorial onGo={go} onResearch={goResearch} data={counts} mode={mode} context={<InvestigationContext onChange={context=>go(page,story,route.theme,context)}/>}/>}
 {page==='metodologia'&&<ExhibitionMethod onResearch={goResearch} onLegacy={q=>go('investigacoes',String(q))}/>}
{page==='investigacoes'&&<ResearchPage question={story} onGo={go}/>}
 {page==='plenario'&&<ThemeSection topic="voto" active="proporcional" onGo={go}><InvestigationContext fields={investigationFields(page,story)} onChange={context=>go(page,story,'voto',context)}/><ProportionalStory onOpenCandidate={openCampaign} onGo={go}/></ThemeSection>}
 {page==='atlas'&&<ThemeSection topic="mapa" active={story==='lideranca'?'lideranca':'territorio'} onGo={go}><ResearchPage question={story==='lideranca'?7:3} onGo={go} embedded/><Explore title="Atlas · explorar outros indicadores do território"><Atlas mode={mode} onResearch={goResearch} onGo={go} initialUf={route.context?.q1_uf||''} initialMunicipio={route.context?.q1_municipioId||''} initialMunicipioNome={route.context?.q1_municipioNome||''}/></Explore><div className="research-actions"><button onClick={()=>go('descobertas','','mapa')}>Conferir rankings do acervo →</button></div></ThemeSection>}
 {page==='arquivo'&&story==='fichario'&&<PersonProfile personId={route.context?.q1_pessoaId} candidateId={route.context?.q1_candidaturaId} onGo={go} onOpenCampaign={openCampaign}/>}
 {page==='arquivo'&&!['perfil','fichario'].includes(story)&&<ThemeSection topic="pessoas" active={['escolaridade','juventude'].includes(story)?story:'trajetorias'} onGo={go}>{['escolaridade','juventude','trajetorias',''].includes(story||'')?<ResearchPage question={story==='escolaridade'?4:story==='juventude'?6:10} onGo={go} embedded/>:<PeopleStory story={story} mode={mode} onGo={go} onStory={next=>go('arquivo',next)}/>}
{(!story||story==='trajetorias')&&<Explore title="Consultar a trajetória de uma pessoa"><p>Encontre uma pessoa no acervo e consulte suas eleições em sequência no perfil, com diferenças de partido, cargo e resultado.</p><button className="catalog-back" onClick={()=>go('candidatos')}>Encontrar uma pessoa →</button></Explore>}</ThemeSection>}
 {page==='partidos'&&<ThemeSection topic="voto" active={story==='representacao'?'representacao':'legenda'} onGo={go}>{story==='representacao'?<><InvestigationContext fields={investigationFields(page,story)} onChange={context=>go(page,story,'voto',context)}/><PartyStory onGo={go}/></>:<><ResearchPage question={5} onGo={go} embedded/><Explore title="Comparar as duas eleições mais recentes"><LegendaInvestigation onGo={go}/></Explore></>}
<Explore title="Consultar candidaturas por partido"><MuralCampanhas mode={mode} onResearch={goResearch} onOpenCandidate={openCampaign} initialScope={{ano:route.context?.q1_ano,cargo:route.context?.q1_cargo,uf:route.context?.q1_uf,partido:route.context?.q1_partido}}/><Explore title="Ver os painéis BDR de legenda"><PaineisBDR question={5}/></Explore></Explore></ThemeSection>}
 {page==='campanhas'&&<>{story!=='candidatura'?<MoneySection story={story} onGo={go} mode={mode} onResearch={goResearch} onOpenCandidate={openCampaign} onOpenRecord={candidate=>{setArchiveCandidate(candidate);openPerson(candidate)}}/>:<><button className="catalog-back" onClick={()=>go('campanhas','custo','dinheiro')}>← Voltar a Dinheiro e poder</button>{route.context?.q1_candidaturaId&&campaignCandidate?.id!==route.context.q1_candidaturaId?<div className="catalog-state" role="status"><p>{campaignLookupError?'Não foi possível abrir a candidatura selecionada.':'Consultando a candidatura selecionada…'}</p>{campaignLookupError&&<button onClick={()=>setCampaignLookupRevision(n=>n+1)}>Tentar novamente</button>}</div>:<PrestacaoDeContas key={route.context?.q1_candidaturaId||'buscar-campanha'} mode={mode} onResearch={goResearch} initialCandidate={route.context?.q1_candidaturaId?campaignCandidate:null}/>}</>}</>}
 {page==='descobertas'&&<Descobertas mode={mode} onGo={go}/>}
 </Suspense></main><Footer/></div>;
}
