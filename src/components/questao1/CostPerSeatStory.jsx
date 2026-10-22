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
  fetchQuestao1Ranking,
  fetchQuestao1Dispersao
} from '../../data/questao1Client.js';

import './questao1.css';

const UFS = ['', 'CE', 'MA', 'MS', 'RJ', 'RN', 'RS'];
const CARGOS = ['VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'PRESIDENTE'];

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
  }, [ano, cargo, uf, municipioId, rankingPage, rankingOrdem, rankingFiltroResultado, rankingLimit]);

  // Carregar Dispersão da Questão 1
  useEffect(() => {
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
  }, [ano, cargo, uf, municipioId]);

  // Seleção sincronizada
  const handleSelectCandidate = (cand) => {
    setSelectedCandidate((prev) => (prev?.id === cand.id ? null : cand));
  };

  const overviewValues = overviewData?.data || {};

  return (
    <div className="q1-story">
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
            <option value="PRESIDENTE">Presidente da República (Eleições Gerais)</option>
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
            <div className="q1-plenary-watermark">
              ● MAQUETE SIMBÓLICA (72 CADEIRAS CENOGRÁFICAS)
            </div>

            <div style={{ flex: 1, minHeight: '430px' }}>
              <Plenario3D
                focus={focus}
                selectedSeat={selectedSeat}
                onPick={setSelectedSeat}
                replay={replay}
              />
            </div>

            {/* Controles da Maquete Cenográfica */}
            <div className="plenary-controls" style={{ margin: '0.75rem', background: 'rgba(13,35,70,0.85)', borderRadius: '4px', padding: '0.5rem' }}>
              {blockSeats.map((b) => (
                <button
                  key={b.id}
                  className={focus === b.id ? 'chosen' : ''}
                  onClick={() => setFocus(focus === b.id ? 'todos' : b.id)}
                  style={{ fontSize: '0.72rem' }}
                >
                  <span style={{ background: b.color }} /> {b.name}: {b.count}
                </button>
              ))}
              <button
                onClick={() => {
                  setReplay((n) => n + 1);
                  setSelectedSeat(null);
                }}
                style={{ fontSize: '0.72rem' }}
              >
                <RotateCcw size={13} /> Reiniciar Maquete
              </button>
            </div>
          </div>

          {/* Painel Editorial: O Cálculo Explicado e Big Number */}
          <div className="q1-plenary-aside">
            <div>
              <span className="stamp stamp-blue">QUANTO CUSTA UMA CADEIRA?</span>
              <h3 style={{ margin: '0.5rem 0 0.25rem', fontFamily: 'Cinzel, serif', fontSize: '1.45rem', color: '#174a8b' }}>
                O PODER TEM CUSTO AGREGADO.
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#4a5568', margin: '0.25rem 0 0.85rem' }}>
                Para o mandato de <strong>{cargo}</strong> em <strong>{ano}</strong> ({municipioNome ? `${municipioNome}/${uf}` : uf || '6 estados'}), calculamos o investimento total declarado de todas as candidaturas proporcionalmente aos assentos obtidos.
              </p>

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
              <CostFormula
                totalDespesas={overviewValues.total_despesas}
                eleitos={overviewValues.eleitos}
                gastoPorCadeira={overviewValues.gasto_por_cadeira}
                totalCandidaturas={overviewValues.total_candidaturas}
                candidaturasComGasto={overviewValues.candidaturas_com_gasto}
              />
            </div>

            {/* Aviso sobre Maquete Simbólica */}
            <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: '#718096', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
              * <strong>Atenção metodológica:</strong> As 72 cadeiras do modelo 3D ao lado constituem uma maquete cenográfica e ilustrativa da casa parlamentar; a quantidade real de mandatos do recorte filtrado ({fNum(overviewValues.eleitos)} cadeiras) é informada com precisão auditada no painel.
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          DESCOBERTAS AUTOMÁTICAS ("O que os números revelam?")
          ========================================================================= */}
      <ElectionInsights
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
      <ComparisonPanel topic="plenario" mode={mode} />
    </div>
  );
}
