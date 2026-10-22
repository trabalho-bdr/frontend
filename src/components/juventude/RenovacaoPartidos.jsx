import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, GitCompare, X, Award, Users } from 'lucide-react';

const fNum = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
const pct = (n) => (n == null ? '—' : `${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`);

export default function RenovacaoPartidos({
  partidosData = [],
  ano,
  cargo,
  uf
}) {
  const [ordem, setOrdem] = useState('pct_jovens');
  const [busca, setBusca] = useState('');
  const [partidoSelecionado, setPartidoSelecionado] = useState(null);
  const [partidoComparar, setPartidoComparar] = useState(null);
  const [modalComparador, setModalComparador] = useState(false);
  const [limiteExibicao, setLimiteExibicao] = useState(10);
  const [visaoModo, setVisaoModo] = useState('candidaturas'); // 'candidaturas' | 'eleitos'

  const partidos = useMemo(() => {
    let list = [...(partidosData || [])];

    if (busca) {
      const q = busca.toLowerCase();
      list = list.filter(
        (p) =>
          p.sigla.toLowerCase().includes(q) ||
          (p.partido_nome && p.partido_nome.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (ordem === 'pct_jovens') return (b.pct_jovens || 0) - (a.pct_jovens || 0);
      if (ordem === 'jovens_eleitos') return (b.jovens_eleitos || 0) - (a.jovens_eleitos || 0);
      if (ordem === 'taxa_eleicao_jovens') return (b.taxa_eleicao_jovens || 0) - (a.taxa_eleicao_jovens || 0);
      if (ordem === 'total_candidaturas') return b.total_candidaturas - a.total_candidaturas;
      if (ordem === 'sigla') return a.sigla.localeCompare(b.sigla);
      return 0;
    });

    return list;
  }, [partidosData, busca, ordem]);

  const selecionado = partidoSelecionado || partidos[0] || null;
  const partidosExibidos = partidos.slice(0, limiteExibicao);

  // Descobertas automáticas sobre os partidos
  const partidoMaisProporcional = useMemo(() => {
    return [...(partidosData || [])].sort((a, b) => (b.pct_jovens || 0) - (a.pct_jovens || 0))[0];
  }, [partidosData]);

  const partidoMaisEleitos = useMemo(() => {
    return [...(partidosData || [])].sort((a, b) => (b.jovens_eleitos || 0) - (a.jovens_eleitos || 0))[0];
  }, [partidosData]);

  return (
    <section className="j-section-panel" aria-labelledby="renovacao-partidos-title">
      <header>
        <span className="j-step-badge">EXPERIÊNCIA 02 · RENOVAÇÃO PARTIDÁRIA</span>
        <h2 id="renovacao-partidos-title">OS PARTIDOS ESTÃO RENOVANDO SUAS CANDIDATURAS?</h2>
        <p>
          Compare a distribuição geracional entre as legendas partidárias.
          Cada barra empilhada a 100% revela a proporção de cada faixa etária.
          Selecione uma legenda para analisar seus indicadores e compará-la com outra.
        </p>
      </header>

      {/* Destaque analítico dos partidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {partidoMaisProporcional && (
          <div style={{ background: 'var(--j-verde-light)', borderLeft: '4px solid var(--j-verde)', padding: '12px 16px' }}>
            <span style={{ font: '700 10px var(--j-mono)', color: 'var(--j-verde-dark)', textTransform: 'uppercase' }}>
              Maior Proporção de Jovens
            </span>
            <div style={{ font: '900 18px var(--j-mono)', color: 'var(--j-verde-dark)', margin: '4px 0' }}>
              {partidoMaisProporcional.sigla}: {pct(partidoMaisProporcional.pct_jovens)}
            </div>
            <p style={{ font: '500 11px var(--j-body)', margin: 0, color: 'var(--j-texto)' }}>
              {fNum(partidoMaisProporcional.jovens)} jovens em {fNum(partidoMaisProporcional.validas)} candidaturas válidas.
            </p>
          </div>
        )}

        {partidoMaisEleitos && (
          <div style={{ background: 'var(--j-azul-light)', borderLeft: '4px solid var(--j-azul)', padding: '12px 16px' }}>
            <span style={{ font: '700 10px var(--j-mono)', color: 'var(--j-azul-dark)', textTransform: 'uppercase' }}>
              Mais Jovens Eleitos (Absoluto)
            </span>
            <div style={{ font: '900 18px var(--j-mono)', color: 'var(--j-azul-dark)', margin: '4px 0' }}>
              {partidoMaisEleitos.sigla}: {fNum(partidoMaisEleitos.jovens_eleitos)} eleitos
            </div>
            <p style={{ font: '500 11px var(--j-body)', margin: 0, color: 'var(--j-texto)' }}>
              Taxa de sucesso da juventude no partido: {pct(partidoMaisEleitos.taxa_eleicao_jovens)} ({fNum(partidoMaisEleitos.jovens_eleitos)} de {fNum(partidoMaisEleitos.jovens_definidos)} definidos).
            </p>
          </div>
        )}
      </div>

      {/* Barra de ferramentas */}
      <div className="j-parties-toolbar">
        <div className="j-parties-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Filtrar partido por sigla ou nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar partido"
          />
        </div>

        <div className="j-parties-sort">
          <ArrowUpDown size={14} />
          <label htmlFor="ordem-partidos">Ordenar por:</label>
          <select
            id="ordem-partidos"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          >
            <option value="pct_jovens">Maior % de Jovens (18–29)</option>
            <option value="jovens_eleitos">Mais Jovens Eleitos</option>
            <option value="taxa_eleicao_jovens">Maior Taxa de Eleição Jovem</option>
            <option value="total_candidaturas">Total de Candidaturas</option>
            <option value="sigla">Sigla (Alfabética)</option>
          </select>
        </div>
      </div>

      {/* Legenda do gráfico empilhado a 100% */}
      <div className="j-stacked-legend">
        <span><i className="j-legend-dot j-dot-youth" /> 18 a 29 anos (Jovens)</span>
        <span><i className="j-legend-dot j-dot-adults" /> 30 a 44 anos</span>
        <span><i className="j-legend-dot j-dot-mature" /> 45 a 59 anos</span>
        <span><i className="j-legend-dot j-dot-elders" /> 60 anos ou mais</span>
      </div>

      {/* Lista de barras empilhadas */}
      <div className="j-party-rows" role="list" aria-label="Composição etária empilhada por partido">
        {partidosExibidos.map((p) => {
          const isSelected = selecionado?.sigla === p.sigla;
          return (
            <div
              key={p.sigla}
              role="listitem"
              className={`j-party-row ${isSelected ? 'selected' : ''}`}
              onClick={() => setPartidoSelecionado(p)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPartidoSelecionado(p);
                }
              }}
              title={`Clique para inspecionar ${p.sigla}`}
            >
              <div className="j-party-badge">{p.sigla}</div>

              <div className="j-stacked-track" role="progressbar" aria-valuenow={p.pct_jovens} aria-valuemin="0" aria-valuemax="100" aria-label={`Composição etária de ${p.sigla}`}>
                <div
                  className="j-seg j-seg-youth"
                  style={{ width: `${p.pct_jovens || 0}%` }}
                  title={`18-29 anos: ${pct(p.pct_jovens)} (${fNum(p.jovens)})`}
                />
                <div
                  className="j-seg j-seg-adults"
                  style={{ width: `${p.pct_adultos || 0}%` }}
                  title={`30-44 anos: ${pct(p.pct_adultos)} (${fNum(p.adultos_30_44)})`}
                />
                <div
                  className="j-seg j-seg-mature"
                  style={{ width: `${p.pct_maduros || 0}%` }}
                  title={`45-59 anos: ${pct(p.pct_maduros)} (${fNum(p.maduros_45_59)})`}
                />
                <div
                  className="j-seg j-seg-elders"
                  style={{ width: `${p.pct_idosos || 0}%` }}
                  title={`60+ anos: ${pct(p.pct_idosos)} (${fNum(p.idosos_60_mais)})`}
                />
              </div>

              <div className="j-party-metrics">
                <b>{pct(p.pct_jovens)} jovens</b>
                <small>{fNum(p.jovens_eleitos)} eleitos / {fNum(p.total_candidaturas)} cand.</small>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão para expandir mais partidos */}
      {partidos.length > limiteExibicao && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            className="j-btn-reset"
            style={{ margin: '0 auto', borderStyle: 'solid' }}
            onClick={() => setLimiteExibicao((n) => Math.min(partidos.length, n + 15))}
          >
            Mostrar mais partidos ({limiteExibicao} de {partidos.length})
          </button>
        </div>
      )}

      {/* Ficha do partido selecionado */}
      {selecionado && (
        <div
          style={{
            marginTop: '26px',
            background: '#f8faf6',
            border: '1px solid #c9d8c6',
            borderLeft: '5px solid var(--j-azul)',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <div>
              <span style={{ font: '700 10px var(--j-mono)', color: 'var(--j-azul)', textTransform: 'uppercase' }}>
                FICHA DA LEGENDA
              </span>
              <h3 style={{ font: '900 24px var(--j-display)', color: 'var(--j-azul-dark)', margin: '2px 0 0 0' }}>
                {selecionado.sigla} · <small style={{ font: '500 14px var(--j-body)', color: 'var(--j-texto-suave)' }}>{selecionado.partido_nome}</small>
              </h3>
            </div>

            <button
              type="button"
              className="j-metric-toggle"
              style={{ margin: 0 }}
              onClick={() => {
                setPartidoComparar(partidos.find((p) => p.sigla !== selecionado.sigla) || null);
                setModalComparador(true);
              }}
            >
              <button type="button" aria-pressed="true">
                <GitCompare size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Comparar com outro partido
              </button>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div className="j-stat-card">
              <span>TOTAL CANDIDATURAS</span>
              <strong>{fNum(selecionado.total_candidaturas)}</strong>
              <small style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                {fNum(selecionado.validas)} com idade válida
              </small>
            </div>

            <div className="j-stat-card">
              <span>CANDIDATURAS JOVENS</span>
              <strong style={{ color: 'var(--j-verde-dark)' }}>{fNum(selecionado.jovens)}</strong>
              <small style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                {pct(selecionado.pct_jovens)} da legenda
              </small>
            </div>

            <div className="j-stat-card">
              <span>JOVENS ELEITOS</span>
              <strong>{fNum(selecionado.jovens_eleitos)}</strong>
              <small style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                de {fNum(selecionado.eleitos_total)} eleitos no total
              </small>
            </div>

            <div className="j-stat-card">
              <span>TAXA ELEIÇÃO JOVEM</span>
              <strong style={{ color: 'var(--j-azul)' }}>{pct(selecionado.taxa_eleicao_jovens)}</strong>
              <small style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                {fNum(selecionado.jovens_eleitos)} / {fNum(selecionado.jovens_definidos)} definidos
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comparação lado a lado */}
      {modalComparador && (
        <div
          className="j-party-comparison-modal"
          onClick={() => setModalComparador(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="j-party-comparison-box" onClick={(e) => e.stopPropagation()}>
            <div className="j-comparison-head">
              <h3>COMPARAÇÃO DIRETA DE LEGENDAS</h3>
              <button
                onClick={() => setModalComparador(false)}
                aria-label="Fechar comparador"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="j-comparison-columns">
              {/* Partido 1 */}
              <div className="j-comparison-card">
                <span style={{ font: '700 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>LEGENDA A</span>
                <h4>{selecionado?.sigla}</h4>
                <div style={{ display: 'grid', gap: '8px', font: '600 12px var(--j-mono)' }}>
                  <div>Total de Candidaturas: <b>{fNum(selecionado?.total_candidaturas)}</b></div>
                  <div>Candidatos Jovens (18-29): <b>{fNum(selecionado?.jovens)} ({pct(selecionado?.pct_jovens)})</b></div>
                  <div>Jovens Eleitos: <b>{fNum(selecionado?.jovens_eleitos)}</b></div>
                  <div>Taxa de Eleição Jovem: <b style={{ color: 'var(--j-verde-dark)' }}>{pct(selecionado?.taxa_eleicao_jovens)}</b></div>
                  <small style={{ color: 'var(--j-texto-suave)' }}>Denominador da taxa: {fNum(selecionado?.jovens_eleitos)} eleitos / {fNum(selecionado?.jovens_definidos)} definidos</small>
                </div>
              </div>

              {/* Partido 2 */}
              <div className="j-comparison-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ font: '700 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>LEGENDA B</span>
                  <select
                    value={partidoComparar?.sigla}
                    onChange={(e) =>
                      setPartidoComparar(partidos.find((p) => p.sigla === e.target.value))
                    }
                    style={{ font: '700 11px var(--j-mono)', padding: '4px 8px' }}
                  >
                    {partidos.map((p) => (
                      <option key={p.sigla} value={p.sigla}>
                        {p.sigla}
                      </option>
                    ))}
                  </select>
                </div>
                <h4>{partidoComparar?.sigla}</h4>
                <div style={{ display: 'grid', gap: '8px', font: '600 12px var(--j-mono)' }}>
                  <div>Total de Candidaturas: <b>{fNum(partidoComparar?.total_candidaturas)}</b></div>
                  <div>Candidatos Jovens (18-29): <b>{fNum(partidoComparar?.jovens)} ({pct(partidoComparar?.pct_jovens)})</b></div>
                  <div>Jovens Eleitos: <b>{fNum(partidoComparar?.jovens_eleitos)}</b></div>
                  <div>Taxa de Eleição Jovem: <b style={{ color: 'var(--j-verde-dark)' }}>{pct(partidoComparar?.taxa_eleicao_jovens)}</b></div>
                  <small style={{ color: 'var(--j-texto-suave)' }}>Denominador da taxa: {fNum(partidoComparar?.jovens_eleitos)} eleitos / {fNum(partidoComparar?.jovens_definidos)} definidos</small>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '12px', background: '#ffffff', border: '1px solid #d4dfd2', font: '500 11px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
              <strong>Diferença de Participação Jovem:</strong>{' '}
              {selecionado && partidoComparar ? (
                <span>
                  {selecionado.sigla} apresenta{' '}
                  <b>
                    {Math.abs(selecionado.pct_jovens - partidoComparar.pct_jovens).toFixed(2)} p.p.{' '}
                    {selecionado.pct_jovens >= partidoComparar.pct_jovens ? 'a mais' : 'a menos'}
                  </b>{' '}
                  de candidaturas jovens que {partidoComparar.sigla}.
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Tabela de acessibilidade */}
      <details className="j-accessible-table-wrapper">
        <summary>Consultar tabela completa de composição partidária</summary>
        <table>
          <thead>
            <tr>
              <th>Partido</th>
              <th>Total</th>
              <th>Válidas</th>
              <th>18–29 (%)</th>
              <th>30–44 (%)</th>
              <th>45–59 (%)</th>
              <th>60+ (%)</th>
              <th>Jovens Eleitos</th>
              <th>Taxa Eleição Jovem</th>
            </tr>
          </thead>
          <tbody>
            {partidos.map((p) => (
              <tr key={p.sigla}>
                <td><strong>{p.sigla}</strong></td>
                <td>{fNum(p.total_candidaturas)}</td>
                <td>{fNum(p.validas)}</td>
                <td><strong>{pct(p.pct_jovens)}</strong></td>
                <td>{pct(p.pct_adultos)}</td>
                <td>{pct(p.pct_maduros)}</td>
                <td>{pct(p.pct_idosos)}</td>
                <td>{fNum(p.jovens_eleitos)}</td>
                <td>{pct(p.taxa_eleicao_jovens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
