import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCcw, Landmark, Search, Filter, AlertTriangle, Layers,
  ArrowRight, DollarSign, Users, Award, BookOpen, Info, CheckCircle2
} from 'lucide-react';

import Plenario3D, { plenarioAssentos } from '../Plenario3D.jsx';
import { blockSeats } from '../data.js';
import CostFormula from './CostFormula.jsx';
import ElectionInsights from './ElectionInsights.jsx';
import CandidateSpendingRanking from './CandidateSpendingRanking.jsx';
import SpendingVotesScatter from './SpendingVotesScatter.jsx';
import TemporalAnalysis from './TemporalAnalysis.jsx';
import ComparisonPanel from '../ComparisonPanel.jsx';

import {
  fetchQuestao1Overview,
  fetchQuestao1Eleitos,
  fetchQuestao1Ranking,
  fetchQuestao1Dispersao
} from '../../data/questao1Client.js';

import './questao1.css';

const UFS = ['', 'CE', 'MA', 'MS', 'RJ', 'RN', 'RS'];
const CARGOS = ['VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL'];
const stateColors={CE:'#a64235',MA:'#c07a2d',MS:'#557858',RJ:'#315e90',RN:'#8b5689',RS:'#bd9c38'};
function distributeSeats(rows,count){
 const valid=rows.filter(row=>Number(row.eleitos)>0),total=valid.reduce((sum,row)=>sum+Number(row.eleitos),0);
 if(!total)return [];
 const quotas=valid.map(row=>({row,exact:count*Number(row.eleitos)/total}));
 const portions=quotas.map(item=>Math.floor(item.exact));
 let remaining=count-portions.reduce((sum,value)=>sum+value,0);
 quotas.map((item,index)=>({index,remainder:item.exact-portions[index]})).sort((a,b)=>b.remainder-a.remainder).slice(0,remaining).forEach(item=>portions[item.index]++);
 return quotas.flatMap((item,index)=>Array.from({length:portions[index]},()=>item.row));
}

const money = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fNum = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR');

export default function CostPerSeatStory({
  mode = 'snapshot',
  onResearch,
  onOpenCandidate
}) {
  // 1. Estado compartilhado dos filtros
  const [cargo, setCargo] = useState('VEREADOR');
  const [ano, setAno] = useState(2024);
  const [uf, setUf] = useState('');
  const [municipioId, setMunicipioId] = useState('');
  const [municipioNome, setMunicipioNome] = useState('');
  const [muniSearch, setMuniSearch] = useState('');
  const [muniList, setMuniList] = useState([]);
  const [showMuniDropdown, setShowMuniDropdown] = useState(false);

  // 2. Estado da maquete 3D do Plenário
  const [focus, setFocus] = useState('todos');
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [replay, setReplay] = useState(0);
  const [view,setView]=useState('estados');
  const [electedData,setElectedData]=useState(null);
  const [deepOpen,setDeepOpen]=useState(false);

  // 3. Dados da Experiência 1 (Overview + Insights + Temporal)
  const [overviewData, setOverviewData] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // 4. Dados da Experiência 2 (Ranking)
  const [rankingRows, setRankingRows] = useState([]);
  const [rankingTotal, setRankingTotal] = useState(0);
  const [rankingPage, setRankingPage] = useState(1);
  const [rankingLimit] = useState(12);
  const [rankingOrdem, setRankingOrdem] = useState('custo_voto');
  const [rankingFiltroResultado, setRankingFiltroResultado] = useState('todos');
  const [loadingRanking, setLoadingRanking] = useState(false);

  // 5. Dados da Experiência 3 (Dispersão)
  const [scatterData, setScatterData] = useState(null);
  const [loadingScatter, setLoadingScatter] = useState(false);

  // 6. Candidatura Selecionada (Sincronizada entre Ranking e Dispersão)
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Ajuste de Anos Compatíveis ao trocar Cargo
  const handleCargoChange = (novoCargo) => {
    setCargo(novoCargo);
    setMunicipioId('');
    setMunicipioNome('');
    setMuniSearch('');
    if (novoCargo === 'VEREADOR') {
      setAno(2024);
    } else {
      setAno(2022);
    }
    if (novoCargo === 'PRESIDENTE') {
      setUf('');
    }
    setRankingPage(1);
    setSelectedCandidate(null);
  };

  const handleAnoChange = (novoAno) => {
    setAno(Number(novoAno));
    setRankingPage(1);
    setSelectedCandidate(null);
  };

  const handleUfChange = (novaUf) => {
    setUf(novaUf);
    setFocus('todos');
    setSelectedSeat(null);
    setMunicipioId('');
    setMunicipioNome('');
    setMuniSearch('');
    setRankingPage(1);
    setSelectedCandidate(null);
  };

  // Carregar municípios para autocomplete quando cargo for Vereador e houver busca
  useEffect(() => {
    if (cargo !== 'VEREADOR' || !muniSearch || muniSearch.length < 2) {
      setMuniList([]);
      return;
    }
    let active = true;
    const url = `/api/municipios?search=${encodeURIComponent(muniSearch)}&uf=${uf}&limit=10`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data)) {
          setMuniList(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [cargo, muniSearch, uf]);

  // Carregar Overview da Questão 1
  useEffect(() => {
    let active = true;
    setLoadingOverview(true);
    setOverviewData(null);
    fetchQuestao1Overview({ ano, cargo, uf, municipioId })
      .then((res) => {
        if (active) {
          setOverviewData(res);
          setLoadingOverview(false);
        }
      })
      .catch(() => {
        if (active) setLoadingOverview(false);
      });
    return () => {
      active = false;
    };
  }, [ano, cargo, uf, municipioId]);

  // Carregar Ranking da Questão 1
  useEffect(() => {
    if(!deepOpen)return;
    let active = true;
    setLoadingRanking(true);
    const offset = (rankingPage - 1) * rankingLimit;
    fetchQuestao1Ranking({
      ano,
      cargo,
      uf,
      municipioId,
      filtroResultado: rankingFiltroResultado,
      ordem: rankingOrdem,
      limit: rankingLimit,
      offset
    })
      .then((res) => {
        if (active) {
          setRankingRows(res.rows || []);
          setRankingTotal(res.total || 0);
          setLoadingRanking(false);
        }
      })
      .catch(() => {
        if (active) setLoadingRanking(false);
      });
    return () => {
      active = false;
    };
  }, [deepOpen,ano, cargo, uf, municipioId, rankingPage, rankingOrdem, rankingFiltroResultado, rankingLimit]);

  // Carregar Dispersão da Questão 1
  useEffect(() => {
    if(!deepOpen)return;
    let active = true;
    setLoadingScatter(true);
    fetchQuestao1Dispersao({
      ano,
      cargo,
      uf,
      municipioId,
      maxPontos: 900
    })
      .then((res) => {
        if (active) {
          setScatterData(res);
          setLoadingScatter(false);
        }
      })
      .catch(() => {
        if (active) setLoadingScatter(false);
      });
    return () => {
      active = false;
    };
  }, [deepOpen,ano, cargo, uf, municipioId]);

  useEffect(()=>{
    let active=true;
    setElectedData(null);
    setSelectedSeat(null);
    if(view==='pessoas'&&cargo!=='PRESIDENTE')fetchQuestao1Eleitos({ano,cargo,uf,municipioId}).then(data=>{if(active)setElectedData(data)});
    return()=>{active=false};
  },[view,ano,cargo,uf,municipioId]);

  // Seleção sincronizada
  const handleSelectCandidate = (cand) => {
    setSelectedCandidate((prev) => (prev?.id === cand.id ? null : cand));
  };

  const overviewValues = overviewData?.data || {};
  const stateRows=(overviewData?.por_uf||[]).filter(row=>!uf||row.uf===uf).filter(row=>UFS.includes(row.uf));
  const seats=useMemo(()=>{
    const allocations=distributeSeats(stateRows,plenarioAssentos.length);
    const people=electedData?.rows||[];
    return plenarioAssentos.map((seat,index)=>{
      if(view==='pessoas'){
        const person=people[index];
        return {...seat,block:person?.uf||'sem-dado',name:person?.nome||'Sem candidatura carregada',color:person?'#bf7646':'#87919a',person};
      }
      const state=allocations[index];
      return {...seat,block:state?.uf||'sem-dado',name:state?.uf||'Sem estado carregado',color:stateColors[state?.uf]||'#87919a',state};
    });
  },[view,stateRows,electedData]);

  return (
    <div className="q1-story"><header className="q1-head"><span>PLENÁRIO / CUSTO AGREGADO</span><h1>Quanto custa uma <em>cadeira?</em></h1><p>Escolha o recorte, compare estados e selecione a visão do Plenário. Os nomes exibidos são de candidaturas com resultado de eleitas no acervo.</p></header><p className="expo-source">{overviewData?.source==='live'?'Consulta atual':overviewData?.source==='snapshot'?'Referência do acervo':'Recorte indisponível'} · {ano} · {cargo} · {uf||'6 UFs'}</p>
      {/* =========================================================================
          FAIXA DE FILTROS COMPARTILHADOS (Ano, Cargo, Estado, Município)
          ========================================================================= */}
      <div className="q1-filter-bar">
        <div className="q1-filter-title">
          <Filter size={18} />
          <span>RECORTE DE ANÁLISE</span>
        </div>

        {/* Cargo */}
        <div className="q1-filter-group">
          <label>Cargo Eleitoral</label>
          <select
            className="q1-select"
            value={cargo}
            onChange={(e) => handleCargoChange(e.target.value)}
            aria-label="Selecionar cargo eleitoral"
          >
            <option value="VEREADOR">Vereador (Eleições Municipais)</option>
            <option value="DEPUTADO ESTADUAL">Deputado Estadual (Eleições Gerais)</option>
            <option value="DEPUTADO FEDERAL">Deputado Federal (Eleições Gerais)</option>
          </select>
        </div>

        {/* Ano Compatível */}
        <div className="q1-filter-group">
          <label>Ano do Pleito</label>
          <select
            className="q1-select"
            value={ano}
            onChange={(e) => handleAnoChange(e.target.value)}
            aria-label="Selecionar ano do pleito"
          >
            {cargo === 'VEREADOR' ? (
              <>
                <option value={2024}>2024 (Pleito mais recente)</option>
                <option value={2020}>2020 (Pleito municipal anterior)</option>
              </>
            ) : (
              <>
                <option value={2022}>2022 (Pleito mais recente)</option>
                <option value={2018}>2018 (Pleito geral anterior)</option>
              </>
            )}
          </select>
        </div>

        {/* Estado (UF) */}
        <div className="q1-filter-group">
          <label>Unidade Federativa</label>
          <select
            className="q1-select"
            value={cargo === 'PRESIDENTE' ? '' : uf}
            onChange={(e) => handleUfChange(e.target.value)}
            disabled={cargo === 'PRESIDENTE'}
            aria-label="Selecionar estado"
          >
            {cargo === 'PRESIDENTE' ? (
              <option value="">Brasil (Território Nacional)</option>
            ) : (
              <>
                <option value="">Todas as 6 UFs do Acervo</option>
                {UFS.filter(Boolean).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* Município (somente para Vereador) */}
        {cargo === 'VEREADOR' && (
          <div className="q1-filter-group" style={{ position: 'relative' }}>
            <label>Município (Opcional)</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                className="q1-input"
                placeholder={municipioNome || "Buscar município..."}
                value={muniSearch}
                onChange={(e) => {
                  setMuniSearch(e.target.value);
                  setShowMuniDropdown(true);
                }}
                onFocus={() => setShowMuniDropdown(true)}
                style={{ width: '180px' }}
                aria-label="Filtrar por município"
              />
              {municipioId && (
                <button
                  onClick={() => {
                    setMunicipioId('');
                    setMunicipioNome('');
                    setMuniSearch('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#c84d38',
                    marginLeft: '-22px',
                    fontSize: '0.85rem'
                  }}
                  title="Limpar município"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown de municípios encontrados */}
            {showMuniDropdown && muniList.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 30,
                  background: '#fff',
                  border: '1.5px solid #2d3748',
                  borderRadius: '3px',
                  width: '240px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                {muniList.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setMunicipioId(m.id);
                      setMunicipioNome(m.nome);
                      setMuniSearch(m.nome);
                      setShowMuniDropdown(false);
                      if (!uf) setUf(m.uf);
                    }}
                    style={{
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #edf2f7',
                      color: '#1a202c'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f7fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <strong>{m.nome}</strong> <small style={{ color: '#718096' }}>({m.uf})</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="q1-badge-coverage">
          {cargo === 'PRESIDENTE' ? 'Eleição Presidencial · Território Nacional' : uf ? `UF: ${uf}` : '6 UFs Auditadas (CE, MA, MS, RJ, RN, RS)'}
        </div>
      </div>

      {/* =========================================================================
          EXPERIÊNCIA 1 — O PLENÁRIO E O CUSTO DE UMA CADEIRA
          ========================================================================= */}
      <section className="q1-experience-1">
        <div className="q1-plenary-editorial">
          {/* Palco 3D do Plenário com a Maquete Cenográfica */}
          <div className="q1-plenary-stage">
            <div className="q1-plenary-watermark">PLENÁRIO 3D · {view==='estados'?'VISÃO POR ESTADO':'CANDIDATURAS ELEITAS'}</div>
            <div className="q1-view-switch" role="group" aria-label="Visão do plenário"><button aria-pressed={view==='estados'} onClick={()=>{setView('estados');setFocus('todos');setSelectedSeat(null)}}>Custo por estado</button><button aria-pressed={view==='pessoas'} onClick={()=>{setView('pessoas');setFocus('todos');setSelectedSeat(null)}} disabled={cargo==='PRESIDENTE'}>Quem foi eleito</button></div>
            <p className="q1-plenary-real-data" aria-live="polite">{loadingOverview?'Consultando o acervo…':overviewData?.source==='unavailable'?'Este recorte não está disponível no acervo local.':`${fNum(overviewValues.eleitos)} candidaturas eleitas · ${money(overviewValues.total_despesas)} em despesas declaradas no recorte.`}</p>

            <div style={{ flex: 1, minHeight: '430px' }}>
              <Plenario3D
                focus={focus}
                selectedSeat={selectedSeat}
                onPick={seat=>{setSelectedSeat(seat);setFocus(view==='estados'?seat.block:'todos')}}
                replay={replay}
                seats={seats}
              />
            </div>

            <div className="q1-seat-detail" aria-live="polite">{selectedSeat?.person?<><strong>{selectedSeat.person.nome}</strong><span>{selectedSeat.person.partido||'Partido não informado'} · {selectedSeat.person.municipio||selectedSeat.person.uf}/{selectedSeat.person.uf} · {fNum(selectedSeat.person.votos)} votos · {money(selectedSeat.person.gastos)} declarados</span><button onClick={()=>onOpenCandidate?.(selectedSeat.person)}>Abrir candidatura ↗</button></>:selectedSeat?.state?<><strong>{selectedSeat.state.uf} · {money(selectedSeat.state.gasto_por_cadeira)} por cadeira</strong><span>{fNum(selectedSeat.state.eleitos)} candidaturas eleitas · {money(selectedSeat.state.total_despesas)} em despesas</span></>:<span>{view==='pessoas'?electedData?.rows?.length?'Selecione uma cadeira colorida para ver uma candidatura eleita do recorte.':'Não há nomes carregados para este recorte; tente outro ano, cargo ou estado.':'Selecione uma cadeira para ver o custo agregado do estado.'}</span>}</div>
            <p className="q1-maquette-note">As 72 cadeiras formam uma maquete. {view==='estados'?'A quantidade de cadeiras coloridas é proporcional aos eleitos de cada UF, sem reproduzir uma casa legislativa real.':`Aparecem ${fNum(electedData?.rows?.length||0)} candidaturas eleitas ordenadas por votos${electedData?.source==='snapshot'?' da amostra parcial do acervo':''}; quando há vários municípios, elas não pertencem à mesma Câmara.`}</p>
          </div>

          {/* Painel Editorial: O Cálculo Explicado e Big Number */}
          <div className="q1-plenary-aside">
            <div>
              <span className="stamp stamp-blue">QUANTO CUSTA UMA CADEIRA?</span>
              <h3 className="q1-focused-title">Quanto foi declarado por cadeira conquistada?</h3>
              <p className="q1-focused-intro">{ano} · {cargo} · {municipioNome ? `${municipioNome}/${uf}` : uf || 'seis UFs'}. Soma das despesas de todas as candidaturas dividida pelo número de eleitos.</p>

              {/* Big Number do Gasto Agregado por Cadeira */}
              <motion.div
                key={`${ano}_${cargo}_${uf}_${municipioId}`}
                className="q1-cost-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
              >
                <div className="q1-cost-value">
                  {loadingOverview ? 'Calculando…' : money(overviewValues.gasto_por_cadeira)}
                </div>
                <div className="q1-cost-sub">
                  {cargo} · {ano} · {municipioNome ? `${municipioNome}/${uf}` : uf || '6 UFs'}
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.65rem', borderTop: '1px solid #edf2f7', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                  <span><strong>{fNum(overviewValues.eleitos)}</strong> cadeiras conquistadas</span>
                  <span><strong>{money(overviewValues.total_despesas)}</strong> declarados</span>
                </div>
              </motion.div>

              {/* Explicação Progressiva e Animada da Fórmula */}
              <details className="q1-formula-detail"><summary>Como foi calculado este valor</summary><CostFormula
                totalDespesas={overviewValues.total_despesas}
                eleitos={overviewValues.eleitos}
                gastoPorCadeira={overviewValues.gasto_por_cadeira}
                totalCandidaturas={overviewValues.total_candidaturas}
                candidaturasComGasto={overviewValues.candidaturas_com_gasto}
              /></details>
              {view==='estados'&&stateRows.length>0&&<div className="q1-state-costs"><strong>CUSTO POR ESTADO</strong>{stateRows.slice().sort((a,b)=>(b.gasto_por_cadeira||0)-(a.gasto_por_cadeira||0)).map(row=><button key={row.uf} onClick={()=>handleUfChange(row.uf)} aria-pressed={uf===row.uf}><span style={{background:stateColors[row.uf]}}/>{row.uf}<b>{money(row.gasto_por_cadeira)}</b><small>{fNum(row.eleitos)} eleitos</small></button>)}{uf&&<button className="q1-all-states" onClick={()=>handleUfChange('')}>Ver seis UFs ↗</button>}</div>}
            </div>

            {/* Aviso sobre Maquete Simbólica */}
            <p className="q1-cost-limit">Gasto agregado por cadeira é uma razão descritiva, não o preço de um mandato nem o gasto individual de cada eleito. Valores nominais declarados.</p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          DESCOBERTAS AUTOMÁTICAS ("O que os números revelam?")
          ========================================================================= */}
      <details className="q1-deep" onToggle={event=>setDeepOpen(event.currentTarget.open)}><summary>Explorar candidaturas, votos e comparações</summary>{deepOpen&&<><ElectionInsights
        insights={overviewData?.insights}
        ano={ano}
        cargo={cargo}
        uf={uf}
        municipioNome={municipioNome}
      />

      {/* =========================================================================
          EXPERIÊNCIA 2 — NEM TODAS AS CADEIRAS CUSTAM IGUAL (Ranking & Santinhos)
          ========================================================================= */}
      <CandidateSpendingRanking
        candidates={rankingRows}
        totalCandidates={rankingTotal}
        page={rankingPage}
        limit={rankingLimit}
        onPageChange={setRankingPage}
        ordem={rankingOrdem}
        onOrdemChange={(o) => {
          setRankingOrdem(o);
          setRankingPage(1);
        }}
        filtroResultado={rankingFiltroResultado}
        onFiltroResultadoChange={(f) => {
          setRankingFiltroResultado(f);
          setRankingPage(1);
        }}
        selectedCandidateId={selectedCandidate?.id}
        onSelectCandidate={handleSelectCandidate}
        onOpenCandidateModal={onOpenCandidate}
        onResearch={onResearch}
      />

      {/* =========================================================================
          EXPERIÊNCIA 3 — GASTAR MAIS SIGNIFICA RECEBER MAIS VOTOS? (Dispersão)
          ========================================================================= */}
      <p className="expo-source">{scatterData?.partial?'Dispersão da amostra real carregada; não representa a população completa.':'Dispersão da consulta atual; confira o número de pontos e critérios.'}</p>
      <SpendingVotesScatter
        data={scatterData}
        selectedCandidate={selectedCandidate}
        onSelectCandidate={handleSelectCandidate}
        onOpenCandidateModal={onOpenCandidate}
        loading={loadingScatter}
      />

      {/* =========================================================================
          COMPARAÇÕES TEMPORAIS E TERRITORIAIS
          ========================================================================= */}
      <TemporalAnalysis
        serieTemporal={overviewData?.serie_temporal || []}
        porUf={overviewData?.por_uf || []}
        cargo={cargo}
        ano={ano}
      />

      {/* =========================================================================
          PAINEL DE COMPARAÇÃO AUDITADO EXISTENTE
          ========================================================================= */}
      <ComparisonPanel topic="plenario" mode={mode} /></>}
      </details>
    </div>
  );
}
