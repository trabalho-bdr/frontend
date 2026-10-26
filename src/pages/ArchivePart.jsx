import {electionYearsForOffice,municipalOffice} from '../data/filterScope.js';
import {useCatalog} from '../catalog/useCatalog.jsx';
import {readContext,writeContext} from '../data/investigationContext.js';
import {savedEvidence} from '../data/exhibition.js';
import CandidateTimeline from '../components/exhibition/CandidateTimeline.jsx';
import '../catalog/catalog.css';
// Caixa de fichas tridimensional + busca paginada, preservando o design do portal.
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {motion,AnimatePresence} from 'motion/react';
import {Search,RotateCcw,FolderOpen,ArrowRight,ArrowLeft,X,SlidersHorizontal,Users,Layers3,ChevronsRight,MapPin,Flag,CalendarDays,Landmark} from 'lucide-react';
import Arquivo3D from '../components/Arquivo3D.jsx';
import ComparisonPanel from '../components/ComparisonPanel.jsx';
const sampleCandidates=[];
import {states} from '../data/catalog.js';
import {getPeople} from '../data/client.js';
import {FACETS,PARTIES,YEARS,OFFICES,drawerOptions,optionsForFacet,matchesCandidate,compareIsEquivalent} from '../arquivo/filing.js';

const fmtMoney=n=>n==null?'Não informado':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const fmtNum=n=>n==null?'—':Number(n).toLocaleString('pt-BR');
const wealthReference=[];
const PAGE_SIZE=12;
const PASTA=['pasta-yellow','pasta-red','pasta-blue','pasta-green','pasta-coral'];
const FACET_ICONS={ano:CalendarDays,partido:Flag,cargo:Landmark,uf:MapPin};
const TITLES={ano:'Fichário cronológico',partido:'Fichário de partidos',cargo:'Fichário por cargo',uf:'Fichário territorial'};

export default function ArchivePart({mode,onResearch,onOpenCandidate,onOpenPerson,initialCandidate=null}){
  initialCandidate={...readContext(),...initialCandidate};
  const [facet,setFacet]=useState('ano'),[facetPage,setFacetPage]=useState(0);
  const [year,setYear]=useState(String(initialCandidate?.ano??'')),[uf,setUf]=useState(initialCandidate?.uf||''),[party,setParty]=useState(initialCandidate?.partido||''),[cargo,setCargo]=useState(initialCandidate?.cargo||''),[resultado,setResultado]=useState('');
  const [search,setSearch]=useState(initialCandidate?.nome||initialCandidate?.buscaPessoa||''),[page,setPage]=useState(0),[order,setOrder]=useState('recentes');
  const [drawer,setDrawer]=useState('2024'),[focusIndex,setFocusIndex]=useState(-1),[phase,setPhase]=useState('pronta');
  const [rows,setRows]=useState([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(false),[err,setErr]=useState('');
  const [municipioId,setMunicipioId]=useState(municipalOffice(cargo)&&uf?readContext().municipioId||'':'');
  const filterOptions=useCatalog('opcoes',{ano:year,uf,cargo});
  const changeYear=value=>{setYear(value);setParty('');if(cargo&&!electionYearsForOffice(cargo).includes(Number(value))){setCargo('');setMunicipioId('')}};
  const changeCargo=value=>{setCargo(value);setParty('');setMunicipioId('');if(value&&!electionYearsForOffice(value).includes(Number(year)))setYear(String(electionYearsForOffice(value).at(-1)))};
  const changeUf=value=>{setUf(value);setMunicipioId('');setParty('')};
  const [chosen,setChosen]=useState(null),[flip,setFlip]=useState(false),[compare,setCompare]=useState([]);
  const timers=useRef([]),lastAuto=useRef('');
  const clearTimeline=()=>{timers.current.forEach(clearTimeout);timers.current=[]};
  useEffect(()=>()=>clearTimeline(),[]);
  const sameContest=!!(year&&cargo&&uf&&(!municipalOffice(cargo)||municipioId));
  const numberBlocked=/^\d+$/.test(search.trim())&&!sameContest;
  const canRankVotes=sameContest&&['VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','SENADOR'].includes(cargo);
  useEffect(()=>{if((order==='votos'&&!canRankVotes)||(['gastos','custo_voto'].includes(order)&&!sameContest))setOrder('recentes')},[sameContest,canRankVotes,order]);
  useEffect(()=>{setPage(0);setChosen(null)},[year,uf,party,cargo,municipioId,resultado,search,order]);
  useEffect(()=>{
    if(mode!=='live')return;
    let active=true;
    setLoading(true);setRows([]);setErr('');
    const timer=setTimeout(async()=>{
      try{
        const comparable=!!(year&&cargo&&uf&&(!municipalOffice(cargo)||municipioId));
        const effectiveOrder=(order==='votos'&&!canRankVotes)||(['gastos','custo_voto'].includes(order)&&!comparable)?'recentes':order;
        const result=await getPeople({ano:year,uf,partido:party,cargo,municipio:municipalOffice(cargo)?municipioId:'',resultado,search,ordem:effectiveOrder,limit:PAGE_SIZE,offset:page*PAGE_SIZE});
        if(active){setRows(result.rows||[]);setTotal(result.total||0)}
      }catch{
        if(active){setRows([]);setTotal(0);setErr('Não foi possível consultar as fichas neste momento.')}
      }finally{if(active)setLoading(false)}
    },240);
    return()=>{active=false;clearTimeout(timer)};
  },[mode,year,uf,party,cargo,municipioId,resultado,search,order,page]);
  const preview=useMemo(()=>{
    if(mode==='live')return rows;
    const all=sampleCandidates.filter(c=>matchesCandidate(c,{ano:year,uf,partido:party,cargo,resultado,search}));
    const sortValue=c=>order==='gastos'?(c.gastos??-1):order==='custo_voto'?(c.gastos!=null&&c.votos>0?c.gastos/c.votos:-1):(c.votos??-1);
    return all.sort((a,b)=>sortValue(b)-sortValue(a));
  },[mode,rows,year,uf,party,cargo,resultado,search,order]);
  const visible=mode==='live'?preview:preview.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const count=mode==='live'?total:preview.length;
  const pages=Math.ceil(count/PAGE_SIZE);
  const drawerRecords=visible.filter(c=>String(c[facet]??'')===drawer);
  const fileCount=loading?0:drawerRecords.length;
  const selectedFile=drawerRecords.findIndex(c=>c.id===visible[focusIndex]?.id);
  const options=useMemo(()=>drawerOptions(facet,facetPage),[facet,facetPage]);
  const maxFacetPage=Math.max(0,Math.ceil(optionsForFacet(facet).length/6)-1);

  // Seleção do ano, sigla, cargo ou UF ocorre pelo mesmo gesto: abrir uma divisória.
  const chooseDrawer=(value)=>{
    clearTimeline();setPhase('abrindo');setFocusIndex(-1);setChosen(null);setFlip(false);
    setDrawer(drawer===value?'':value);
    if(facet==='ano')changeYear(value);
    if(facet==='partido')setParty(value);
    if(facet==='cargo')changeCargo(value);
    if(facet==='uf')changeUf(value);
    timers.current.push(setTimeout(()=>setPhase('pronta'),900));
  };
  const changeFacet=(next)=>{
    clearTimeline();setFacet(next);setPhase('pronta');setFocusIndex(-1);setChosen(null);setFlip(false);
    const selected=next==='ano'?year:next==='partido'?party:next==='cargo'?cargo:uf;
    const location=optionsForFacet(next).indexOf(selected);
    setFacetPage(location<0?0:Math.floor(location/6));
    setDrawer(location<0?'':selected);
  };
  useEffect(()=>{
    if(phase==='localizando')return;
    const current=facet==='ano'?year:facet==='partido'?party:facet==='cargo'?cargo:uf;
    const view=drawerOptions(facet,facetPage);
    setDrawer(view.some(x=>x.id===current)?current:'');
  },[facet,facetPage,year,uf,party,cargo]);

  useEffect(()=>{
    clearTimeline();setChosen(null);setFocusIndex(-1);setFlip(false);setPhase('pronta');
    const current=facet==='ano'?year:facet==='partido'?party:facet==='cargo'?cargo:uf;
    const location=optionsForFacet(facet).indexOf(current);
    setFacetPage(location<0?0:Math.floor(location/6));
  },[year,uf,party,cargo,resultado,search,order,page]);

  const locate=useCallback((candidate,index)=>{
    if(!candidate)return;
    clearTimeline();setChosen(null);setFlip(false);setFocusIndex(index);setDrawer('');setPhase('localizando');
    if(typeof window!=='undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      const value=facet==='ano'?String(candidate.ano):facet==='partido'?candidate.partido:facet==='cargo'?candidate.cargo:candidate.uf;
      const index=optionsForFacet(facet).indexOf(value);
      if(index>=0)setFacetPage(Math.floor(index/6));
      setDrawer(value||'');setChosen(candidate);setPhase('pronta');return;
    }
    // A câmera encontra a divisória, seleciona a ficha e ela emerge da caixa indexada.
    // Ir à divisória REAL do candidato, não à primeira divisória arbitrária.
    const target=facet==='ano'?String(candidate.ano):facet==='partido'?candidate.partido:facet==='cargo'?candidate.cargo:candidate.uf;
    const all=optionsForFacet(facet);
    const location=all.indexOf(target);
    if(location>=0 && Math.floor(location/6)!==facetPage)setFacetPage(Math.floor(location/6));
    const shelf=drawerOptions(facet,location>=0?Math.floor(location/6):facetPage);
    const destination=shelf.some(o=>o.id===target)?target:(shelf[0]?.id||'');
    setDrawer(destination)
    setChosen(candidate)
    setPhase('pronta')
  },[facet,facetPage,year,uf,party,cargo]);
  // Pesquisa de texto aciona o percurso pelo arquivo após a digitação estabilizar.
  useEffect(()=>{
    if(loading||visible.length===0||search.trim().length<3)return;
    const signature=[search,year,uf,party,cargo,resultado,page,mode].join('|');
    if(lastAuto.current===signature)return;
    const linked=initialCandidate&&search===initialCandidate.nome;
    const target=linked?visible.find(c=>c.id===initialCandidate.id):visible[0];
    if(!target)return;
    const t=setTimeout(()=>{lastAuto.current=signature;locate(target,visible.indexOf(target))},550);
    return()=>clearTimeout(t);
  },[search,year,uf,party,cargo,resultado,page,mode,loading,visible,locate]);
  const addToDesk=c=>setCompare(old=>old.some(x=>x.id===c.id)?old:old.length>=3?old:[...old,c]);
  const phaseLabel={localizando:'LOCALIZANDO A PASTA',abrindo:'LOCALIZANDO A DIVISÓRIA',extraindo:'RETIRANDO A FICHA',pronta:'ARQUIVO PRONTO'}[phase];
  const reset=()=>{clearTimeline();setSearch('');setParty('');setCargo('');setResultado('');setUf('');setMunicipioId('');setYear('');setPage(0);setFacet('ano');setFacetPage(0);setDrawer('2024');setChosen(null);setFlip(false);setPhase('pronta');setFocusIndex(-1);lastAuto.current=''};
  return <div className="archive-v6">
    <div className="section-header"><div><div className="eyebrow"><span className="eyebrow-dot"/>PESSOAS · ELEIÇÕES · TRAJETÓRIAS</div><h2>O ARQUIVO <em>SE ABRE.</em></h2><p>Uma pessoa por ficha no recorte. Explore o acervo em 3D e abra o mesmo perfil completo disponível em Candidatos. Cada ficha mostra uma eleição correspondente aos filtros.</p></div></div>
    <div className="archive-v6-theatre archive-v7-theatre">
      <section className="frame archive-v6-scene archive-v7-scene" aria-label="Fichário de candidaturas em três dimensões">
        <div className="frame-caption"><span>● FICHÁRIO ELEITORAL</span><span>ESCOLHA UMA DIVISÓRIA · RETIRE UMA FICHA · VIRE O SANTINHO</span></div>
        <div className="archive-v6-canvas archive-v7-canvas"><Arquivo3D drawers={options} activeDrawer={drawer} selectedFile={focusIndex}
           fileCount={Math.min(12,visible.length)} candidate={chosen} travelCandidate={visible[focusIndex]||null} flipped={flip} onFlip={()=>setFlip(v=>!v)} onClose={()=>{setChosen(null);setFlip(false);setFocusIndex(-1)}} onCompare={()=>chosen&&addToDesk(chosen)} onExpenses={()=>chosen&&onOpenCandidate(chosen)} onChoose={chooseDrawer} onPull={(_,i)=>{const c=visible[i];if(!loading&&c)locate(c,i)}} phase={phase}/>
          <div className="archive-v6-floating-title" aria-hidden="true">ARQUIVO<br/><strong>DA DEMOCRACIA</strong><small>PASTAS · CANDIDATURAS · MEMÓRIA</small></div>
          <div className="archive-v6-camera-note" aria-live="polite"><span className={'archive-v6-led '+(phase!=='pronta'?'in-motion':'')}/>{phaseLabel}</div>
          <div className="archive-v6-camera-hint">TOQUE NA FICHA OU NO BOTÃO PARA VIRAR ENTRE O SANTINHO E O DOSSIÊ</div>
        </div>
        <div className="file-reality"><span className="dot-real"/>{mode==='live'?'Acervo pesquisável por ano, cargo, partido e UF.':'Amostra reduzida sem conexão. Com o acervo conectado, a busca alcança todas as candidaturas do recorte.'}</div>
      </section>
      <aside className="archive-v6-rail archive-v7-rail" aria-label="Organizar as divisórias">
        <header>
          <span>CLASSIFICAÇÃO DO ARQUIVO</span>
          <strong>DIVISÓRIAS FÍSICAS</strong>
          <small>Selecione uma gaveta temática e explore as pastas correspondentes.</small>
        </header>
        <div className="archive-v6-facets" role="group" aria-label="Categoria das divisórias">
          {FACETS.map(entry=>{const Icon=FACET_ICONS[entry.id];return <button type="button" key={entry.id} className={facet===entry.id?'active':''} aria-pressed={facet===entry.id} onClick={()=>changeFacet(entry.id)}><Icon size={17}/>{entry.label}</button>})}
        </div>
        <div className="archive-v6-rail-label">{TITLES[facet]}<small>{drawer?`DIVISÓRIA SELECIONADA · ${drawer}`:'ESCOLHA UMA DIVISÓRIA'}</small></div>
        <div className="archive-v6-tabs">{options.map(o=><button type="button" key={o.id} onClick={()=>chooseDrawer(o.id)} className={drawer===o.id?'active':''} aria-pressed={drawer===o.id} style={{'--tab-color':o.color}}><span className="tab-dot"/>{o.label}<ArrowRight size={15}/></button>)}</div>
        {maxFacetPage>0&&<div className="archive-v6-tab-pages"><button aria-label="Divisórias anteriores" disabled={!facetPage} onClick={()=>setFacetPage(x=>Math.max(0,x-1))}>←</button><span>{facetPage+1}/{maxFacetPage+1}</span><button aria-label="Próximas divisórias" disabled={facetPage>=maxFacetPage} onClick={()=>setFacetPage(x=>Math.min(maxFacetPage,x+1))}>→</button></div>}
        
        <section className="catalogue archive-v7-catalogue" aria-label="Busca e fichas de pessoas">
          <div className="catalogue-head">
            <span>PASTAS NA DIVISÓRIA</span>
            <strong>{fmtNum(count)} {count===1?'PASTA':'PASTAS'}</strong>
          </div>
          
          <form className="archive-v6-search" onSubmit={e=>{e.preventDefault();if(visible[0])locate(visible[0],0)}}>
            <label>
              <Search size={18}/>
              <input aria-label="Procurar pessoa por nome ou número eleitoral" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrar por nome ou número nesta gaveta..."/>
            </label>
            {search ? (
              <button type="button" onClick={()=>setSearch('')} title="Limpar busca"><X size={15}/></button>
            ) : (
              <button type="submit" disabled={!visible.length||loading}><ChevronsRight size={17}/> LOCALIZAR</button>
            )}
          </form>

          <div className="archive-quick-pills" role="group" aria-label="Filtros rápidos da gaveta">
            <button type="button" className={`archive-quick-pill ${!resultado?'active':''}`} onClick={()=>setResultado('')}>Todos</button>
            <button type="button" className={`archive-quick-pill ${resultado==='ELEITO'?'active':''}`} onClick={()=>setResultado(resultado==='ELEITO'?'':'ELEITO')}>Eleitos</button>
            <button type="button" className={`archive-quick-pill ${order==='recentes'?'active':''}`} onClick={()=>setOrder('recentes')}>Recentes</button>
            {canRankVotes && <button type="button" className={`archive-quick-pill ${order==='votos'?'active':''}`} onClick={()=>setOrder('votos')}>Mais votos</button>}
            {sameContest && <button type="button" className={`archive-quick-pill ${order==='gastos'?'active':''}`} onClick={()=>setOrder('gastos')}>Mais gastos</button>}
          </div>

          <div className="folder-hint"><SlidersHorizontal size={14}/> Toque na pasta para abrir no armário ou em "+ MESA" para comparar.</div>

          {loading?<div className="catalogue-empty">Procurando no arquivo…</div>:err?<div className="catalogue-empty">{err}</div>:visible.length===0?<div className="catalogue-empty"><FolderOpen size={38}/><p>Não encontramos fichas nesse recorte{mode!=='live'?' da amostra local':''}. Tente outros filtros.</p></div>:<div className="archive-v6-folder-list">
            {visible.map((c,i)=>{
              const inDesk = compare.some(x=>x.id===c.id);
              return (
                <div key={c.id} className="folder-row-container">
                  <motion.button type="button" whileHover={{x:3}} whileTap={{scale:.985}}
                    onClick={()=>locate(c,i)} className={`folder-tab ${PASTA[i%PASTA.length]} ${chosen?.id===c.id?'selected':''}`} aria-label={`Localizar e retirar ficha de ${c.nome}`}>
                    <span className="folder-ear">{c.partido||'—'}</span>
                    <span className="folder-name">{c.nome}</span>
                    <small>{c.municipio||c.uf} · {c.ano} · {c.cargo}</small>
                    <ArrowRight size={17}/>
                  </motion.button>
                  <button
                    type="button"
                    className={`folder-compare-pill ${inDesk?'in-desk':''}`}
                    onClick={(e)=>{
                      e.stopPropagation();
                      if(inDesk) setCompare(list=>list.filter(x=>x.id!==c.id));
                      else addToDesk(c);
                    }}
                    title={inDesk?'Remover da mesa de comparação':'Adicionar à mesa de comparação'}>
                    {inDesk ? '✓ NA MESA' : '+ MESA'}
                  </button>
                </div>
              );
            })}
          </div>}

          <div className="catalogue-pagination">
            <button disabled={page===0} onClick={()=>setPage(x=>Math.max(0,x-1))}><ArrowLeft size={16}/> ANTERIOR</button>
            <span>{pages?`${page+1} / ${pages}`:'SEM RESULTADOS'}</span>
            <button disabled={page+1>=pages} onClick={()=>setPage(x=>x+1)}>PRÓXIMAS PASTAS <ArrowRight size={16}/></button>
          </div>
        </section>

        <button className="archive-v6-restore" type="button" onClick={reset}><RotateCcw size={14}/> REORGANIZAR TUDO</button>
        <p>As cores das divisórias servem à navegação física do acervo.</p>
      </aside>
    </div>

    {chosen&&onOpenPerson&&<button className="catalog-back" onClick={()=>onOpenPerson(chosen)}>Abrir o perfil completo em Candidatos ↗</button>}
    <CandidateTimeline candidate={chosen}/>

    <section className="comparison-desk" id="mesa-comparacao">
      <div className="desk-caption">
        <div>
          <span>MESA DE COMPARAÇÃO</span>
          <small style={{display:'block',marginTop:2,opacity:.85}}>COLOQUE ATÉ 3 FICHAS LADO A LADO PARA ANALISAR DIFERENÇAS</small>
        </div>
        <div className="desk-caption-actions">
          <span>{compare.length} / 3 FICHAS</span>
          {compare.length > 0 && (
            <button type="button" className="desk-clear-btn" onClick={()=>setCompare([])}>
              <RotateCcw size={12}/> LIMPAR MESA
            </button>
          )}
        </div>
      </div>

      <div className="desk-items">
        {[0,1,2].map(i=>{
          const c = compare[i];
          if(c) {
            const maxVotos = Math.max(...compare.map(x=>x.votos??-1));
            const maxGastos = Math.max(...compare.map(x=>x.gastos??-1));
            const isWinnerVotes = compare.length > 1 && c.votos != null && c.votos > 0 && c.votos === maxVotos;
            const isTopGastos = compare.length > 1 && c.gastos != null && c.gastos > 0 && c.gastos === maxGastos;
            return (
              <div className="desk-file filled" key={c.id}>
                <button className="desk-remove" onClick={()=>setCompare(list=>list.filter(x=>x.id!==c.id))} aria-label={`Remover ${c.nome}`}>
                  <X size={14}/>
                </button>
                <div className="desk-card-header">
                  <span className="desk-party-badge">{c.partido || '—'}</span>
                  <span className="desk-year-tag">{c.ano} · {c.cargo}</span>
                </div>
                <strong className="desk-candidate-name">{c.nome}</strong>
                <span className="desk-candidate-loc">{c.municipio ? `${c.municipio} (${c.uf})` : c.uf}</span>
                {c.resultado && (
                  <span className={`desk-result-tag result-${String(c.resultado).toLowerCase().replace(/\s+/g,'-')}`}>
                    {c.resultado}
                  </span>
                )}
                <div className="desk-card-stats">
                  <div className={`desk-stat-item ${isWinnerVotes ? 'stat-highlight' : ''}`}>
                    <small>VOTOS RECEBIDOS</small>
                    <strong>{fmtNum(c.votos)}</strong>
                    {isWinnerVotes && <span className="stat-badge">MAIOR VOTAÇÃO</span>}
                  </div>
                  <div className={`desk-stat-item ${isTopGastos ? 'stat-highlight' : ''}`}>
                    <small>DESPESAS DECLARADAS</small>
                    <strong>{fmtMoney(c.gastos)}</strong>
                    {isTopGastos && <span className="stat-badge">MAIOR GASTO</span>}
                  </div>
                  <div className="desk-stat-item">
                    <small>PATRIMÔNIO DECLARADO</small>
                    <strong>{fmtMoney(c.patrimonio)}</strong>
                  </div>
                </div>
                {onOpenCandidate && (
                  <button type="button" className="desk-card-inspect" onClick={()=>onOpenCandidate(c)}>
                    Ver despesas ↗
                  </button>
                )}
              </div>
            );
          }
          const canAddCurrent = chosen && !compare.some(x=>x.id===chosen.id);
          return (
            <button
              type="button"
              className="desk-file empty-slot"
              key={i}
              onClick={()=>{
                if(canAddCurrent) addToDesk(chosen);
                else {
                  document.querySelector('.archive-v6-rail')?.scrollIntoView({behavior:'smooth'});
                }
              }}
              aria-label={`Espaço da ficha ${i+1}`}>
              {canAddCurrent ? (
                <>
                  <span className="empty-slot-plus">+</span>
                  <strong>COLOCAR FICHA ABERTA</strong>
                  <span className="empty-slot-cand">"{chosen.nome}"</span>
                  <small style={{fontSize:10,opacity:.9}}>Clique para colocar esta ficha na mesa</small>
                </>
              ) : (
                <>
                  <span className="empty-slot-plus">+</span>
                  <strong>COLOQUE A FICHA {i+1}</strong>
                  <small style={{fontSize:10,opacity:.85}}>Toque em "+ MESA" em qualquer pasta ao lado</small>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="desk-method-note">
        {compare.length>1&&!compareIsEquivalent(compare)? (
          <p className="desk-warning">⚠ Atenção: as candidaturas selecionadas disputaram cargos, anos ou municípios diferentes. Interprete as comparações de valores com cautela.</p>
        ) : (
          <p>Para comparar taxas e custos com rigor, compare candidaturas do mesmo cargo, ano e território. Ausência de valor cadastrado não equivale a zero.</p>
        )}
      </div>

      <ComparisonPanel topic="fichas" mode={mode} candidates={compare}/>
    </section>

    <ComparisonPanel topic="arquivo" mode={mode}/>
    <section className="archive-insight"><div><span className="insight-index">INVESTIGAÇÃO / PATRIMÔNIO E VITÓRIA</span><h3>O QUE EXISTE ATRÁS DO <em>SANTINHO?</em></h3><p>Consulte as faixas de patrimônio e suas taxas de eleição. A comparação é descritiva e não demonstra causalidade.</p><button onClick={()=>onResearch(2)}>EXPLORAR A INVESTIGAÇÃO <ArrowRight size={16}/></button></div></section>
  </div>;
}
