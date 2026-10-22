import React, { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import {
  Scale, Filter, AlertTriangle, Eye, Compass, Info, CheckCircle2,
  DollarSign, Users, Award
} from 'lucide-react';

const money = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fNum = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR');

const PARTIDOS_COMUNS = [
  'TODOS', 'PT', 'PL', 'PSD', 'MDB', 'UNIÃO', 'PP', 'REPUBLICANOS',
  'PSOL', 'PDT', 'PSB', 'PSDB', 'PODE', 'PC DO B', 'REDE', 'NOVO'
];

export default function SpendingVotesScatter({
  data,
  selectedCandidate,
  onSelectCandidate,
  onOpenCandidateModal,
  loading = false
}) {
  const [scaleType, setScaleType] = useState('log'); // 'log' ou 'linear'
  const [highlightParty, setHighlightParty] = useState('TODOS');
  const [activeQuadrant, setActiveQuadrant] = useState('todos');

  const pontos = data?.pontos || [];
  const medianas = data?.medianas || { gastos: 2500, votos: 200 };
  const correlacao = data?.correlacao || {};

  // Formatação dos pontos para o ScatterChart
  const chartPoints = useMemo(() => {
    return pontos.map((p) => {
      const g = Number(p.gastos) || 0;
      const v = Number(p.votos) || 0;
      const xVal = scaleType === 'log' ? (g > 0 ? Math.log10(g) : 0) : g;
      const yVal = scaleType === 'log' ? (v > 0 ? Math.log10(v) : 0) : v;

      // Classificação do Quadrante
      const altoGasto = g > (medianas.gastos || 0);
      const altoVoto = v > (medianas.votos || 0);
      let quadrante = 'baixo_baixo';
      if (altoGasto && altoVoto) quadrante = 'alto_alto';
      else if (!altoGasto && altoVoto) quadrante = 'baixo_alto';
      else if (altoGasto && !altoVoto) quadrante = 'alto_baixo';

      return {
        ...p,
        x: xVal,
        y: yVal,
        gastoReal: g,
        votoReal: v,
        quadrante
      };
    });
  }, [pontos, scaleType, medianas]);

  // Filtro de partido e quadrante
  const filteredPoints = useMemo(() => {
    return chartPoints.filter((p) => {
      if (highlightParty !== 'TODOS' && p.partido?.toUpperCase() !== highlightParty.toUpperCase()) {
        return false;
      }
      if (activeQuadrant !== 'todos' && p.quadrante !== activeQuadrant) {
        return false;
      }
      return true;
    });
  }, [chartPoints, highlightParty, activeQuadrant]);

  // Tooltip customizado editorial
  const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="q1-custom-tooltip">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: p.eleito ? '#176b50' : '#c84d38', textTransform: 'uppercase' }}>
              {p.resultado || (p.eleito ? 'ELEITO' : 'NÃO ELEITO')}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#718096', fontWeight: 700 }}>
              Nº {p.numero || '—'}
            </span>
          </div>
          <h4>{p.nome}</h4>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#174a8b' }}>
            {p.partido} · {p.municipio ? `${p.municipio}/${p.uf}` : p.uf}
          </p>
          <div style={{ margin: '0.5rem 0', borderTop: '1px solid #e2e8f0', paddingTop: '0.4rem', fontSize: '0.78rem' }}>
            <p><strong>Despesas:</strong> {money(p.gastoReal)}</p>
            <p><strong>Votos:</strong> {fNum(p.votoReal)} nominais</p>
            <p style={{ color: '#c84d38', fontWeight: 700, marginTop: '0.2rem' }}>
              <strong>Despesa/Voto:</strong> {p.custo_voto ? money(p.custo_voto) : '—'}
            </p>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#718096', fontStyle: 'italic' }}>
            Clique para ver a ficha completa
          </div>
        </div>
      );
    }
    return null;
  };

  const xMedianaLog = medianas.gastos > 0 ? Math.log10(medianas.gastos) : 0;
  const yMedianaLog = medianas.votos > 0 ? Math.log10(medianas.votos) : 0;

  return (
    <section className="q1-scatter-container">
      {/* Cabeçalho Editorial */}
      <div className="q1-section-header">
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#174a8b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            EXPERIÊNCIA 03 · DISPERSÃO ESTATÍSTICA
          </span>
          <h2>DINHEIRO COMPRA VISIBILIDADE. MAS GARANTE VITÓRIA?</h2>
          <p>
            Cada ponto representa uma candidatura. Analise a correlação entre despesas declaradas e votação nominal, identificando quem gastou milhões sem se eleger e quem conquistou mandato com orçamento reduzido.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4a5568' }}>
            Exibindo {fNum(filteredPoints.length)} de {fNum(data?.total_validos || chartPoints.length)} pontos válidos
          </span>
        </div>
      </div>

      {/* Barra de Ferramentas: Escala, Filtro de Partido e Legenda */}
      <div className="q1-scatter-toolbar">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          {/* Alternador de Escala */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase' }}>
              ESCALA:
            </span>
            <div className="q1-segmented">
              <button
                className={scaleType === 'log' ? 'active' : ''}
                onClick={() => setScaleType('log')}
                title="Escala logarítmica (recomendada para distribuições com grande assimetria)"
              >
                Logarítmica (log₁₀)
              </button>
              <button
                className={scaleType === 'linear' ? 'active' : ''}
                onClick={() => setScaleType('linear')}
                title="Escala linear direta em R$ e votos nominais"
              >
                Linear (R$)
              </button>
            </div>
          </div>

          {/* Destaque de Partido */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase' }}>
              PARTIDO:
            </span>
            <select
              className="q1-select"
              value={highlightParty}
              onChange={(e) => setHighlightParty(e.target.value)}
              aria-label="Destacar partido no gráfico de dispersão"
            >
              {PARTIDOS_COMUNS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Legenda de Cores */}
        <div className="q1-scatter-legend">
          <div className="q1-scatter-legend-item">
            <span className="q1-scatter-dot q1-dot-eleito" />
            <span>Eleito (QP / Média)</span>
          </div>
          <div className="q1-scatter-legend-item">
            <span className="q1-scatter-dot q1-dot-nao" />
            <span>Não Eleito / Suplente</span>
          </div>
          {selectedCandidate && (
            <div className="q1-scatter-legend-item">
              <span className="q1-scatter-dot q1-dot-highlight" />
              <span>Candidatura Selecionada</span>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de Dispersão */}
      <div style={{ width: '100%', height: 420, position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#718096', fontSize: '0.85rem' }}>
            Carregando pontos da dispersão…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 25, bottom: 35, left: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

              <XAxis
                type="number"
                dataKey="x"
                name="Despesas"
                domain={['auto', 'auto']}
                tickFormatter={(val) => {
                  if (scaleType === 'log') {
                    const real = Math.pow(10, val);
                    return real >= 1e6 ? `${(real / 1e6).toFixed(0)}M` : real >= 1e3 ? `${(real / 1e3).toFixed(0)}k` : real.toFixed(0);
                  }
                  return val >= 1e6 ? `R$ ${(val / 1e6).toFixed(1)}M` : val >= 1e3 ? `R$ ${(val / 1e3).toFixed(0)}k` : `R$ ${val}`;
                }}
                label={{
                  value: scaleType === 'log' ? 'Despesas Declaradas da Campanha (escala log₁₀ em R$)' : 'Despesas Declaradas da Campanha (R$)',
                  position: 'insideBottom',
                  offset: -18,
                  fontSize: 11,
                  fill: '#4a5568',
                  fontWeight: 600
                }}
              />

              <YAxis
                type="number"
                dataKey="y"
                name="Votos"
                domain={['auto', 'auto']}
                tickFormatter={(val) => {
                  if (scaleType === 'log') {
                    const real = Math.pow(10, val);
                    return real >= 1e3 ? `${(real / 1e3).toFixed(0)}k` : real.toFixed(0);
                  }
                  return val >= 1e3 ? `${(val / 1e3).toFixed(0)}k` : String(val);
                }}
                label={{
                  value: scaleType === 'log' ? 'Votos Nominais (log₁₀)' : 'Votos Nominais Recebidos',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fontSize: 11,
                  fill: '#4a5568',
                  fontWeight: 600
                }}
              />

              <Tooltip content={<CustomScatterTooltip />} />

              {/* Linhas de referência das medianas para divisão dos quadrantes */}
              {scaleType === 'log' ? (
                <>
                  <ReferenceLine x={xMedianaLog} stroke="#cbd5e0" strokeDasharray="4 4" label={{ value: 'Mediana Gastos', position: 'top', fontSize: 9, fill: '#718096' }} />
                  <ReferenceLine y={yMedianaLog} stroke="#cbd5e0" strokeDasharray="4 4" label={{ value: 'Mediana Votos', position: 'right', fontSize: 9, fill: '#718096' }} />
                </>
              ) : (
                <>
                  <ReferenceLine x={medianas.gastos} stroke="#cbd5e0" strokeDasharray="4 4" />
                  <ReferenceLine y={medianas.votos} stroke="#cbd5e0" strokeDasharray="4 4" />
                </>
              )}

              <Scatter
                name="Candidaturas"
                data={filteredPoints}
                onClick={(e) => {
                  if (e && e.payload) onSelectCandidate?.(e.payload);
                }}
                cursor="pointer"
              >
                {filteredPoints.map((entry, index) => {
                  const isCandSelected = selectedCandidate && selectedCandidate.id === entry.id;
                  const isEleito = entry.eleito === 1;

                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isCandSelected ? '#edbf42' : isEleito ? '#176b50' : '#c84d38'}
                      stroke={isCandSelected ? '#174a8b' : isEleito ? '#0f4634' : '#9b2c1c'}
                      strokeWidth={isCandSelected ? 3 : 1}
                      r={isCandSelected ? 8 : isEleito ? 5 : 4}
                      fillOpacity={isCandSelected ? 1 : isEleito ? 0.85 : 0.6}
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 4 Quadrantes Analíticos Baseados nas Medianas */}
      <div className="q1-quadrants-summary">
        <div
          className={`q1-quadrant-card ${activeQuadrant === 'baixo_alto' ? 'active' : ''}`}
          onClick={() => setActiveQuadrant(activeQuadrant === 'baixo_alto' ? 'todos' : 'baixo_alto')}
          style={{ cursor: 'pointer', borderLeft: '3px solid #176b50' }}
          title="Clique para filtrar apenas candidaturas deste quadrante"
        >
          <strong>★ Supereficientes (Gasto baixo, Voto alto)</strong>
          <p>
            Despesas ≤ mediana ({money(medianas.gastos)}) e votação superior à mediana ({fNum(medianas.votos)} votos). Campanhas altamente eficientes em votos por real investido.
          </p>
        </div>

        <div
          className={`q1-quadrant-card ${activeQuadrant === 'alto_alto' ? 'active' : ''}`}
          onClick={() => setActiveQuadrant(activeQuadrant === 'alto_alto' ? 'todos' : 'alto_alto')}
          style={{ cursor: 'pointer', borderLeft: '3px solid #174a8b' }}
          title="Clique para filtrar apenas candidaturas deste quadrante"
        >
          <strong>▲ Peso Pesado (Gasto alto, Voto alto)</strong>
          <p>
            Grandes orçamentos (&gt; {money(medianas.gastos)}) acompanhados de alta densidade eleitoral. Padrão comum entre lideranças partidárias e puxadores de votos.
          </p>
        </div>

        <div
          className={`q1-quadrant-card ${activeQuadrant === 'alto_baixo' ? 'active' : ''}`}
          onClick={() => setActiveQuadrant(activeQuadrant === 'alto_baixo' ? 'todos' : 'alto_baixo')}
          style={{ cursor: 'pointer', borderLeft: '3px solid #c84d38' }}
          title="Clique para filtrar apenas candidaturas deste quadrante"
        >
          <strong>▼ Investimento Frustrado (Gasto alto, Voto baixo)</strong>
          <p>
            Orçamento superior à mediana ({money(medianas.gastos)}) com retorno eleitoral inferior à mediana ({fNum(medianas.votos)} votos). Alto custo por voto declarado.
          </p>
        </div>

        <div
          className={`q1-quadrant-card ${activeQuadrant === 'baixo_baixo' ? 'active' : ''}`}
          onClick={() => setActiveQuadrant(activeQuadrant === 'baixo_baixo' ? 'todos' : 'baixo_baixo')}
          style={{ cursor: 'pointer', borderLeft: '3px solid #718096' }}
          title="Clique para filtrar apenas candidaturas deste quadrante"
        >
          <strong>● Campanha Modesta (Gasto baixo, Voto baixo)</strong>
          <p>
            Despesas e votação abaixo da mediana. Universo que concentra a grande maioria das candidaturas proporcionais que não atingem visibilidade em massa.
          </p>
        </div>
      </div>

      {/* Caixa Estatística de Correlação e Alerta Causal */}
      <div className="q1-correlation-box">
        <div>
          <strong>Documentação Estatística:</strong> Amostra analisada de <strong>{fNum(correlacao.n || 0)} candidaturas</strong> com despesas e votação estritamente superiores a zero. Coeficiente de correlação linear de Pearson em escala logarítmica: <strong>r = {correlacao.r_log ?? '—'}</strong> (coeficiente de determinação <strong>R² = {correlacao.r2_log ?? '—'}</strong>; em escala linear r = {correlacao.r_linear ?? '—'}).
          {data?.excluidos_zero_ou_nulo > 0 && (
            <span> Foram excluídas {fNum(data.excluidos_zero_ou_nulo)} candidaturas sem despesas informadas ou com zero votos nominais para evitar distorções no gráfico e no logaritmo.</span>
          )}
        </div>

        <div className="q1-causality-warning">
          <AlertTriangle size={15} />
          <span>
            AVISO METODOLÓGICO: Associação estatística não demonstra causalidade nem "compra de votos". O volume financeiro amplia alcance e visibilidade, mas fatores políticos, partidários, alianças e engajamento comunitário condicionam o resultado.
          </span>
        </div>
      </div>
    </section>
  );
}
