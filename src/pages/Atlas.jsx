import { useEffect, useMemo, useState } from 'react';
import { Search, ArrowUpRight } from 'lucide-react';
import GeoAtlas from '../components/GeoAtlas.jsx';
import AtlasDiscoveries from '../components/AtlasDiscoveries.jsx';
import ComparisonPanel from '../components/ComparisonPanel.jsx';
import { EditorialHeading, PrintLabel } from '../components/Editorial.jsx';
import {
  indicatorSettings as atlasIndicators,
  formatIndicator as formatAtlasIndicator,
} from '../atlas/geography.js';
import { loadAtlasMunicipios, atlasCoverage, filterAtlasRows } from '../atlas/data.js';
import { states } from '../data/catalog.js';
const fNum = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
function Frame({ children, className = '', label = '', right = '' }) {
  return (
    <div className={'frame ' + className}>
      <div className="frame-caption">
        <span>● {label}</span>
        <span>{right || 'ARQUIVO DA DEMOCRACIA · 2026'}</span>
      </div>
      {children}
    </div>
  );
}
export default function Atlas({
  mode,
  onResearch,
  onGo,
  initialUf = '',
  initialMunicipio = '',
  initialMunicipioNome = '',
}) {
  const [uf, setUf] = useState(initialUf),
    [text, setText] = useState(initialMunicipioNome),
    [liveData, setLiveData] = useState(null),
    [failedUf, setFailedUf] = useState(null),
    [requestVersion, setRequestVersion] = useState(0);
  const [indicator, setIndicator] = useState('abstencao_2024'),
    [order, setOrder] = useState('desc'),
    [selected, setSelected] = useState(null);
  const [visibleCount, setVisibleCount] = useState(60);
  useEffect(() => {
    if (mode !== 'live') return;
    let active = true;
    setLiveData(null);
    setFailedUf(null);
    loadAtlasMunicipios(uf)
      .then((rows) => {
        if (active) setLiveData({ uf, rows });
      })
      .catch(() => {
        if (active) setFailedUf(uf);
      });
    return () => {
      active = false;
    };
  }, [mode, uf, requestVersion]);
  useEffect(() => setVisibleCount(60), [uf, text, indicator, order]);
  const liveReady = mode === 'live' && liveData?.uf === uf;
  const loading = mode === 'live' && !liveReady && failedUf !== uf;
  const atlasRows = useMemo(
    () => (liveReady ? liveData.rows : []),
    [liveReady, liveData, loading, uf],
  );
  useEffect(() => {
    if ((!initialMunicipio && !initialMunicipioNome) || !atlasRows.length) return;
    const found = atlasRows.find(
      (row) =>
        String(row.id) === String(initialMunicipio) ||
        row.nome?.toLocaleLowerCase('pt-BR') === initialMunicipioNome.toLocaleLowerCase('pt-BR'),
    );
    if (found) setSelected(found);
  }, [atlasRows, initialMunicipio, initialMunicipioNome]);
  const filtered = useMemo(
    () => filterAtlasRows(atlasRows, text, indicator, order),
    [atlasRows, text, indicator, order],
  );
  const coverage = atlasCoverage(atlasRows, indicator, uf);
  const fmt = (m) => formatAtlasIndicator(m?.[indicator], indicator);
  const chooseUf = (value) => {
    setUf(value);
    setSelected(null);
  };
  return (
    <section className="br-atlas br-scope">
      <EditorialHeading
        number="02"
        kicker="CADERNO TERRITORIAL"
        title={
          <>
            Um país.
            <br />
            <em>Muitos recortes.</em>
          </>
        }
        aside={<PrintLabel tone="blue">CARTOGRAFIA · CE / MA / MS / RJ / RN / RS</PrintLabel>}
      >
        <p>
          DESDOBRE O ATLAS. Selecione uma UF e leia o território município a município. As cores
          indicam valores; as fichas mostram os números exatos.
        </p>
      </EditorialHeading>
      <div className="atlas-indicator-strip">
        <span>ESCOLHA UMA LEITURA</span>
        {Object.entries(atlasIndicators)
          .filter(([key]) => key !== 'lideranca_mudou')
          .map(([key, v], index) => (
            <button
              key={key}
              className={indicator === key ? 'active' : ''}
              aria-pressed={indicator === key}
              onClick={() => {
                setIndicator(key);
                setSelected(null);
              }}
            >
              <small>0{index + 1}</small>
              <span>{v.label}</span>
            </button>
          ))}
      </div>
      <div className="atlas-layout">
        <Frame label="ATLAS MUNICIPAL · INDICADORES" right="SEIS UNIDADES FEDERATIVAS">
          <div className="atlas-filter">
            <button className={!uf ? 'active' : ''} aria-pressed={!uf} onClick={() => chooseUf('')}>
              BRASIL
            </button>
            {states.map((s) => (
              <button
                className={uf === s.uf ? 'active' : ''}
                aria-pressed={uf === s.uf}
                key={s.uf}
                onClick={() => chooseUf(s.uf)}
              >
                {s.uf}
              </button>
            ))}
          </div>
          <div className="atlas-reading-context">
            <span>INDICADOR EM LEITURA</span>
            <p>
              {atlasIndicators[indicator].context} · {uf || '6 UFs'}
            </p>
          </div>
          <GeoAtlas
            uf={uf}
            onUf={chooseUf}
            onSelect={setSelected}
            municipios={atlasRows}
            indicator={indicator}
            selected={selected}
            loading={loading}
          />
        </Frame>
        <Frame label="FICHÁRIO TERRITORIAL" right="COMPARE MUNICÍPIOS">
          <div className="municipality-panel">
            <div className="atlas-coverage" role="status" aria-live="polite">
              <span className="atlas-data-edition">
                {loading
                  ? 'ABRINDO O ACERVO'
                  : liveReady
                    ? 'CONSULTA AO ACERVO'
                    : 'AMOSTRA DO ACERVO'}
              </span>
              <h3>
                {uf || 'SEIS ESTADOS'} <small> / COBERTURA PARCIAL</small>
              </h3>
              {loading ? (
                <p>Carregando os dados dos {fNum(coverage.total)} municípios deste recorte…</p>
              ) : (
                <>
                  <div className="atlas-coverage-counts">
                    <div>
                      <strong>
                        {fNum(coverage.loaded)}
                        <small> / {fNum(coverage.total)}</small>
                      </strong>
                      <span>com ficha carregada</span>
                    </div>
                    <div>
                      <strong>{fNum(coverage.unloaded)}</strong>
                      <span>sem dados carregados</span>
                    </div>
                  </div>
                  <p>
                    {atlasIndicators[indicator].label}: <b>{fNum(coverage.withValue)} com valor</b>{' '}
                    · {fNum(coverage.withoutValue)} sem valor disponível no recorte. Ausência de
                    dados não significa zero.
                  </p>
                  {liveReady && coverage.unloaded > 0 && (
                    <p>
                      A consulta retornou uma cobertura parcial da UF. Os municípios sem ficha
                      permanecem cinzas.
                    </p>
                  )}
                  {failedUf === uf && (
                    <p>
                      Consulta indisponível. Nenhum valor arquivado será exibido.{' '}
                      <button type="button" onClick={() => setRequestVersion((v) => v + 1)}>
                        Tentar novamente
                      </button>
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="input-search">
              <Search size={18} />
              <input
                aria-label="Buscar município"
                placeholder="Encontre uma ficha pelo nome..."
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setSelected(null);
                }}
              />
            </div>
            <div className="atlas-sort">
              <strong>{filtered.length} FICHAS ENCONTRADAS</strong>
              <select
                aria-label="Ordenar indicadores"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              >
                <option value="desc">Maiores valores</option>
                <option value="asc">Menores valores</option>
              </select>
            </div>
            {selected && (
              <div className="atlas-selected">
                <span>FICHA SELECIONADA</span>
                <h3>
                  {selected.nome} · {selected.uf}
                </h3>
                <div>
                  <b>{atlasIndicators[indicator].label}</b>
                  <strong>{fmt(selected)}</strong>
                </div>
                <p>
                  População: {fNum(selected.populacao)} · Abstenção 2024:{' '}
                  {selected.abstencao_2024 == null ? '—' : fNum(selected.abstencao_2024) + '%'}
                </p>
                {onGo && (
                  <div
                    className="atlas-selected-actions"
                    style={{
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px dashed #c4b59f',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onGo('territorios', 'municipio', '', {
                          uf: selected.uf,
                          municipioId: selected.id,
                          municipioNome: selected.nome,
                        })
                      }
                      style={{
                        padding: '5px 9px',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        background: '#173e78',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      Perfil eleitoral ↗
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onGo('candidatos', '', '', {
                          uf: selected.uf,
                          municipioId: selected.id,
                          cargo: 'VEREADOR',
                          ano: '2024',
                        })
                      }
                      style={{
                        padding: '5px 9px',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        background: '#f4e8d3',
                        color: '#173e78',
                        border: '1px solid #173e78',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      Candidaturas ↗
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onGo('adesivos', '', '', { uf: selected.uf, municipioId: selected.id })
                      }
                      style={{
                        padding: '5px 9px',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        background: '#f4e8d3',
                        color: '#173e78',
                        border: '1px solid #173e78',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      Despesas ↗
                    </button>
                  </div>
                )}
              </div>
            )}
            {loading ? (
              <p className="data-unavailable">Abrindo fichas do território…</p>
            ) : (
              <>
                <div className="municipio-list atlas-scroll-list">
                  {filtered.slice(0, visibleCount).map((m) => (
                    <button
                      className={selected?.id === m.id ? 'active' : ''}
                      key={m.id}
                      onClick={() => {
                        setSelected(m);
                        setUf(m.uf);
                      }}
                    >
                      <span>
                        <strong>{m.nome}</strong>
                        <small>{m.uf}</small>
                      </span>
                      <b>{fmt(m)}</b>
                    </button>
                  ))}
                  {!filtered.length && <p>Nenhuma ficha encontrada no recorte atual.</p>}
                </div>
                {visibleCount < filtered.length && (
                  <button
                    type="button"
                    className="atlas-more"
                    onClick={() => setVisibleCount((n) => n + 60)}
                  >
                    MOSTRAR MAIS FICHAS · {Math.min(visibleCount, filtered.length)} DE{' '}
                    {filtered.length}
                  </button>
                )}
              </>
            )}
            <p className="atlas-count-note">
              A busca filtra somente o fichário e mantém os dados do mapa. O Atlas cobre CE, MA, MS,
              RJ, RN e RS; não representa todo o país.
            </p>
          </div>
        </Frame>
      </div>
      <AtlasDiscoveries
        rows={atlasRows}
        indicator={indicator}
        uf={uf}
        coverage={coverage}
        loading={loading}
        archived={!liveReady}
        onSelect={(record) => {
          setSelected(record);
          setUf(record.uf);
        }}
      />
      <div className="atlas-investigate">
        <div>
          <strong>O QUE O TERRITÓRIO EXPLICA?</strong>
          <p>
            Compare população, PIB por habitante e abstenção. Os períodos e a composição estadual
            precisam ser analisados separadamente.
          </p>
        </div>
        <button onClick={() => onResearch(3)}>
          DESDOBRAR ESTA INVESTIGAÇÃO <ArrowUpRight size={15} />
        </button>
        <button onClick={() => onResearch(7)}>
          VER A MUDANÇA NOS PARTIDOS <ArrowUpRight size={15} />
        </button>
      </div>
      <ComparisonPanel topic="atlas" mode={liveReady ? 'live' : 'snapshot'} municipios={filtered} />
      <p className="editorial-note">
        População/PIB e participação eleitoral podem ter anos de referência distintos; confira a
        metodologia de cada análise.
      </p>
    </section>
  );
}
