import {readContext} from '../data/investigationContext.js';
import {electionYearsForOffice,municipalOffice} from '../data/filterScope.js';
import {useCatalog} from '../catalog/useCatalog.jsx';
import ComparisonPanel from '../components/ComparisonPanel.jsx';
import {Explore} from '../components/exhibition/Story.jsx';
import {useEffect,useMemo,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowRight,ArrowUpRight,Search,ReceiptText,ChevronDown,TicketPercent,RotateCcw,Files,FileText} from 'lucide-react';
const sampleCandidates=[];
const sampleExpenses={};
import {getCandidates,getCandidateExpenses} from '../data/client.js';
import {states} from '../data/catalog.js';
const money=n=>n==null?'—':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmt=n=>n==null?'—':Number(n).toLocaleString('pt-BR');
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const localExpense=c=>{const entries=sampleExpenses[c?.id]||[],groups=new Map();for(const entry of entries){const old=groups.get(entry.categoria)||{categoria:entry.categoria,valor:null,quantidade:0};if(entry.valor!=null&&entry.valor!==''&&Number.isFinite(Number(entry.valor)))old.valor=(old.valor??0)+Number(entry.valor);old.quantidade++;groups.set(entry.categoria,old)}return {candidate:c,entries,categories:[...groups.values()].sort((a,b)=>(b.valor??-Infinity)-(a.valor??-Infinity)),stats:{quantidade:null,total:null},snapshot:true}};
function FiscalMirror({record,person,index,total}){
 return <motion.article key={record?.id||'empty'} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.22}} className="fiscal-document-v9">
  <div className="fiscal-margin-holes" aria-hidden="true"><i/><i/><i/></div>
  <header className="fiscal-doc-top"><div><small>ARQUIVO DA DEMOCRACIA · CONTAS ELEITORAIS</small><strong>DOCUMENTO DE DESPESA</strong><span>ESPELHO INFORMATIVO · {person?.ano||'—'}</span></div><b> {String(index+1).padStart(2,'0')}<small> / {String(total).padStart(2,'0')}</small></b></header>
  <div className="fiscal-doc-warning">RECONSTRUÇÃO EDITORIAL DE LANÇAMENTO · NÃO É NOTA FISCAL ORIGINAL</div>
  <div className="fiscal-doc-area"><small>DESTINATÁRIO / CAMPANHA</small><strong>{person?.nome||'—'}</strong><span>{person?.partido||'—'} · {person?.cargo||'—'} · {person?.municipio||person?.uf||'—'} · {person?.ano||'—'}</span></div>
  <p className="fiscal-doc-absence">Fornecedor, emissão e número da nota fiscal não constam desta consulta.</p>
  <div className="fiscal-doc-linehead"><span>DESCRIÇÃO DO LANÇAMENTO ELEITORAL</span><span>VALOR DECLARADO</span></div>
  <div className="fiscal-doc-item"><strong>{record?.categoria||'Categoria não informada'}</strong><b>{money(record?.valor)}</b></div>
  <p className="fiscal-doc-absence">O valor declarado não comprova que o pagamento foi realizado.</p>
  <footer className="fiscal-doc-footer"><span>LANÇAMENTO {index+1} DE {total} · FONTE: PRESTAÇÃO DE CONTAS ELEITORAL</span><strong>REGISTRO DOCUMENTAL</strong></footer>
 </motion.article>;
}
export default function PrestacaoDeContas({mode,onResearch,initialCandidate}){
 const seed=readContext(),initialOffice=initialCandidate?.cargo||seed.cargo||'VEREADOR';
 const years=electionYearsForOffice(initialOffice);const seedYear=String(initialCandidate?.ano||seed.ano||years.at(-1));
 const [year,setYear]=useState(years.includes(Number(seedYear))?seedYear:String(years.at(-1))),[uf,setUf]=useState(initialCandidate?.uf||seed.uf||''),[search,setSearch]=useState(''),[party,setParty]=useState(seed.partido||''),[cargo,setCargo]=useState(initialOffice);
 const [municipio,setMunicipio]=useState(municipalOffice(initialOffice)&&(initialCandidate?.uf||seed.uf)?String(initialCandidate?.municipio_id||initialCandidate?.id_municipio||seed.municipioId||''):'');
 const options=useCatalog('opcoes',{ano:year,uf,cargo});
 const [listError,setListError]=useState(false),[listRevision,setListRevision]=useState(0);
 const [list,setList]=useState([]),[count,setCount]=useState(0),[pick,setPick]=useState(null),[detail,setDetail]=useState(null),[listScope,setListScope]=useState('');
 const [index,setIndex]=useState(0),[expenseOffset,setExpenseOffset]=useState(0),[busy,setBusy]=useState(false),[category,setCategory]=useState('');const [paperOpen,setPaperOpen]=useState(false);
 useEffect(()=>{if(initialCandidate){setPick(initialCandidate);setYear(String(initialCandidate.ano));setUf(initialCandidate.uf||'');setSearch('');setParty('');setCargo(initialCandidate.cargo||'VEREADOR');setMunicipio(String(initialCandidate.municipio_id||initialCandidate.id_municipio||''));setIndex(0);setExpenseOffset(0);setPaperOpen(true)}},[initialCandidate]);
 const currentScope=JSON.stringify([year,uf,search,party,cargo,municipio]);
 useEffect(()=>{if(mode!=='live')return;let active=true;setList([]);setListScope('');setListError(false);const t=setTimeout(async()=>{try{const x=await getCandidates({ano:year,uf,search,partido:party,cargo,municipio,limit:24,ordem:'gastos'});if(active){setList(x.rows||[]);setCount(x.total||0);setListScope(currentScope)}}catch{if(active){setList([]);setCount(0);setListScope(currentScope);setListError(true)}}},280);return()=>{active=false;clearTimeout(t)}},[year,uf,search,party,cargo,municipio,mode,currentScope,listRevision]);
 useEffect(()=>{setExpenseOffset(0);setCategory('');setIndex(0);setDetail(null)},[pick?.id]);
 useEffect(()=>{if(!pick)return;if(mode!=='live'){setDetail(null);return;}let active=true;setBusy(true);
   getCandidateExpenses(pick.id,{categoria:category,limit:40,offset:expenseOffset}).then(x=>{if(active)setDetail(x)}).catch(()=>{if(active)setDetail(null)}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[pick?.id,mode,expenseOffset,category]);
 const sampleFiltered=useMemo(()=>sampleCandidates.filter(c=>String(c.ano)===year&&c.cargo===cargo&&(!uf||c.uf===uf)&&(!party||c.partido===party)&&(!search||norm([c.nome,c.partido,c.municipio].join(' ')).includes(norm(search)))).sort((a,b)=>(b.gastos||0)-(a.gastos||0)).slice(0,24),[year,uf,party,cargo,search]);
 const candidates=mode==='live'?list:sampleFiltered;
 useEffect(()=>{if(pick)return;if(mode==='live'&&listScope!==currentScope)return;const example=candidates.find(candidate=>candidate?.id&&Number.isFinite(Number(candidate.gastos))&&Number(candidate.gastos)>=0)||candidates[0];if(example)setPick(example)},[pick,mode,listScope,currentScope,candidates]);
 const changeFilter=(field,value)=>{
  if(field==='year'){setYear(value);setParty('')}
  if(field==='uf'){setUf(value);setMunicipio('');setParty('')}
  if(field==='cargo'){setCargo(value);if(!electionYearsForOffice(value).includes(Number(year)))setYear(String(electionYearsForOffice(value).at(-1)));setMunicipio('');setParty('')}
  if(field==='party')setParty(value);if(field==='search')setSearch(value);if(field==='municipio')setMunicipio(value);
  setPick(null);setDetail(null);setIndex(0);setExpenseOffset(0);setCategory('');
 };
 const entries=detail?.entries||[];
 const categories=detail?.categories||[];
 const filtered=useMemo(()=>mode==='live'?entries:(category?entries.filter(x=>x.categoria===category):entries),[entries,category,mode]);
 const current=filtered[Math.min(index,filtered.length-1)]||null;
 const expenseTotal=mode==='live'?(detail?.total_filtered??filtered.length):filtered.length;
 const maxCategory=Math.max(1,...categories.map(c=>Number(c.valor)||0));
 const valorCamp=pick?.gastos??null;const perVote=(pick?.votos>0&&valorCamp!=null)?valorCamp/pick.votos:null;
 return <div className="prestacao-v5"><div className="section-header"><div><div className="eyebrow"><span className="eyebrow-dot"/>DOSSIÊS FINANCEIROS / CAMPANHAS</div><h2>ABRA O <em>LIVRO-CAIXA.</em></h2><p>Escolha uma candidatura para consultar seus lançamentos e valores declarados.</p></div></div>
 <p className="expo-source">Os filtros abaixo alteram somente as campanhas e os lançamentos deste painel. As mudanças são aplicadas automaticamente.</p><div className="receipt-navigation" role="group" aria-label="Filtros dos lançamentos"><label><Search size={16}/><input aria-label="Buscar campanha" placeholder="Buscar candidatura ou partido" value={search} onChange={e=>changeFilter('search',e.target.value)}/></label>
 <select value={year} aria-label="Ano dos lançamentos" onChange={e=>changeFilter('year',e.target.value)}>{electionYearsForOffice(cargo).reverse().map(y=><option key={y}>{y}</option>)}</select>
 <select value={uf} aria-label="Estado dos lançamentos" onChange={e=>changeFilter('uf',e.target.value)}><option value="">Todos os 6 estados do acervo</option>{states.map(s=><option value={s.uf} key={s.uf}>{s.uf}</option>)}</select>
 <select aria-label="Cargo dos lançamentos" value={cargo} onChange={e=>changeFilter('cargo',e.target.value)}><option value="VEREADOR">Vereador</option><option value="PREFEITO">Prefeito</option><option value="DEPUTADO ESTADUAL">Deputado estadual</option><option value="DEPUTADO FEDERAL">Deputado federal</option><option value="SENADOR">Senador</option><option value="GOVERNADOR">Governador</option></select>
 {municipalOffice(cargo)&&<select aria-label="Município dos lançamentos" value={municipio} disabled={!uf||options.loading} onChange={e=>changeFilter('municipio',e.target.value)}><option value="">{!uf?'Selecione um estado primeiro':'Todos os municípios do estado'}</option>{options.loading&&municipio&&<option value={municipio}>{seed.municipioNome||'Município selecionado'}</option>}{(options.data?.municipios||[]).map(town=><option key={town.id} value={town.id}>{town.nome}</option>)}</select>}
 <select aria-label="Partido dos lançamentos" value={party} disabled={options.loading} onChange={e=>changeFilter('party',e.target.value)}><option value="">Todos os partidos</option>{options.loading&&party&&<option value={party}>{party}</option>}{(options.data?.facets.partido||[]).map(value=><option key={value}>{value}</option>)}</select>
 <span>DESPESAS DECLARADAS · CONSULTA POR CAMPANHA</span></div>
 <div className="receipt-experience"><aside className="receipt-campaigns"><div className="panel-heading"><span>PASTAS FINANCEIRAS</span><b>{mode==='live'&&listScope!==currentScope?'CONSULTANDO…':`${mode==='live'?fmt(count):fmt(sampleFiltered.length)} CANDIDATURAS`}</b></div>
 <div className="campaign-stack">{candidates.map((c,i)=><button key={c.id} onClick={()=>{setPick(c);setPaperOpen(false)}} className={'campaign-tab '+(pick?.id===c.id?'active':'')}>
 <span className="campaign-tab-number">{c.numero||'—'}</span><span><strong>{c.nome}</strong><small>{c.partido} · {c.uf} · {c.ano}</small><b>{money(c.gastos)}</b></span><ArrowRight size={16}/></button>)}{!candidates.length&&<p role="status">{listScope!==currentScope?'Consultando campanhas…':listError?'Não foi possível consultar este recorte.':'Nenhuma campanha corresponde aos filtros selecionados.'}{listError&&<button onClick={()=>setListRevision(n=>n+1)}>Tentar novamente</button>}</p>}</div>
 <small className="slice-note">{mode==='live'?'As 24 candidaturas com mais despesas deste recorte. Pesquise para localizar outras.':'Amostra de candidaturas reais. Para acessar todas as campanhas e lançamentos, conecte o servidor de dados.'}</small></aside>
 <main className="paperstage"><div className="panel-heading"><span>DOCUMENTO RETIRADO</span>{!pick&&<b>AGUARDANDO SELEÇÃO</b>}</div>
 {!pick?<div className="no-receipt"><Files size={61}/><h3>ESCOLHA UMA PASTA.</h3><p>Os lançamentos ficarão organizados em uma pasta. Selecione uma campanha e folheie as folhas fiscais reconstruídas a partir dos dados disponíveis.</p></div>:<><div className="fiscal-folder-strip"><div><small>PASTA ELEITORAL · {pick.ano} · {pick.uf}</small><strong>{pick.nome}</strong><span>{busy?'LOCALIZANDO DOCUMENTOS...':`${expenseTotal} lançamentos disponíveis${detail?.snapshot?' nesta amostra':''}`}</span></div><div className="fiscal-folder-stamps"><span>PRESTAÇÃO DE CONTAS</span><b>{filtered.length} REGISTROS NESTA PÁGINA</b></div></div>
 <div className="fiscal-stack-stage"><div className="fiscal-paper-stack" aria-hidden="true"><i/><i/><i/></div>
 <AnimatePresence mode="wait">{current?<FiscalMirror key={`${pick.id}-${current?.id}`} record={current} person={pick} index={expenseOffset+index} total={expenseTotal}/>:<motion.div className="receipt-empty-document" key={pick.id+'-vazio'} initial={{opacity:0,y:55}} animate={{opacity:1,y:0}}><b>DOCUMENTAÇÃO · {pick.ano}</b><h3>Lançamentos indisponíveis</h3><p>Não há registros detalhados desta candidatura no recorte consultado.</p><small>O total declarado, quando informado, aparece no resumo da campanha.</small></motion.div>}</AnimatePresence></div>
 <div className="slip-pager"><button disabled={expenseOffset+index<=0||busy} onClick={()=>{if(index>0)setIndex(i=>i-1);else {setExpenseOffset(n=>Math.max(0,n-40));setIndex(39)}}}>← ANTERIOR</button><span>{expenseTotal?`${expenseOffset+index+1}/${expenseTotal} LANÇAMENTOS`:'SEM LANÇAMENTOS'}</span><button disabled={expenseOffset+index>=expenseTotal-1||busy} onClick={()=>{if(index+1<filtered.length)setIndex(i=>i+1);else{setExpenseOffset(n=>n+40);setIndex(0)}}}>PRÓXIMO →</button></div>
 </>}</main>
 <section className="expense-ledger" aria-label="Resumo e categorias da candidatura">
 {pick?<><div className="expense-metrics"><div><span>GASTO DECLARADO</span><b>{money(valorCamp)}</b></div><div><span>VOTOS</span><b>{fmt(pick.votos)}</b></div><div><span>RESULTADO</span><b>{pick.resultado||'Não informado'}</b></div></div>
 <div className="receipt-category-analysis"><h3>Para onde foi o dinheiro?</h3><p>Categorias dos lançamentos disponíveis desta candidatura. Selecione uma para folhear seus registros.</p>{categories.slice(0,6).map((item,i)=><button key={i} className={'receipt-category-row '+(category===item.categoria?'selected':'')} onClick={()=>{setCategory(category===item.categoria?'':item.categoria);setIndex(0);setExpenseOffset(0)}}><span>{item.categoria}</span><strong>{money(item.valor)}</strong><i><em style={{width:`${item.valor==null?0:Number(item.valor)>0?Math.max(2,100*Number(item.valor)/maxCategory):0}%`}}/></i></button>)}</div>
 <details className="entries-panel"><summary>Escolher um lançamento específico</summary><div className="receipt-items">{filtered.map((row,i)=><button key={row.id||i} className={index===i?'active':''} onClick={()=>setIndex(i)}><span><strong>{row.categoria}</strong><small>{money(row.valor)}</small></span><FileText size={16}/></button>)}{!filtered.length&&<p>Sem lançamentos detalhados disponíveis neste recorte.</p>}</div></details>
 <p className="ledger-disclaimer">O total declarado pode superar os lançamentos exibidos: a consulta é paginada em grupos de 40; a disponibilidade depende da consulta à API. Valores ausentes não são zero.</p></>:<p>Escolha uma candidatura para ler os lançamentos.</p>}</section>
 </div>
 <Explore title="Explorar mais: comparações entre campanhas"><ComparisonPanel topic="campanhas" mode={mode}/></Explore>
 </div>;
}
