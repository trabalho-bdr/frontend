import React, { useState, useMemo, useEffect } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { MapPin, Search, GitCompare, X, AlertTriangle, ArrowLeft } from 'lucide-react';
import { prepareGeography, municipalityId, COVERAGE } from '../../atlas/geography.js';

const fNum = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
const pct = (n) => (n == null ? '—' : `${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`);

// Escala de cores do verde editorial brasileiro para % de jovens
const YOUTH_BREAKS = [5, 8, 12, 16];
const YOUTH_COLORS = ['#eaf3eb', '#c2dec6', '#7ebd8b', '#2e8b4e', '#135c2f'];
const NO_DATA_COLOR = '#e3ded3';

function getYouthColor(val) {
  if (val == null || !Number.isFinite(Number(val))) return NO_DATA_COLOR;
  const num = Number(val);
  if (num < YOUTH_BREAKS[0]) return YOUTH_COLORS[0];
  if (num < YOUTH_BREAKS[1]) return YOUTH_COLORS[1];
  if (num < YOUTH_BREAKS[2]) return YOUTH_COLORS[2];
  if (num < YOUTH_BREAKS[3]) return YOUTH_COLORS[3];
  return YOUTH_COLORS[4];
}

export default function MapaJuventude({
  municipiosData = [],
  mediaPonderada = 6.82,
  ano = 2024,
  cargo = 'VEREADOR',
  uf = '',
  onSelectUf
}) {
  const [geoData, setGeoData] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedMun, setSelectedMun] = useState(null);
  const [compararMun, setCompararMun] = useState(null);
  const [modalComparar, setModalComparar] = useState(false);
  const [buscaMun, setBuscaMun] = useState('');
  const [hoverLabel, setHoverLabel] = useState(null);
  const [indicadorTerritorial, setIndicadorTerritorial] = useState('pct_jovens'); // 'pct_jovens' | 'jovens' | 'taxa_eleicao_jovens'

  const activeUf = uf || '';
  const mapSource = activeUf || 'estados';

  // Carregar malha geográfica IBGE em GeoJSON
  useEffect(() => {
    let active = true;
    setGeoLoading(true);
    fetch(`/maps/${mapSource}.geojson`)
      .then((res) => {
        if (!res.ok) throw new Error('Malha indisponível');
        return res.json();
      })
      .then((data) => {
        if (active) {
          setGeoData(prepareGeography(data));
        }
      })
      .catch(() => {
        if (active) setGeoData(null);
      })
      .finally(() => {
        if (active) setGeoLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mapSource]);

  // Projeção cartográfica d3
  const pathGenerator = useMemo(() => {
    if (!geoData) return null;
    const projection = geoMercator().fitExtent([[20, 20], [680, 440]], geoData);
    return geoPath(projection);
  }, [geoData]);

  // Mapa de busca rápido dos municípios por id
  const munMap = useMemo(() => {
    const map = new Map();
    for (const m of municipiosData) {
      map.set(String(m.id_municipio), m);
    }
    return map;
  }, [municipiosData]);

  // Filtro de municípios da lista
  const municipiosFiltrados = useMemo(() => {
    let list = municipiosData;
    if (activeUf) {
      list = list.filter((m) => m.uf === activeUf);
    }
    if (buscaMun) {
      const q = buscaMun.toLowerCase();
      list = list.filter((m) => m.municipio_nome.toLowerCase().includes(q));
    }
    return list;
  }, [municipiosData, activeUf, buscaMun]);

  const selecionado = selectedMun || municipiosFiltrados[0] || null;

  return (
    <section className="j-section-panel" aria-labelledby="mapa-juventude-title">
      <header>
        <span className="j-step-badge">EXPERIÊNCIA 03 · CARTOGRAFIA ELEITORAL</span>
        <h2 id="mapa-juventude-title">ONDE A JUVENTUDE ENTRA NA POLÍTICA?</h2>
        <p>
          Mapeie a participação de jovens nas disputas municipais.
          Cores mais escuras indicam maior percentual de candidaturas jovens (18 a 29 anos).
          Clique em um município no mapa ou selecione na lista para examinar os dados locais e compará-los com a média estadual.
        </p>
      </header>

      {/* Alternância de indicador territorial */}
      <div className="j-metric-toggle" role="group" aria-label="Indicador territorial">
        <button
          type="button"
          aria-pressed={indicadorTerritorial === 'pct_jovens'}
          onClick={() => setIndicadorTerritorial('pct_jovens')}
        >
          % Candidaturas Jovens
        </button>
        <button
          type="button"
          aria-pressed={indicadorTerritorial === 'jovens'}
          onClick={() => setIndicadorTerritorial('jovens')}
        >
          Quantidade de Jovens Concorrendo
        </button>
        <button
          type="button"
          aria-pressed={indicadorTerritorial === 'taxa_eleicao_jovens'}
          onClick={() => setIndicadorTerritorial('taxa_eleicao_jovens')}
        >
          Taxa de Vitória Jovem (%)
        </button>
      </div>

      <div className="j-map-container">
        {/* Lado esquerdo: Mapa SVG */}
        <div className="j-map-svg-frame">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px', alignItems: 'center' }}>
            <span style={{ font: '700 11px var(--j-mono)', color: 'var(--j-azul)' }}>
              {activeUf ? `MAPA DE MUNICÍPIOS · ${activeUf}` : 'COBERTURA TERRITORIAL (6 ESTADOS)'}
            </span>
            {activeUf && (
              <button
                type="button"
                className="j-btn-reset"
                style={{ height: '30px', padding: '0 8px' }}
                onClick={() => onSelectUf && onSelectUf('')}
              >
                <ArrowLeft size={14} /> Ver todos os 6 estados
              </button>
            )}
          </div>

          <div style={{ width: '100%', position: 'relative' }}>
            {geoLoading ? (
              <div style={{ height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 13px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                Carregando malha cartográfica...
              </div>
            ) : geoData && pathGenerator ? (
              <svg
                viewBox="0 0 700 460"
                className="j-map-svg"
                role="img"
                aria-label={`Mapa eleitoral territorial ${activeUf || 'seis UFs'}`}
              >
                {geoData.features.map((feature) => {
                  const id = municipalityId(feature);
                  const isStateView = !activeUf;
                  const isCoveredState = isStateView && COVERAGE.includes(feature.properties?.uf);
                  const mData = munMap.get(id);

                  let fillColor = '#d9d5cb';
                  if (isStateView) {
                    fillColor = isCoveredState ? '#7ebd8b' : '#ede8de';
                  } else if (mData) {
                    fillColor = getYouthColor(mData.pct_jovens);
                  }

                  const isSelected = selectedMun && String(selectedMun.id_municipio) === id;

                  return (
                    <path
                      key={id || feature.properties?.uf}
                      d={pathGenerator(feature) || ''}
                      fill={fillColor}
                      stroke={isSelected ? '#c84d38' : '#ffffff'}
                      strokeWidth={isSelected ? 2.5 : 0.6}
                      style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                      onClick={() => {
                        if (isStateView && isCoveredState) {
                          onSelectUf && onSelectUf(feature.properties.uf);
                        } else if (mData) {
                          setSelectedMun(mData);
                        }
                      }}
                      onMouseEnter={() => {
                        const lbl = mData
                          ? `${mData.municipio_nome} (${mData.uf}): ${pct(mData.pct_jovens)} jovens (${fNum(mData.jovens)} de ${fNum(mData.validas)})`
                          : feature.properties?.nome || feature.properties?.uf;
                        setHoverLabel(lbl);
                      }}
                      onMouseLeave={() => setHoverLabel(null)}
                    >
                      <title>{mData ? `${mData.municipio_nome} (${mData.uf})` : feature.properties?.nome}</title>
                    </path>
                  );
                })}
              </svg>
            ) : (
              <div style={{ height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f3', border: '1px dashed #ccc' }}>
                <p style={{ font: '500 12px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                  Cartografia interativa disponível via listagem municipal ao lado.
                </p>
              </div>
            )}
          </div>

          {/* Legenda de cores */}
          <div className="j-map-legend-bar">
            <span>&lt; 5%</span>
            <div className="j-gradient-strip" />
            <span>&ge; 16% Jovens</span>
            <span style={{ marginLeft: '12px' }}>
              <i style={{ display: 'inline-block', width: '10px', height: '10px', background: NO_DATA_COLOR, marginRight: '4px', verticalAlign: 'middle' }} />
              Sem registro
            </span>
          </div>

          <div style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)', marginTop: '6px', textAlign: 'center' }}>
            {hoverLabel || (selectedMun ? `Selecionado: ${selectedMun.municipio_nome} (${selectedMun.uf})` : 'Passe o cursor sobre um município para ver detalhes')}
          </div>
        </div>

        {/* Lado direito: Ficha territorial compacta e busca */}
        <aside className="j-territorial-card" aria-label="Ficha territorial do município">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ font: '700 10px var(--j-mono)', color: 'var(--j-verde)', textTransform: 'uppercase' }}>
              FICHA COMPACTA TERRITORIAL
            </span>
            <span style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
              {ano} · {cargo}
            </span>
          </div>

          {selecionado ? (
            <>
              <div>
                <h3 className="j-territorial-title">
                  {selecionado.municipio_nome} <small style={{ font: '600 14px var(--j-mono)', color: 'var(--j-texto-suave)' }}>/ {selecionado.uf}</small>
                </h3>
                {selecionado.populacao && (
                  <span style={{ font: '500 11px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                    População (Censo 2022): {fNum(selecionado.populacao)} hab.
                  </span>
                )}
              </div>

              {/* Alerta de amostra reduzida */}
              {selecionado.total_candidaturas < 25 && (
                <div className="j-sample-warning" role="alert">
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>
                    Amostra reduzida ({fNum(selecionado.total_candidaturas)} candidaturas) — indicador percentual sujeito a instabilidade estatística.
                  </span>
                </div>
              )}

              {/* Indicadores do município */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="j-stat-card">
                  <span>CANDIDATURAS JOVENS</span>
                  <strong style={{ color: 'var(--j-verde-dark)' }}>{fNum(selecionado.jovens)}</strong>
                  <small style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                    de {fNum(selecionado.validas)} válidas ({pct(selecionado.pct_jovens)})
                  </small>
                </div>

                <div className="j-stat-card">
                  <span>JOVENS ELEITOS</span>
                  <strong style={{ color: 'var(--j-azul)' }}>{fNum(selecionado.jovens_eleitos)}</strong>
                  <small style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                    de {fNum(selecionado.total_eleitos)} eleitos totais
                  </small>
                </div>
              </div>

              {/* Comparação com a média estadual ponderada */}
              <div className="j-state-benchmark">
                <div>
                  Média ponderada do estado ({selecionado.uf}): <b>{pct(mediaPonderada)}</b>
                </div>
                <div style={{ marginTop: '4px' }}>
                  Este município está{' '}
                  <strong style={{ color: selecionado.pct_jovens >= mediaPonderada ? 'var(--j-verde-dark)' : 'var(--j-vermelho)' }}>
                    {Math.abs(selecionado.pct_jovens - mediaPonderada).toFixed(2)} p.p.{' '}
                    {selecionado.pct_jovens >= mediaPonderada ? 'acima' : 'abaixo'}
                  </strong>{' '}
                  da média estadual.
                </div>
              </div>

              {/* Botão de comparar municípios */}
              <button
                type="button"
                className="j-btn-open-dossier"
                style={{ background: 'var(--j-azul)' }}
                onClick={() => {
                  setCompararMun(municipiosFiltrados.find((m) => m.id_municipio !== selecionado.id_municipio) || null);
                  setModalComparar(true);
                }}
              >
                <GitCompare size={15} /> Comparar Municípios
              </button>
            </>
          ) : (
            <p style={{ font: '500 12px var(--j-body)', color: 'var(--j-texto-suave)' }}>
              Selecione um município para exibir sua ficha.
            </p>
          )}

          {/* Busca e Lista Rápida de Municípios */}
          <div style={{ borderTop: '1px solid #dce4d9', paddingTop: '12px' }}>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#6d8376' }} />
              <input
                type="text"
                placeholder="Buscar município..."
                value={buscaMun}
                onChange={(e) => setBuscaMun(e.target.value)}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '4px 8px 4px 30px',
                  border: '1px solid #9db5a7',
                  font: '500 11px var(--j-body)'
                }}
                aria-label="Buscar município na lista"
              />
            </div>

            <div className="j-mun-list" role="list" aria-label="Lista de municípios do recorte">
              {municipiosFiltrados.slice(0, 40).map((m) => (
                <button
                  key={m.id_municipio}
                  type="button"
                  className={`j-mun-item ${selecionado?.id_municipio === m.id_municipio ? 'active' : ''}`}
                  onClick={() => setSelectedMun(m)}
                >
                  <span>
                    {m.municipio_nome} <small style={{ color: '#6f8176' }}>({m.uf})</small>
                  </span>
                  <strong>{pct(m.pct_jovens)}</strong>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Modal de Comparar 2 Municípios */}
      {modalComparar && selecionado && (
        <div
          className="j-party-comparison-modal"
          onClick={() => setModalComparar(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="j-party-comparison-box" onClick={(e) => e.stopPropagation()}>
            <div className="j-comparison-head">
              <h3>COMPARAÇÃO DE TERRITÓRIOS</h3>
              <button
                onClick={() => setModalComparar(false)}
                aria-label="Fechar comparador"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="j-comparison-columns">
              {/* Município 1 */}
              <div className="j-comparison-card">
                <span style={{ font: '700 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>MUNICÍPIO 1</span>
                <h4>{selecionado.municipio_nome} ({selecionado.uf})</h4>
                <div style={{ display: 'grid', gap: '8px', font: '600 12px var(--j-mono)' }}>
                  <div>Total de Candidaturas: <b>{fNum(selecionado.total_candidaturas)}</b></div>
                  <div>Candidatos Jovens (18-29): <b>{fNum(selecionado.jovens)} ({pct(selecionado.pct_jovens)})</b></div>
                  <div>Jovens Eleitos: <b>{fNum(selecionado.jovens_eleitos)}</b></div>
                  <div>Taxa de Vitória Jovem: <b>{pct(selecionado.taxa_eleicao_jovens)}</b></div>
                  {selecionado.populacao && <div>População: {fNum(selecionado.populacao)}</div>}
                </div>
              </div>

              {/* Município 2 */}
              <div className="j-comparison-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ font: '700 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>MUNICÍPIO 2</span>
                  <select
                    value={compararMun?.id_municipio}
                    onChange={(e) =>
                      setCompararMun(municipiosFiltrados.find((m) => String(m.id_municipio) === e.target.value))
                    }
                    style={{ font: '700 11px var(--j-mono)', padding: '4px 8px', maxWidth: '180px' }}
                  >
                    {municipiosFiltrados.map((m) => (
                      <option key={m.id_municipio} value={m.id_municipio}>
                        {m.municipio_nome} ({m.uf})
                      </option>
                    ))}
                  </select>
                </div>

                <h4>{compararMun?.municipio_nome} ({compararMun?.uf})</h4>
                <div style={{ display: 'grid', gap: '8px', font: '600 12px var(--j-mono)' }}>
                  <div>Total de Candidaturas: <b>{fNum(compararMun?.total_candidaturas)}</b></div>
                  <div>Candidatos Jovens (18-29): <b>{fNum(compararMun?.jovens)} ({pct(compararMun?.pct_jovens)})</b></div>
                  <div>Jovens Eleitos: <b>{fNum(compararMun?.jovens_eleitos)}</b></div>
                  <div>Taxa de Vitória Jovem: <b>{pct(compararMun?.taxa_eleicao_jovens)}</b></div>
                  {compararMun?.populacao && <div>População: {fNum(compararMun.populacao)}</div>}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '12px', background: '#ffffff', border: '1px solid #d4dfd2', font: '500 11px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
              <strong>Diferença Territorial:</strong>{' '}
              {compararMun ? (
                <span>
                  {selecionado.municipio_nome} possui{' '}
                  <b>
                    {Math.abs(selecionado.pct_jovens - compararMun.pct_jovens).toFixed(2)} p.p.{' '}
                    {selecionado.pct_jovens >= compararMun.pct_jovens ? 'a mais' : 'a menos'}
                  </b>{' '}
                  de candidaturas jovens que {compararMun.municipio_nome}.
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Tabela de acessibilidade */}
      <details className="j-accessible-table-wrapper">
        <summary>Consultar tabela de dados municipais de candidaturas jovens</summary>
        <table>
          <thead>
            <tr>
              <th>Município</th>
              <th>UF</th>
              <th>Total Cand.</th>
              <th>Candidaturas Jovens</th>
              <th>% Jovens</th>
              <th>Jovens Eleitos</th>
              <th>Taxa Eleição Jovem</th>
            </tr>
          </thead>
          <tbody>
            {municipiosFiltrados.slice(0, 50).map((m) => (
              <tr key={m.id_municipio}>
                <td><strong>{m.municipio_nome}</strong></td>
                <td>{m.uf}</td>
                <td>{fNum(m.total_candidaturas)}</td>
                <td>{fNum(m.jovens)}</td>
                <td><strong>{pct(m.pct_jovens)}</strong></td>
                <td>{fNum(m.jovens_eleitos)}</td>
                <td>{pct(m.taxa_eleicao_jovens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
