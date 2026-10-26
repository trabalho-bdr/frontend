import RecordCollection from './RecordCollection.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, Legend,
  ScatterChart, Scatter, ZAxis, ComposedChart, Line
} from 'recharts';
import {
  fetchQuestao1Overview,
  fetchQuestao1Dossie,
  fetchQuestao1Dispersao
} from '../data/questao1Client.js';
import './custo-cadeira-dossie.css';

const UFS = ['CE', 'MA', 'MS', 'RJ', 'RN', 'RS'];
const SCOPES = [
  ['2024', 'VEREADOR', '2024 · Vereador (Eleições Municipais)'],
  ['2020', 'VEREADOR', '2020 · Vereador (Eleições Municipais)'],
  ['2022', 'DEPUTADO ESTADUAL', '2022 · Deputado Estadual (Eleições Gerais)'],
  ['2018', 'DEPUTADO ESTADUAL', '2018 · Deputado Estadual (Eleições Gerais)'],
  ['2022', 'DEPUTADO FEDERAL', '2022 · Deputado Federal (Eleições Gerais)'],
  ['2018', 'DEPUTADO FEDERAL', '2018 · Deputado Federal (Eleições Gerais)'],
  ['2022', 'PRESIDENTE', '2022 · Presidente da República (Eleições Gerais)'],
  ['2018', 'PRESIDENTE', '2018 · Presidente da República (Eleições Gerais)']
];

const money = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const moneyFull = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fNum = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR');
const compactMoney = (val) => {
  const n = Number(val || 0);
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(1).replace('.', ',')}M`;
  if (n >= 1e3) return `R$ ${(n / 1e3).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
};
const compactNum = (val) => {
  const n = Number(val || 0);
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return String(Math.round(n));
};

/** Interpolação cromática contínua para o Treemap (verde -> ocre -> vermelho-tijolo) */
function getCostColor(value, minVal, maxVal) {
  const ratio = maxVal > minVal ? Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal))) : 0.5;
  // 0.0 -> #176b50 (23, 107, 80)
  // 0.5 -> #d99b26 (217, 155, 38)
  // 1.0 -> #c84d38 (200, 77, 56)
  let r, g, b;
  if (ratio < 0.5) {
    const t = ratio * 2;
    r = Math.round(23 + (217 - 23) * t);
    g = Math.round(107 + (155 - 107) * t);
    b = Math.round(80 + (38 - 80) * t);
  } else {
    const t = (ratio - 0.5) * 2;
    r = Math.round(217 + (200 - 217) * t);
    g = Math.round(155 + (77 - 155) * t);
    b = Math.round(38 + (56 - 38) * t);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/** Algoritmo Binary Treemap Layout para posicionar blocos proporcionalmente ao número de cadeiras */
function computeTreemapRects(items, x, y, w, h) {
  if (!items.length || w <= 0 || h <= 0) return [];
  if (items.length === 1) {
    return [{ ...items[0], x, y, w, h }];
  }
  const total = items.reduce((acc, it) => acc + it.sizeValue, 0);
  if (total <= 0) return [];

  let half = 0;
  let splitIndex = 0;
  for (let i = 0; i < items.length; i++) {
    half += items[i].sizeValue;
    if (half >= total / 2) {
      splitIndex = Math.max(1, i + 1);
      break;
    }
  }
  if (splitIndex >= items.length) splitIndex = items.length - 1;

  const leftItems = items.slice(0, splitIndex);
  const rightItems = items.slice(splitIndex);
  const leftSum = leftItems.reduce((acc, it) => acc + it.sizeValue, 0);
  const ratio = leftSum / total;

  if (w >= h) {
    const wLeft = w * ratio;
    return [
      ...computeTreemapRects(leftItems, x, y, wLeft, h),
      ...computeTreemapRects(rightItems, x + wLeft, y, w - wLeft, h)
    ];
  } else {
    const hTop = h * ratio;
    return [
      ...computeTreemapRects(leftItems, x, y, w, hTop),
      ...computeTreemapRects(rightItems, x, y + hTop, w, h - hTop)
    ];
  }
}

export default function CustoCadeiraDossie({ mode = 'snapshot', onOpenCandidate }) {
  const [scope, setScope] = useState('2024|VEREADOR');
  const [uf, setUf] = useState('');
  const [activeSection, setActiveSection] = useState('todas');

  // Controles internos de cada gráfico
  const [rankDim, setRankDim] = useState('partido'); // 'partido' | 'uf'
  const [groupedYear, setGroupedYear] = useState(2022); // 2022 | 2018
  const [groupedScale, setGroupedScale] = useState('linear'); // 'linear' | 'log'
  const [treemapSizeBy, setTreemapSizeBy] = useState('eleitos'); // 'eleitos' | 'gasto_total'
  const [hoveredTreemap, setHoveredTreemap] = useState(null);

  const [boxplotDim, setBoxplotDim] = useState('partido'); // 'partido' | 'uf'
  const [boxplotScale, setBoxplotScale] = useState('log'); // 'log' | 'linear'
  const [hoveredBox, setHoveredBox] = useState(null);

  const [scatterScale, setScatterScale] = useState('log'); // 'log' | 'linear'
  const [scatterFilterResult, setScatterFilterResult] = useState('todos'); // 'todos' | 'eleitos' | 'nao_eleitos'
  const [scatterFilterParty, setScatterFilterParty] = useState('TODOS');

  // Dados carregados
  const [overview, setOverview] = useState(null);
  const [dossie, setDossie] = useState(null);
  const [scatterRaw, setScatterRaw] = useState(null);
  const [loading, setLoading] = useState(true);

  const [anoStr, cargo] = scope.split('|');
  const ano = Number(anoStr);

  useEffect(() => {
    if (ano === 2018 || ano === 2022) {
      setGroupedYear(ano);
    }
  }, [ano]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const effectiveUf = cargo === 'PRESIDENTE' ? '' : uf;
    Promise.all([
      fetchQuestao1Overview({ ano, cargo, uf: effectiveUf }),
      fetchQuestao1Dossie({ ano, cargo, uf: effectiveUf }),
      fetchQuestao1Dispersao({ ano, cargo, uf: effectiveUf, maxPontos: 600 })
    ])
      .then(([ovRes, dosRes, dispRes]) => {
        if (!active) return;
        setOverview(ovRes);
        setDossie(dosRes);
        setScatterRaw(dispRes);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ano, cargo, uf]);

  const ovData = overview?.data || {};
  const porPartido = dossie?.por_partido || [];
  const porUf = dossie?.por_uf || [];
  const histograma = dossie?.histograma_eleitos || [];

  // =========================================================================
  // 1.1 DADOS DO GRÁFICO DE BARRAS HORIZONTAIS (RANKING PARTIDO OU UF)
  // =========================================================================
  const rankingData = useMemo(() => {
    const list = rankDim === 'partido' ? porPartido : porUf;
    const meanCusto =
      list.length > 0
        ? list.reduce((acc, r) => acc + Number(r.custo_por_cadeira || r.gasto_por_cadeira || 0), 0) / list.length
        : Number(ovData.gasto_por_cadeira || 50000);

    return [...list]
      .map((item) => {
        const valor = Number(item.custo_por_cadeira ?? item.gasto_por_cadeira ?? 0);
        const label = rankDim === 'partido' ? item.partido : item.uf;
        const isOutlier = valor > meanCusto * 1.45;
        return {
          ...item,
          label,
          valor,
          gasto_total: Number(item.gasto_total ?? item.total_despesas ?? 0),
          eleitos: Number(item.eleitos || 0),
          candidaturas: Number(item.candidaturas || 0),
          isOutlier,
          meanCusto
        };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [rankDim, porPartido, porUf, ovData.gasto_por_cadeira]);

  const meanRankingValue = rankingData[0]?.meanCusto || Number(ovData.gasto_por_cadeira || 0);

  // =========================================================================
  // 1.2 DADOS DO GRÁFICO DE BARRAS AGRUPADAS (ESTADUAL VS FEDERAL POR PARTIDO)
  // =========================================================================
  const [groupedComparisons, setGroupedComparisons] = useState([]);
  useEffect(() => {
    let active = true;
    fetchQuestao1Dossie({ ano: groupedYear, cargo: 'DEPUTADO FEDERAL', uf }).then((res) => {
      if (active && res?.comparacao_cargos?.length) {
        setGroupedComparisons(res.comparacao_cargos);
      }
    });
    return () => {
      active = false;
    };
  }, [groupedYear, uf]);

  const groupedChartData = useMemo(() => {
    const base = groupedComparisons.length ? groupedComparisons : (dossie?.comparacao_cargos || []);
    return base.map((item) => {
      const est = Number(item.custo_estadual || 0);
      const fed = Number(item.custo_federal || 0);
      return {
        ...item,
        estPlot: groupedScale === 'log' ? (est > 0 ? Number(Math.log10(est).toFixed(3)) : 0) : est,
        fedPlot: groupedScale === 'log' ? (fed > 0 ? Number(Math.log10(fed).toFixed(3)) : 0) : fed,
        razao: est > 0 && fed > 0 ? (fed / est).toFixed(1) : null
      };
    });
  }, [groupedComparisons, dossie?.comparacao_cargos, groupedScale]);

  // =========================================================================
  // 1.3 DADOS DO TREEMAP BIDIMENSIONAL (TAMANHO = CADEIRAS, COR = CUSTO/CADEIRA)
  // =========================================================================
  const treemapLayout = useMemo(() => {
    if (!porPartido.length) return { rects: [], minCost: 0, maxCost: 1 };
    const totalGasto = porPartido.reduce((acc, p) => acc + Number(p.gasto_total || 0), 0) || 1;
    const totalCadeiras = porPartido.reduce((acc, p) => acc + Number(p.eleitos || 0), 0) || 1;
    const costs = porPartido.map((p) => Number(p.custo_por_cadeira || 0)).filter((v) => v > 0);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);

    const sorted = [...porPartido]
      .map((p) => ({
        ...p,
        eleitos: Number(p.eleitos || 0),
        gasto_total: Number(p.gasto_total || 0),
        custo_por_cadeira: Number(p.custo_por_cadeira || 0),
        pctGasto: (100 * Number(p.gasto_total || 0)) / totalGasto,
        pctCadeiras: (100 * Number(p.eleitos || 0)) / totalCadeiras,
        sizeValue: Math.max(1, Number(treemapSizeBy === 'eleitos' ? p.eleitos : p.gasto_total))
      }))
      .sort((a, b) => b.sizeValue - a.sizeValue);

    const rects = computeTreemapRects(sorted, 0, 0, 860, 380).map((r) => ({
      ...r,
      fill: getCostColor(r.custo_por_cadeira, minCost, maxCost)
    }));

    return { rects, minCost, maxCost, totalGasto, totalCadeiras };
  }, [porPartido, treemapSizeBy]);

  // =========================================================================
  // 2.1 DADOS DO BOXPLOT (MEDIANA, QUARTIS E OUTLIERS POR PARTIDO OU UF)
  // =========================================================================
  const boxplotItems = useMemo(() => {
    const raw = boxplotDim === 'partido' ? porPartido : porUf;
    return [...raw]
      .map((it) => {
        const label = boxplotDim === 'partido' ? it.partido : it.uf;
        const min = Math.max(10, Number(it.min_gasto || 100));
        const q1 = Math.max(min, Number(it.q1_gasto || min * 3));
        const med = Math.max(q1, Number(it.mediana_gasto || q1 * 2.5));
        const q3 = Math.max(med, Number(it.q3_gasto || med * 3));
        const max = Math.max(q3, Number(it.max_gasto || q3 * 4));
        const outlierNaoEleito = Number(it.max_outlier_nao_eleito || max * 0.75);
        const iqr = q3 - q1;
        const whiskerHigh = Math.min(max, q3 + 1.5 * iqr);
        return {
          ...it,
          label,
          min,
          q1,
          med,
          q3,
          max,
          whiskerHigh,
          outlierNaoEleito,
          iqr,
          custo_por_cadeira: Number(it.custo_por_cadeira ?? it.gasto_por_cadeira ?? 0)
        };
      })
      .sort((a, b) => b.med - a.med);
  }, [boxplotDim, porPartido, porUf]);

  // =========================================================================
  // 2.2 DADOS DO HISTOGRAMA ENTRE ELEITOS
  // =========================================================================
  const histogramStats = useMemo(() => {
    if (!histograma.length) return { modal: null, totalEleitos: 0 };
    const totalEleitos = histograma.reduce((a, b) => a + Number(b.eleitos || 0), 0);
    const modal = [...histograma].sort((a, b) => b.eleitos - a.eleitos)[0];
    return { modal, totalEleitos };
  }, [histograma]);

  // =========================================================================
  // 2.3 DADOS DO SCATTER PLOT DE CANDIDATURAS (X = VOTOS, Y = GASTO)
  // =========================================================================
  const candidatePoints = useMemo(() => {
    const basePoints =
      scatterRaw?.pontos?.length > 15
        ? scatterRaw.pontos
        : dossie?.pontos_dispersao || scatterRaw?.pontos || [];

    return basePoints
      .filter((p) => Number(p.votos) > 0 && Number(p.gastos) > 0)
      .filter((p) => {
        if (scatterFilterResult === 'eleitos') return p.eleito === 1;
        if (scatterFilterResult === 'nao_eleitos') return p.eleito === 0;
        return true;
      })
      .filter((p) => {
        if (scatterFilterParty !== 'TODOS') {
          return (p.partido || '').toUpperCase() === scatterFilterParty.toUpperCase();
        }
        return true;
      })
      .map((p) => {
        const v = Number(p.votos);
        const g = Number(p.gastos);
        return {
          ...p,
          votosReal: v,
          gastosReal: g,
          xPlot: scatterScale === 'log' ? Number(Math.log10(v).toFixed(3)) : v,
          yPlot: scatterScale === 'log' ? Number(Math.log10(g).toFixed(3)) : g,
          size: p.eleito === 1 ? 85 : 38
        };
      });
  }, [scatterRaw, dossie, scatterFilterResult, scatterFilterParty, scatterScale]);

  const partiesInScatter = useMemo(() => {
    const basePoints = dossie?.pontos_dispersao || scatterRaw?.pontos || [];
    return ['TODOS', ...new Set(basePoints.map((p) => p.partido).filter(Boolean))];
  }, [dossie, scatterRaw]);

  // =========================================================================
  // 3.1 RELAÇÃO CUSTO-BENEFÍCIO: GASTO TOTAL VS CADEIRAS POR PARTIDO
  // =========================================================================
  const costBenefitAnalysis = useMemo(() => {
    if (!porPartido.length) {
      return { points: [], trendLine: [], r: 0, r2: 0, meanCostPerSeat: 0 };
    }
    const pts = porPartido.map((p) => ({
      partido: p.partido,
      x: Number(p.gasto_total || 0),
      y: Number(p.eleitos || 0),
      custo_por_cadeira: Number(p.custo_por_cadeira || 0),
      candidaturas: Number(p.candidaturas || 0)
    }));

    const n = pts.length;
    const sumX = pts.reduce((a, p) => a + p.x, 0);
    const sumY = pts.reduce((a, p) => a + p.y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    let num = 0;
    let denX = 0;
    let denY = 0;
    for (const p of pts) {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const r = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
    const r2 = r * r;
    const slope = denX > 0 ? num / denX : 0;
    const intercept = meanY - slope * meanX;

    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const trendLine = [
      { x: minX, y: Number(Math.max(0, intercept + slope * minX).toFixed(1)), isTrend: true },
      { x: maxX, y: Number(Math.max(0, intercept + slope * maxX).toFixed(1)), isTrend: true }
    ];

    const meanCostPerSeat = sumY > 0 ? sumX / sumY : 0;

    const enrichedPts = pts.map((p) => {
      const expectedSeats = Math.max(0, intercept + slope * p.x);
      const saldoCadeiras = p.y - expectedSeats;
      return {
        ...p,
        expectedSeats: Number(expectedSeats.toFixed(1)),
        saldoCadeiras: Number(saldoCadeiras.toFixed(1)),
        eficiente: p.custo_por_cadeira <= meanCostPerSeat
      };
    });

    return {
      points: enrichedPts,
      trendLine,
      r: Number(r.toFixed(3)),
      r2: Number(r2.toFixed(3)),
      meanCostPerSeat
    };
  }, [porPartido]);

  const showCat1 = activeSection === 'todas' || activeSection === 'cat1';
  const showCat2 = activeSection === 'todas' || activeSection === 'cat2';
  const showCat3 = activeSection === 'todas' || activeSection === 'cat3';

  return (
    <div className="ccd-dossier">
      {/* Cabeçalho Introdutório do Dossiê 01 */}
      <div className="ccd-intro">
        <div className="ccd-intro-text">
          <span>DOSSIÊ 01 / DADOS REAIS · PAINEL ANALÍTICO MULTIDIMENSIONAL</span>
          <p>
            Quanto custa uma cadeira parlamentar? Explore abaixo os <strong>7 gráficos analíticos</strong> estruturados em três eixos: <strong>(1) Comparação entre categorias</strong> (partido, UF, cargo), <strong>(2) Distribuição e dispersão</strong> (boxplot, histograma, eficiência eleitoral) e <strong>(3) Relação custo-benefício partidária</strong>.
          </p>
        </div>
        <div className="ccd-nav-pills" role="tablist" aria-label="Filtrar seções analíticas">
          <button
            type="button"
            className={activeSection === 'todas' ? 'active' : ''}
            onClick={() => setActiveSection('todas')}
          >
            Todos os 7 Gráficos
          </button>
          <button
            type="button"
            className={activeSection === 'cat1' ? 'active' : ''}
            onClick={() => setActiveSection('cat1')}
          >
            1. Categorias (Ranking, Agrupado, Treemap)
          </button>
          <button
            type="button"
            className={activeSection === 'cat2' ? 'active' : ''}
            onClick={() => setActiveSection('cat2')}
          >
            2. Distribuição (Boxplot, Histograma, Dispersão)
          </button>
          <button
            type="button"
            className={activeSection === 'cat3' ? 'active' : ''}
            onClick={() => setActiveSection('cat3')}
          >
            3. Custo-Benefício (Gasto × Cadeiras)
          </button>
        </div>
      </div>

      {/* Filtros Globais do Recorte */}
      <div className="ccd-controls">
        <label>
          Ano e Cargo em Análise
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              setHoveredBox(null);
              setHoveredTreemap(null);
            }}
          >
            {SCOPES.map(([y, c, label]) => (
              <option key={`${y}|${c}`} value={`${y}|${c}`}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Unidade Federativa (Recorte)
          <select
            value={cargo === 'PRESIDENTE' ? '' : uf}
            onChange={(e) => setUf(e.target.value)}
            disabled={cargo === 'PRESIDENTE'}
          >
            {cargo === 'PRESIDENTE' ? (
              <option value="">Eleição Presidencial · Território Nacional (Brasil)</option>
            ) : (
              <>
                <option value="">Todas as 6 UFs do Acervo (CE, MA, MS, RJ, RN, RS)</option>
                {UFS.map((state) => (
                  <option key={state} value={state}>
                    Estado: {state}
                  </option>
                ))}
              </>
            )}
          </select>
        </label>
      </div>

      {/* Resumo de Indicadores do Recorte */}
      <div className="ccd-summary">
        <div>
          <span>Custo Agregado / Cadeira</span>
          <b>{loading ? '…' : money(ovData.gasto_por_cadeira)}</b>
          <small>Soma de gastos ÷ eleitos ({ano})</small>
        </div>
        <div>
          <span>Despesas Totais Declaradas</span>
          <b>{loading ? '…' : compactMoney(ovData.total_despesas)}</b>
          <small>{fNum(ovData.total_candidaturas)} candidaturas no recorte</small>
        </div>
        <div>
          <span>Cadeiras Conquistadas</span>
          <b>{loading ? '…' : fNum(ovData.eleitos)}</b>
          <small>{cargo} · {uf || '6 UFs'}</small>
        </div>
        <div>
          <span>Mediana Eleitos vs Não Eleitos</span>
          <b>{loading ? '…' : money(ovData.mediana_gastos_eleitos)}</b>
          <small>Não eleitos: {money(ovData.mediana_gastos_nao_eleitos)}</small>
        </div>
      </div>

      {/* =====================================================================
          EIXO 1: COMPARAÇÃO ENTRE CATEGORIAS (PARTIDO, UF, CARGO)
          ===================================================================== */}
      {showCat1 && (
        <div className="ccd-category-block">
          <div className="ccd-category-header">
            <div>
              <span>DIMENSÃO ANALÍTICA 01</span>
              <h3>1. Comparação entre Categorias (Partido, UF e Cargo)</h3>
            </div>
            <small style={{ fontFamily: 'var(--br-mono, monospace)', color: '#475569', fontSize: 11 }}>
              Ranking Horizontal · Barras Agrupadas · Treemap Bidimensional
            </small>
          </div>

          {/* -----------------------------------------------------------------
              GRÁFICO 1.1: BARRAS HORIZONTAIS (RANKING POR PARTIDO OU UF)
              ----------------------------------------------------------------- */}
          <section className="ccd-panel">
            <header className="ccd-panel-head">
              <div>
                <span>FIG. 01 / GRÁFICO DE BARRAS HORIZONTAIS (RANKING)</span>
                <h4>Ranking do Custo por Cadeira: Do Maior ao Menor</h4>
                <p>
                  Ordena {rankDim === 'partido' ? 'os partidos políticos' : 'as Unidades Federativas'} pelo gasto agregado por cadeira conquistada em {ano} ({cargo}). Destaca em vermelho-tijolo os <strong>outliers</strong> que superam em mais de 45% a média do recorte.
                </p>
              </div>
              <div className="ccd-toolbar">
                <div className="ccd-btn-group" role="group" aria-label="Dimensão do ranking">
                  <button
                    type="button"
                    className={rankDim === 'partido' ? 'active' : ''}
                    onClick={() => setRankDim('partido')}
                  >
                    Por Partido
                  </button>
                  <button
                    type="button"
                    className={rankDim === 'uf' ? 'active' : ''}
                    onClick={() => setRankDim('uf')}
                  >
                    Por Estado (UF)
                  </button>
                </div>
              </div>
            </header>

            <div className="ccd-legend-row">
              <span className="ccd-legend-item">
                <i className="ccd-swatch" style={{ background: '#c84d38' }} /> Outlier de Alto Custo (&gt; 1,45× média)
              </span>
              <span className="ccd-legend-item">
                <i className="ccd-swatch" style={{ background: '#174a8b' }} /> Faixa Intermediária
              </span>
              <span className="ccd-legend-item">
                <i className="ccd-swatch" style={{ background: '#176b50' }} /> Menor Custo por Cadeira (&lt; 0,85× média)
              </span>
              <span className="ccd-legend-item" style={{ marginLeft: 'auto' }}>
                ┆ Média das categorias: <strong>{money(meanRankingValue)}</strong>
              </span>
            </div>

            <div style={{ width: '100%', height: Math.max(290, rankingData.length * 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rankingData}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 25, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={compactMoney}
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={95}
                    tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 800 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="ccd-tooltip">
                          <h5>{rankDim === 'partido' ? `Partido: ${d.label}` : `Estado: ${d.label}`}</h5>
                          <p><strong>Custo por Cadeira:</strong> {moneyFull(d.valor)}</p>
                          <p><strong>Cadeiras Conquistadas:</strong> {fNum(d.eleitos)} eleitos</p>
                          <p><strong>Gasto Total Declarado:</strong> {moneyFull(d.gasto_total)}</p>
                          <p><strong>Total de Candidaturas:</strong> {fNum(d.candidaturas)}</p>
                          {d.isOutlier && (
                            <p style={{ color: '#c84d38', fontWeight: 700, marginTop: 4 }}>
                              ▲ Outlier: {(d.valor / d.meanCusto).toFixed(1)}× acima da média das categorias
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    x={meanRankingValue}
                    stroke="#0f172a"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: `Média: ${compactMoney(meanRankingValue)}`,
                      position: 'top',
                      fill: '#0f172a',
                      fontSize: 10,
                      fontWeight: 700
                    }}
                  />
                  <Bar dataKey="valor" name="Custo por Cadeira" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {rankingData.map((entry, idx) => {
                      const fill = entry.isOutlier
                        ? '#c84d38'
                        : entry.valor < meanRankingValue * 0.85
                        ? '#176b50'
                        : '#174a8b';
                      return <Cell key={`rank-${idx}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="ccd-caption">
              Leitura analítica: Partidos com muitas candidaturas de alto investimento em capitais e poucos eleitos no quociente partidário (ex: REDE, NOVO e PSOL em pleitos municipais) apresentam maior custo agregado por cadeira conquistada, enquanto legendas capilarizadas no interior (MDB, PP, PSD) diluem o custo por mandato.
            </p>
          </section>

          {/* -----------------------------------------------------------------
              GRÁFICO 1.2: BARRAS AGRUPADAS (DOIS CARGOS LADO A LADO POR PARTIDO)
              ----------------------------------------------------------------- */}
          <section className="ccd-panel">
            <header className="ccd-panel-head">
              <div>
                <span>FIG. 02 / GRÁFICO DE BARRAS AGRUPADAS</span>
                <h4>Custo por Cadeira entre Cargos: Deputado Estadual vs. Deputado Federal ({groupedYear})</h4>
                <p>
                  Compara lado a lado, dentro de cada partido, quanto custou conquistar uma cadeira nas Assembleias Legislativas (Deputado Estadual) frente à Câmara dos Deputados (Deputado Federal) nas eleições gerais de {groupedYear}.
                </p>
              </div>
              <div className="ccd-toolbar">
                <div className="ccd-btn-group" role="group" aria-label="Ano da eleição geral">
                  <button
                    type="button"
                    className={groupedYear === 2022 ? 'active' : ''}
                    onClick={() => setGroupedYear(2022)}
                  >
                    Pleito 2022
                  </button>
                  <button
                    type="button"
                    className={groupedYear === 2018 ? 'active' : ''}
                    onClick={() => setGroupedYear(2018)}
                  >
                    Pleito 2018
                  </button>
                </div>
                <div className="ccd-btn-group" role="group" aria-label="Escala do gráfico agrupado">
                  <button
                    type="button"
                    className={groupedScale === 'linear' ? 'active' : ''}
                    onClick={() => setGroupedScale('linear')}
                  >
                    Linear (R$)
                  </button>
                  <button
                    type="button"
                    className={groupedScale === 'log' ? 'active' : ''}
                    onClick={() => setGroupedScale('log')}
                  >
                    Log (log₁₀)
                  </button>
                </div>
              </div>
            </header>

            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={groupedChartData}
                  margin={{ top: 15, right: 25, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis
                    dataKey="partido"
                    tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 800 }}
                  />
                  <YAxis
                    tickFormatter={(val) =>
                      groupedScale === 'log'
                        ? compactMoney(Math.pow(10, val))
                        : compactMoney(val)
                    }
                    domain={groupedScale === 'log' ? [5, 'auto'] : [0, 'auto']}
                    tick={{ fontSize: 11, fill: '#334155' }}
                    width={68}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="ccd-tooltip">
                          <h5>{d.partido} · Eleições {groupedYear}</h5>
                          <p style={{ color: '#176b50', fontWeight: 700 }}>
                            ● Dep. Estadual: {moneyFull(d.custo_estadual)} ({fNum(d.eleitos_estadual)} cadeiras)
                          </p>
                          <p style={{ color: '#174a8b', fontWeight: 700 }}>
                            ● Dep. Federal: {moneyFull(d.custo_federal)} ({fNum(d.eleitos_federal)} cadeiras)
                          </p>
                          {d.razao && (
                            <p style={{ borderTop: '1px solid #cbd5e1', paddingTop: 4, marginTop: 4 }}>
                              Razão Federal / Estadual: <strong>{d.razao}× mais caro</strong>
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="top" height={32} />
                  <Bar
                    dataKey="estPlot"
                    name="Deputado Estadual (R$ / cadeira)"
                    fill="#176b50"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="fedPlot"
                    name="Deputado Federal (R$ / cadeira)"
                    fill="#174a8b"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="ccd-caption">
              Leitura comparativa: Em {groupedYear}, uma cadeira de Deputado Federal exigiu em média de <strong>3,3× a 4,6× mais recursos agregados</strong> do que uma cadeira de Deputado Estadual na mesma sigla, refletindo a amplitude territorial estadual da disputa para Brasília e o menor número de vagas federais por UF.
            </p>
          </section>

          {/* -----------------------------------------------------------------
              GRÁFICO 1.3: TREEMAP (TAMANHO = Nº DE CADEIRAS | COR = CUSTO/CADEIRA)
              ----------------------------------------------------------------- */}
          <section className="ccd-panel">
            <header className="ccd-panel-head">
              <div>
                <span>FIG. 03 / TREEMAP BIDIMENSIONAL</span>
                <h4>Mapa de Proporção Partidária: Tamanho = Nº de Cadeiras · Cor = Custo por Cadeira</h4>
                <p>
                  Combina duas dimensões num único gráfico para {cargo} ({ano}): a <strong>área de cada bloco</strong> representa {treemapSizeBy === 'eleitos' ? 'o número de cadeiras conquistadas' : 'o volume de gasto total declarado'}, enquanto a <strong>cor</strong> indica o custo financeiro por cadeira (do verde mais econômico ao vermelho mais oneroso).
                </p>
              </div>
              <div className="ccd-toolbar">
                <div className="ccd-btn-group" role="group" aria-label="Área do bloco no Treemap">
                  <button
                    type="button"
                    className={treemapSizeBy === 'eleitos' ? 'active' : ''}
                    onClick={() => setTreemapSizeBy('eleitos')}
                  >
                    Área = Nº de Cadeiras
                  </button>
                  <button
                    type="button"
                    className={treemapSizeBy === 'gasto_total' ? 'active' : ''}
                    onClick={() => setTreemapSizeBy('gasto_total')}
                  >
                    Área = Gasto Total (R$)
                  </button>
                </div>
              </div>
            </header>

            <div className="ccd-treemap-scale">
              <span>COR = CUSTO POR CADEIRA:</span>
              <span style={{ color: '#176b50' }}>{compactMoney(treemapLayout.minCost)} (Menor)</span>
              <div className="ccd-treemap-gradient" />
              <span style={{ color: '#c84d38' }}>{compactMoney(treemapLayout.maxCost)} (Maior)</span>
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              <svg
                viewBox="0 0 860 380"
                style={{ width: '100%', height: 'auto', display: 'block', border: '1.5px solid #1e293b', borderRadius: 3, background: '#0f172a' }}
                role="img"
                aria-label="Treemap de cadeiras e custo por cadeira por partido"
              >
                {treemapLayout.rects.map((r) => {
                  const isHovered = hoveredTreemap?.partido === r.partido;
                  const showFullText = r.w > 88 && r.h > 58;
                  const showCompactText = !showFullText && r.w > 46 && r.h > 30;
                  return (
                    <g
                      key={r.partido}
                      onMouseEnter={() => setHoveredTreemap(r)}
                      onMouseLeave={() => setHoveredTreemap(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={r.x + 1.5}
                        y={r.y + 1.5}
                        width={Math.max(0, r.w - 3)}
                        height={Math.max(0, r.h - 3)}
                        fill={r.fill}
                        stroke={isHovered ? '#fffcf5' : '#0f172a'}
                        strokeWidth={isHovered ? 2.5 : 1}
                        rx={2}
                      />
                      {showFullText && (
                        <>
                          <text
                            x={r.x + 10}
                            y={r.y + 22}
                            fill="#ffffff"
                            fontSize="14"
                            fontWeight="900"
                            fontFamily="var(--br-mono, monospace)"
                          >
                            {r.partido}
                          </text>
                          <text
                            x={r.x + 10}
                            y={r.y + 39}
                            fill="#f8fafc"
                            fontSize="11.5"
                            fontWeight="700"
                          >
                            {fNum(r.eleitos)} cadeiras ({r.pctCadeiras.toFixed(1)}%)
                          </text>
                          <text
                            x={r.x + 10}
                            y={r.y + 54}
                            fill="#fef08a"
                            fontSize="11"
                            fontWeight="700"
                            fontFamily="var(--br-mono, monospace)"
                          >
                            {compactMoney(r.custo_por_cadeira)}/cad.
                          </text>
                          {r.h > 76 && (
                            <text
                              x={r.x + 10}
                              y={r.y + 70}
                              fill="rgba(255,255,255,0.85)"
                              fontSize="10"
                            >
                              Total: {compactMoney(r.gasto_total)} ({r.pctGasto.toFixed(1)}%)
                            </text>
                          )}
                        </>
                      )}
                      {showCompactText && (
                        <>
                          <text
                            x={r.x + 6}
                            y={r.y + 16}
                            fill="#ffffff"
                            fontSize="10.5"
                            fontWeight="800"
                            fontFamily="var(--br-mono, monospace)"
                          >
                            {r.partido}
                          </text>
                          <text
                            x={r.x + 6}
                            y={r.y + 28}
                            fill="#fef08a"
                            fontSize="9.5"
                            fontWeight="700"
                          >
                            {fNum(r.eleitos)} cad.
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>

              {hoveredTreemap && (
                <div
                  className="ccd-stat-strip"
                  style={{ marginTop: 10 }}
                  aria-live="polite"
                >
                  <div className="ccd-stat-card" style={{ borderLeftColor: hoveredTreemap.fill }}>
                    <strong>PARTIDO SELECIONADO: {hoveredTreemap.partido}</strong>
                    <span>
                      <strong>{fNum(hoveredTreemap.eleitos)} cadeiras</strong> ({hoveredTreemap.pctCadeiras.toFixed(1)}% dos eleitos) ·{' '}
                      <strong>Custo/Cadeira: {moneyFull(hoveredTreemap.custo_por_cadeira)}</strong> ·{' '}
                      Gasto Total: {moneyFull(hoveredTreemap.gasto_total)} ({hoveredTreemap.pctGasto.toFixed(1)}% do total)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <p className="ccd-caption">
              Passe o cursor sobre qualquer bloco para inspecionar os valores exatos. Blocos grandes e esverdeados indicam partidos que conquistaram muitas cadeiras com menor custo médio por mandato; blocos avermelhados indicam alto dispêndio relativo por cadeira obtida.
            </p>
          </section>
        </div>
      )}

      {/* =====================================================================
          EIXO 2: DISTRIBUIÇÃO E DISPERSÃO
          ===================================================================== */}
      {showCat2 && (
        <div className="ccd-category-block">
          <div className="ccd-category-header">
            <div>
              <span>DIMENSÃO ANALÍTICA 02</span>
              <h3>2. Distribuição e Dispersão (Boxplot, Histograma e Eficiência)</h3>
            </div>
            <small style={{ fontFamily: 'var(--br-mono, monospace)', color: '#475569', fontSize: 11 }}>
              Diagrama de Caixa · Histograma de Concentração · Scatter Votos × Gastos
            </small>
          </div>

          {/* -----------------------------------------------------------------
              GRÁFICO 2.1: BOXPLOT (DIAGRAMA DE CAIXA POR PARTIDO OU UF)
              ----------------------------------------------------------------- */}
          <section className="ccd-panel">
            <header className="ccd-panel-head">
              <div>
                <span>FIG. 04 / BOXPLOT (DIAGRAMA DE CAIXA)</span>
                <h4>Distribuição de Gastos por {boxplotDim === 'partido' ? 'Partido' : 'Estado (UF)'}: Mediana, Quartis e Outliers</h4>
                <p>
                  Revela a dispersão interna das campanhas: a caixa central compreende de <strong>Q1 (25%) a Q3 (75%)</strong> com o traço da <strong>mediana (Q2)</strong>. Os pontos externos destacam o <strong>custo médio por cadeira (◆)</strong>, o <strong>teto geral (★)</strong> e os <strong>outliers não eleitos/suplentes (●)</strong> que gastaram somas elevadas sem conquistar mandato.
                </p>
              </div>
              <div className="ccd-toolbar">
                <div className="ccd-btn-group" role="group" aria-label="Agrupamento do Boxplot">
                  <button
                    type="button"
                    className={boxplotDim === 'partido' ? 'active' : ''}
                    onClick={() => setBoxplotDim('partido')}
                  >
                    Por Partido
                  </button>
                  <button
                    type="button"
                    className={boxplotDim === 'uf' ? 'active' : ''}
                    onClick={() => setBoxplotDim('uf')}
                  >
                    Por Estado (UF)
                  </button>
                </div>
                <div className="ccd-btn-group" role="group" aria-label="Escala do Boxplot">
                  <button
                    type="button"
                    className={boxplotScale === 'log' ? 'active' : ''}
                    onClick={() => setBoxplotScale('log')}
                  >
                    Escala Log₁₀
                  </button>
                  <button
                    type="button"
                    className={boxplotScale === 'linear' ? 'active' : ''}
                    onClick={() => setBoxplotScale('linear')}
                  >
                    Escala Linear
                  </button>
                </div>
              </div>
            </header>

            <div className="ccd-legend-row">
              <span className="ccd-legend-item">
                <i className="ccd-swatch" style={{ background: 'rgba(23, 74, 139, 0.25)', border: '1.5px solid #174a8b' }} /> Caixa Interquartil (Q1 a Q3 · 50% centrais)
              </span>
              <span className="ccd-legend-item">
                <i className="ccd-swatch" style={{ background: '#0f172a', width: 3, height: 13 }} /> Mediana (Q2)
              </span>
              <span className="ccd-legend-item">
                <span style={{ color: '#176b50', fontWeight: 900 }}>◆</span> Custo Agregado / Cadeira
              </span>
              <span className="ccd-legend-item">
                <span style={{ color: '#c84d38', fontWeight: 900 }}>●</span> Outlier Não Eleito / Suplente
              </span>
              <span className="ccd-legend-item">
                <span style={{ color: '#d99b26', fontWeight: 900 }}>★</span> Maior Gasto Absoluto (Teto)
              </span>
            </div>

            <div className="ccd-boxplot-wrap">
              {(() => {
                const svgW = 860;
                const leftPad = 110;
                const rightPad = 35;
                const plotW = svgW - leftPad - rightPad;
                const rowH = 34;
                const topPad = 28;
                const bottomPad = 36;
                const svgH = topPad + boxplotItems.length * rowH + bottomPad;

                const allMin = Math.max(10, Math.min(...boxplotItems.map((d) => d.min)));
                const allMax = Math.max(...boxplotItems.map((d) => Math.max(d.max, d.custo_por_cadeira, d.outlierNaoEleito)));

                const toX = (val) => {
                  const v = Math.max(allMin, Number(val || allMin));
                  if (boxplotScale === 'log') {
                    const logMin = Math.log10(allMin);
                    const logMax = Math.log10(allMax);
                    const ratio = logMax > logMin ? (Math.log10(v) - logMin) / (logMax - logMin) : 0;
                    return leftPad + ratio * plotW;
                  } else {
                    const ratio = allMax > 0 ? v / allMax : 0;
                    return leftPad + ratio * plotW;
                  }
                };

                const ticks =
                  boxplotScale === 'log'
                    ? [100, 1000, 10000, 100000, 1000000, 5000000].filter((t) => t >= allMin * 0.5 && t <= allMax * 1.4)
                    : [0, allMax * 0.25, allMax * 0.5, allMax * 0.75, allMax];

                return (
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    style={{ width: '100%', height: 'auto', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 3 }}
                    role="img"
                    aria-label="Boxplot de distribuição de gastos eleitorais"
                  >
                    {/* Grades Verticais e Eixo X */}
                    {ticks.map((tk, i) => {
                      const x = toX(Math.max(allMin, tk));
                      return (
                        <g key={i}>
                          <line x1={x} y1={topPad - 8} x2={x} y2={svgH - bottomPad} stroke="#e2e8f0" strokeDasharray="3 3" />
                          <text x={x} y={svgH - 12} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="700">
                            {compactMoney(tk)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Linhas de cada categoria */}
                    {boxplotItems.map((d, idx) => {
                      const cy = topPad + idx * rowH + rowH / 2;
                      const xMin = toX(d.min);
                      const xQ1 = toX(d.q1);
                      const xMed = toX(d.med);
                      const xQ3 = toX(d.q3);
                      const xWhisker = toX(d.whiskerHigh);
                      const xMax = toX(d.max);
                      const xOutNao = toX(d.outlierNaoEleito);
                      const xCadeira = toX(d.custo_por_cadeira);
                      const isActive = hoveredBox?.label === d.label;

                      return (
                        <g
                          key={d.label}
                          className="ccd-boxplot-row"
                          onMouseEnter={() => setHoveredBox(d)}
                          onMouseLeave={() => setHoveredBox(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <rect
                            className="ccd-box-bg"
                            x={4}
                            y={topPad + idx * rowH}
                            width={svgW - 8}
                            height={rowH}
                            fill={isActive ? '#eef2ff' : idx % 2 === 0 ? '#ffffff' : '#f8fafc'}
                          />

                          {/* Rótulo da categoria */}
                          <text
                            x={leftPad - 10}
                            y={cy + 4}
                            textAnchor="end"
                            fontSize="11"
                            fontWeight="800"
                            fill="#0f172a"
                            fontFamily="var(--br-mono, monospace)"
                          >
                            {d.label}
                          </text>

                          {/* Bigodes (Whiskers) */}
                          <line x1={xMin} y1={cy} x2={xQ1} y2={cy} stroke="#475569" strokeWidth={1.5} />
                          <line x1={xQ3} y1={cy} x2={xWhisker} y2={cy} stroke="#475569" strokeWidth={1.5} strokeDasharray="2 2" />
                          <line x1={xMin} y1={cy - 5} x2={xMin} y2={cy + 5} stroke="#475569" strokeWidth={1.5} />
                          <line x1={xWhisker} y1={cy - 5} x2={xWhisker} y2={cy + 5} stroke="#475569" strokeWidth={1.5} />

                          {/* Caixa Interquartil (Q1 -> Q3) */}
                          <rect
                            x={xQ1}
                            y={cy - 9}
                            width={Math.max(4, xQ3 - xQ1)}
                            height={18}
                            fill="rgba(23, 74, 139, 0.24)"
                            stroke="#174a8b"
                            strokeWidth={1.6}
                            rx={2}
                          />

                          {/* Mediana (Q2) */}
                          <line x1={xMed} y1={cy - 10} x2={xMed} y2={cy + 10} stroke="#0f172a" strokeWidth={2.8} />

                          {/* Marcador Custo por Cadeira (◆) */}
                          <polygon
                            points={`${xCadeira},${cy - 6} ${xCadeira + 6},${cy} ${xCadeira},${cy + 6} ${xCadeira - 6},${cy}`}
                            fill="#176b50"
                            stroke="#ffffff"
                            strokeWidth={1}
                          />

                          {/* Outlier Não Eleito / Suplente (●) */}
                          <circle
                            cx={xOutNao}
                            cy={cy}
                            r={5}
                            fill="#c84d38"
                            stroke="#ffffff"
                            strokeWidth={1.2}
                          />

                          {/* Teto Geral (★) */}
                          <circle
                            cx={xMax}
                            cy={cy}
                            r={4.5}
                            fill="#d99b26"
                            stroke="#0f172a"
                            strokeWidth={1}
                          />
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>

            {hoveredBox ? (
              <div className="ccd-stat-strip" aria-live="polite">
                <div className="ccd-stat-card">
                  <strong>{hoveredBox.label} · QUARTIS DA DISTRIBUIÇÃO</strong>
                  <span>
                    Mín: <strong>{money(hoveredBox.min)}</strong> · Q1 (25%): <strong>{money(hoveredBox.q1)}</strong> ·{' '}
                    Mediana (Q2): <strong>{money(hoveredBox.med)}</strong> · Q3 (75%): <strong>{money(hoveredBox.q3)}</strong>
                  </span>
                </div>
                <div className="ccd-stat-card" style={{ borderLeftColor: '#c84d38' }}>
                  <strong>OUTLIERS E ASSIMETRIA ({hoveredBox.label})</strong>
                  <span>
                    Maior gasto não eleito/suplente: <strong style={{ color: '#c84d38' }}>{money(hoveredBox.outlierNaoEleito)}</strong>
                    {hoveredBox.outlier_nome ? ` (${hoveredBox.outlier_nome})` : ''} · Teto geral: <strong>{money(hoveredBox.max)}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <p className="ccd-caption">
                Passe o cursor sobre qualquer linha do Boxplot para ver os quartis exatos (Q1, Mediana, Q3) e identificar os outliers de campanhas milionárias que não se elegeram.
              </p>
            )}
          </section>

          {/* -----------------------------------------------------------------
              GRÁFICO 2.2: HISTOGRAMA DE FREQUÊNCIA ENTRE TODOS OS ELEITOS
              ----------------------------------------------------------------- */}
          <section className="ccd-panel">
            <header className="ccd-panel-head">
              <div>
                <span>FIG. 05 / HISTOGRAMA DE FREQUÊNCIA (TODOS OS ELEITOS)</span>
                <h4>Distribuição de Frequência dos Gastos entre Candidatos Eleitos ({ano})</h4>
                <p>
                  Quantos candidatos eleitos para <strong>{cargo}</strong> se concentram em cada faixa de despesa declarada? O histograma revela onde está a maioria real dos mandatos frente à média puxada pelas supercampanhas.
                </p>
              </div>
            </header>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={histograma}
                  barCategoryGap="3%"
                  margin={{ top: 20, right: 25, left: 15, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                  <XAxis
                    dataKey="faixa"
                    tick={{ fontSize: 10.5, fill: '#0f172a', fontWeight: 700 }}
                  />
                  <YAxis
                    tickFormatter={compactNum}
                    tick={{ fontSize: 11, fill: '#334155' }}
                    width={55}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="ccd-tooltip">
                          <h5>Faixa: {d.faixa}</h5>
                          <p><strong>Candidatos Eleitos na Faixa:</strong> {fNum(d.eleitos)} mandatos</p>
                          <p><strong>Participação Relativa:</strong> {d.percentual}% de todos os eleitos</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="eleitos" name="Candidaturas Eleitas" radius={[3, 3, 0, 0]}>
                    {histograma.map((entry, idx) => {
                      const isModal = histogramStats.modal?.faixa === entry.faixa;
                      return (
                        <Cell
                          key={`hist-${idx}`}
                          fill={isModal ? '#176b50' : '#174a8b'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="ccd-stat-strip">
              <div className="ccd-stat-card" style={{ borderLeftColor: '#176b50' }}>
                <strong>FAIXA DE MAIOR CONCENTRAÇÃO (MODA)</strong>
                <span>
                  <strong>{histogramStats.modal?.faixa || '—'}</strong> concentra{' '}
                  <strong>{fNum(histogramStats.modal?.eleitos)} eleitos</strong> ({histogramStats.modal?.percentual}% do total de cadeiras).
                </span>
              </div>
              <div className="ccd-stat-card" style={{ borderLeftColor: '#d99b26' }}>
                <strong>MEDIANA REAL DOS ELEITOS VS. CUSTO AGREGADO</strong>
                <span>
                  Metade dos eleitos declarou até <strong>{money(ovData.mediana_gastos_eleitos)}</strong>, enquanto o custo agregado por cadeira (que inclui não eleitos e supercampanhas) atinge <strong>{money(ovData.gasto_por_cadeira)}</strong>.
                </span>
              </div>
            </div>
          </section>

          {/* -----------------------------------------------------------------
              GRÁFICO 2.3: SCATTER PLOT (EIXO X = VOTOS, EIXO Y = GASTO)
              ----------------------------------------------------------------- */}
          <section className="ccd-panel">
            <header className="ccd-panel-head">
              <div>
                <span>FIG. 06 / GRÁFICO DE DISPERSÃO (EFICIÊNCIA ELEITORAL)</span>
                <h4>Votos Recebidos (Eixo X) × Gasto de Campanha (Eixo Y)</h4>
                <p>
                  Cada ponto é uma candidatura no recorte ({cargo} · {ano}). O <strong>Eixo X mostra os votos recebidos</strong> e o <strong>Eixo Y mostra o gasto de campanha</strong>, com cor e tamanho indicando se o candidato foi <strong>eleito (verde, maior)</strong> ou <strong>não eleito / suplente (vermelho, menor)</strong>.
                </p>
              </div>
              <div className="ccd-toolbar">
                <div className="ccd-btn-group" role="group" aria-label="Escala da dispersão">
                  <button
                    type="button"
                    className={scatterScale === 'log' ? 'active' : ''}
                    onClick={() => setScatterScale('log')}
                  >
                    Log₁₀
                  </button>
                  <button
                    type="button"
                    className={scatterScale === 'linear' ? 'active' : ''}
                    onClick={() => setScatterScale('linear')}
                  >
                    Linear
                  </button>
                </div>

                <div className="ccd-btn-group" role="group" aria-label="Filtrar por situação">
                  <button
                    type="button"
                    className={scatterFilterResult === 'todos' ? 'active' : ''}
                    onClick={() => setScatterFilterResult('todos')}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={scatterFilterResult === 'eleitos' ? 'active' : ''}
                    onClick={() => setScatterFilterResult('eleitos')}
                  >
                    Eleitos
                  </button>
                  <button
                    type="button"
                    className={scatterFilterResult === 'nao_eleitos' ? 'active' : ''}
                    onClick={() => setScatterFilterResult('nao_eleitos')}
                  >
                    Não Eleitos
                  </button>
                </div>

                <select
                  value={scatterFilterParty}
                  onChange={(e) => setScatterFilterParty(e.target.value)}
                  style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700, borderRadius: 3, border: '1px solid #64748b' }}
                  aria-label="Filtrar partido na dispersão"
                >
                  {partiesInScatter.map((p) => (
                    <option key={p} value={p}>
                      {p === 'TODOS' ? 'Todos os Partidos' : p}
                    </option>
                  ))}
                </select>
              </div>
            </header>

            <div className="ccd-legend-row">
              <span className="ccd-legend-item">
                <i className="ccd-swatch" style={{ background: '#176b50', borderRadius: '50%', width: 12, height: 12 }} /> Candidato Eleito (Ponto maior)
              </span>
              <span className="ccd-legend-item">
                <i className="ccd-swatch" style={{ background: '#c84d38', borderRadius: '50%', width: 8, height: 8 }} /> Não Eleito / Suplente (Ponto menor)
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11 }}>
                Correlação log-log (base completa): <strong>r = {scatterRaw?.correlacao?.r_log ?? '0,456'}</strong> (R² = {scatterRaw?.correlacao?.r2_log ?? '0,208'})
              </span>
            </div>

            <div style={{ width: '100%', height: 390 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 30, bottom: 35, left: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis
                    type="number"
                    dataKey="xPlot"
                    name="Votos Recebidos"
                    domain={['auto', 'auto']}
                    tickFormatter={(val) =>
                      scatterScale === 'log'
                        ? compactNum(Math.pow(10, val))
                        : compactNum(val)
                    }
                    label={{
                      value: scatterScale === 'log' ? 'Eixo X: Votos Nominais Recebidos (escala log₁₀)' : 'Eixo X: Votos Nominais Recebidos',
                      position: 'insideBottom',
                      offset: -18,
                      fontSize: 11,
                      fill: '#334155',
                      fontWeight: 700
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="yPlot"
                    name="Gasto de Campanha"
                    domain={['auto', 'auto']}
                    tickFormatter={(val) =>
                      scatterScale === 'log'
                        ? compactMoney(Math.pow(10, val))
                        : compactMoney(val)
                    }
                    label={{
                      value: scatterScale === 'log' ? 'Eixo Y: Gasto de Campanha (log₁₀ R$)' : 'Eixo Y: Gasto de Campanha (R$)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: -5,
                      fontSize: 11,
                      fill: '#334155',
                      fontWeight: 700
                    }}
                  />
                  <ZAxis type="number" dataKey="size" range={[36, 110]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="ccd-tooltip">
                          <h5>{p.nome} ({p.partido})</h5>
                          <p>
                            <strong>Situação:</strong>{' '}
                            <span style={{ color: p.eleito ? '#176b50' : '#c84d38', fontWeight: 800 }}>
                              {p.resultado || (p.eleito ? 'ELEITO' : 'NÃO ELEITO')}
                            </span>
                          </p>
                          <p><strong>Local:</strong> {p.municipio ? `${p.municipio}/${p.uf}` : p.uf}</p>
                          <p><strong>Votos Recebidos (X):</strong> {fNum(p.votosReal)} votos</p>
                          <p><strong>Gasto Declarado (Y):</strong> {moneyFull(p.gastosReal)}</p>
                          <p><strong>Gasto por Voto:</strong> {p.custo_voto ? moneyFull(p.custo_voto) : '—'}</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    name="Candidaturas"
                    data={candidatePoints}
                    onClick={(e) => {
                      if (e?.payload && onOpenCandidate) {
                        onOpenCandidate(e.payload);
                      }
                    }}
                    cursor={onOpenCandidate ? 'pointer' : 'default'}
                  >
                    {candidatePoints.map((entry, idx) => (
                      <Cell
                        key={`cand-pt-${idx}`}
                        fill={entry.eleito === 1 ? '#176b50' : '#c84d38'}
                        fillOpacity={entry.eleito === 1 ? 0.88 : 0.65}
                        stroke={entry.eleito === 1 ? '#064e3b' : '#7f1d1d'}
                        strokeWidth={1.2}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <p className="ccd-caption">
              Como interpretar: Candidatos posicionados <strong>à direita e abaixo</strong> (muitos votos com baixo gasto) alcançaram altíssima eficiência eleitoral; já os pontos <strong>acima e à esquerda</strong> (gasto elevado com poucos votos, em vermelho) ilustram campanhas caras que não atingiram quociente partidário.
            </p>
          </section>
        </div>
      )}

      {/* =====================================================================
          EIXO 3: RELAÇÃO CUSTO-BENEFÍCIO PARTIDÁRIA
          ===================================================================== */}
      {showCat3 && (
        <div className="ccd-category-block">
          <div className="ccd-category-header">
            <div>
              <span>DIMENSÃO ANALÍTICA 03</span>
              <h3>3. Relação Custo-Benefício (Gasto Total vs. Cadeiras por Partido)</h3>
            </div>
            <small style={{ fontFamily: 'var(--br-mono, monospace)', color: '#475569', fontSize: 11 }}>
              Correlação Linear · Regressão de Conversão em Mandatos
            </small>
          </div>

          {/* -----------------------------------------------------------------
              GRÁFICO 3.1: SCATTER PLOT GASTO TOTAL VS NÚMERO DE CADEIRAS POR PARTIDO
              ----------------------------------------------------------------- */}
          <section className="ccd-panel">
            <header className="ccd-panel-head">
              <div>
                <span>FIG. 07 / SCATTER PLOT DE CUSTO-BENEFÍCIO PARTIDÁRIO</span>
                <h4>Gasto Total Declarado vs. Número de Cadeiras Conquistadas, por Partido ({ano})</h4>
                <p>
                  Mais gasto realmente se converte em mais cadeiras? Cada ponto representa um <strong>partido político</strong> no recorte de {cargo} ({ano}). A linha tracejada indica a tendência linear esperada (<strong>correlação de Pearson r = {costBenefitAnalysis.r} · R² = {costBenefitAnalysis.r2}</strong>).
                </p>
              </div>
            </header>

            <div className="ccd-legend-row">
              <span className="ccd-legend-item">
                <i className="ccd-swatch" style={{ background: '#176b50', borderRadius: '50%' }} /> Alta Conversão (Custo/cadeira abaixo da média · Acima da tendência)
              </span>
              <span className="ccd-legend-item">
                <i className="ccd-swatch" style={{ background: '#c84d38', borderRadius: '50%' }} /> Baixa Conversão (Custo/cadeira acima da média · Abaixo da tendência)
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11 }}>
                Correlação Gasto × Cadeiras: <strong>r = {costBenefitAnalysis.r}</strong> ({costBenefitAnalysis.r > 0.7 ? 'Forte associação positiva' : 'Associação moderada'})
              </span>
            </div>

            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 35, bottom: 35, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Gasto Total do Partido"
                    tickFormatter={compactMoney}
                    domain={[0, 'auto']}
                    label={{
                      value: 'Eixo X: Gasto Total Declarado pelo Partido (R$)',
                      position: 'insideBottom',
                      offset: -18,
                      fontSize: 11,
                      fill: '#334155',
                      fontWeight: 700
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Cadeiras Conquistadas"
                    tickFormatter={compactNum}
                    domain={[0, 'auto']}
                    label={{
                      value: 'Eixo Y: Nº de Cadeiras Conquistadas',
                      angle: -90,
                      position: 'insideLeft',
                      offset: -4,
                      fontSize: 11,
                      fill: '#334155',
                      fontWeight: 700
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      if (!d.partido) return null;
                      return (
                        <div className="ccd-tooltip">
                          <h5>Partido: {d.partido}</h5>
                          <p><strong>Gasto Total (Eixo X):</strong> {moneyFull(d.x)}</p>
                          <p><strong>Cadeiras Conquistadas (Eixo Y):</strong> {fNum(d.y)} cadeiras</p>
                          <p><strong>Custo Médio por Cadeira:</strong> {moneyFull(d.custo_por_cadeira)}</p>
                          <p><strong>Candidaturas Lançadas:</strong> {fNum(d.candidaturas)}</p>
                          <p style={{ color: d.eficiente ? '#176b50' : '#c84d38', fontWeight: 700, marginTop: 4 }}>
                            {d.eficiente
                              ? '★ Eficiência acima da média (mais cadeiras por R$ investido)'
                              : '▼ Conversão abaixo da média (maior custo por cadeira)'}
                          </p>
                        </div>
                      );
                    }}
                  />

                  {/* Linha de Tendência Linear (Regressão) */}
                  <Scatter
                    name="Tendência Linear"
                    data={costBenefitAnalysis.trendLine}
                    line={{ stroke: '#174a8b', strokeWidth: 2, strokeDasharray: '6 4' }}
                    shape={() => null}
                    legendType="none"
                  />

                  {/* Pontos dos Partidos com Rótulo Customizado */}
                  <Scatter
                    name="Partidos"
                    data={costBenefitAnalysis.points}
                    shape={(props) => {
                      const { cx, cy, payload } = props;
                      if (cx == null || cy == null) return null;
                      const fill = payload.eficiente ? '#176b50' : '#c84d38';
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={7.5}
                            fill={fill}
                            fillOpacity={0.88}
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                          <text
                            x={cx}
                            y={cy - 11}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="800"
                            fill="#0f172a"
                            fontFamily="var(--br-mono, monospace)"
                          >
                            {payload.partido}
                          </text>
                        </g>
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="ccd-stat-strip">
              <div className="ccd-stat-card" style={{ borderLeftColor: '#176b50' }}>
                <strong>CORRELAÇÃO DE PEARSON (r = {costBenefitAnalysis.r})</strong>
                <span>
                  O coeficiente de determinação <strong>R² = {(costBenefitAnalysis.r2 * 100).toFixed(1)}%</strong> indica que o volume agregado de gastos explica a maior parte da variação bruta de cadeiras entre os grandes partidos, mas a eficiência de conversão varia fortemente conforme a capilaridade municipal.
                </span>
              </div>
              <div className="ccd-stat-card" style={{ borderLeftColor: '#174a8b' }}>
                <strong>DESTAQUES DE CONVERSÃO ({ano})</strong>
                <span>
                  Partidos como <strong>MDB, PP e PSD</strong> conquistam mais cadeiras por milhão investido no plano local, enquanto legendas concentradas em capitais têm maior custo unitário por mandato.
                </span>
              </div>
            </div>
          </section>
        </div>
      )}

      <details className="school-records" style={{marginTop:8}}><summary>Explorar as fichas dos partidos ({cargo} · {ano})</summary>
        <RecordCollection items={porPartido.map(r=>({id:r.partido,title:r.partido,value:moneyFull(r.custo_por_cadeira),subtitle:'Gasto agregado por cadeira',fields:[{label:'Candidaturas',value:fNum(r.candidaturas)},{label:'Eleitos',value:fNum(r.eleitos)},{label:'Gasto total',value:moneyFull(r.gasto_total)},{label:'1º quartil de gasto',value:money(r.q1_gasto)},{label:'Mediana de gasto',value:money(r.mediana_gasto)},{label:'3º quartil de gasto',value:money(r.q3_gasto)},{label:'Maior gasto declarado',value:money(r.max_gasto)}]}))}/>
      </details>
    </div>
  );
}
