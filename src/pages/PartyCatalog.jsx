import StateFlag, { StateTabs, FlagCredits } from '../catalog/StateFlag.jsx';
import { stateInfo } from '../catalog/states.js';
import '../catalog/acervo-collections.css';
import { useEffect, useState } from 'react';
import { readContext, writeContext } from '../data/investigationContext.js';
import {
  useCatalog,
  CatalogState,
  displayNumber as num,
  displayMoney as money,
} from '../catalog/useCatalog.jsx';
import { emptyCatalogFilters } from '../catalog/logic.js';
import SearchSelect from '../catalog/SearchSelect.jsx';
import PartyHistory from '../catalog/PartyHistory.jsx';
import { partyStyle } from '../catalog/partyColors.js';
import { partyOptionLabel } from '../catalog/partyHistory.js';
import '../catalog/catalog.css';
import '../catalog/people.css';
import '../catalog/candidate-explorer.css';
import '../catalog/acervo.css';
export default function PartyCatalog({ onGo }) {
  const [initial] = useState(readContext),
    [ano, setAno] = useState(initial.ano || '2024'),
    [cargo, setCargo] = useState(initial.cargo || 'VEREADOR'),
    [uf, setUf] = useState(initial.uf || ''),
    [municipio, setMunicipio] = useState(
      ['VEREADOR', 'PREFEITO'].includes(initial.cargo) ? initial.municipioId || '' : '',
    ),
    [partido, setPartido] = useState(initial.partido || ''),
    [query, setQuery] = useState('');
  const options = useCatalog('opcoes', { ano, uf, cargo }),
    meta = options.data;
  const years = [
    ...new Set(
      (meta?.eleicoes || [])
        .filter((e) => e.cargo === cargo && (!uf || e.uf === uf))
        .map((e) => String(e.ano)),
    ),
  ];
  useEffect(() => {
    if (years.length && !years.includes(ano)) setAno(years[0]);
  }, [cargo, uf, years.join('|'), ano]);
  useEffect(() => {
    writeContext({
      ano,
      cargo,
      uf,
      municipioId: municipio,
      municipioNome: municipio
        ? (meta?.municipios || []).find((m) => m.id === municipio)?.nome || ''
        : '',
      partido,
      etapa: 'catalogo',
    });
  }, [ano, cargo, uf, municipio, partido]);
  const params = { ano, cargo, uf, municipio },
    state = useCatalog('legendas', params),
    detail = useCatalog('legendas', { ...params, partido }, !!partido);
  const rows = (state.data?.rows || []).filter((row) =>
      partyOptionLabel(row.partido || '')
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
    data = partido ? detail.data : state.data,
    summary = data?.resumo;
  const people = (party = partido, stateUf = uf) => {
    const filters = {
      ...emptyCatalogFilters,
      ano,
      cargo,
      uf: stateUf,
      municipio: stateUf === uf ? municipio : '',
      partido: party || '',
    };
    onGo('candidatos', '', '', {
      ...params,
      uf: stateUf,
      municipioId: filters.municipio,
      partido: party || '',
      pessoaId: '',
      candidaturaId: '',
      catalogoEstado: JSON.stringify({ filters, order: 'recentes', page: 0 }),
    });
  };
  const territory = (stateUf) =>
    onGo('territorios', 'estado', '', {
      uf: stateUf,
      municipioId: '',
      municipioNome: '',
      ano,
      cargo,
      partido,
    });
  const scope = [
    ano,
    cargo,
    uf || 'Seis estados',
    municipio
      ? (meta?.municipios || []).find((m) => m.id === municipio)?.nome || 'Município selecionado'
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <section className="party-catalog party-collection">
      <header className="catalog-heading collection-cover party-cover">
        <div className="collection-cover-copy">
          <span className="collection-eyebrow">CADERNO PARTIDÁRIO / AS LEGENDAS DO ACERVO</span>
          <h1>
            Siglas que cruzam
            <br />
            <em>histórias.</em>
          </h1>
          <p>
            Por trás de cada partido, pessoas e territórios. Explore as disputas, siga as mudanças
            de nome e encontre suas candidaturas.
          </p>
          <span className="collection-coverage">SIGLAS ORIGINAIS DE CADA ELEIÇÃO · 2002–2024</span>
        </div>
        <div className="party-cover-composition" aria-hidden="true">
          {(state.data?.rows || [])
            .filter((row) => row.partido && (!partido || row.partido === partido))
            .slice(0, 3)
            .map((row, index) => (
              <span key={row.partido} style={{ ...partyStyle(row.partido), '--slip-index': index }}>
                <small>ARQUIVO / LEGENDA</small>
                <strong>{row.partido}</strong>
                <i>pessoas · votos · territórios</i>
              </span>
            ))}
        </div>
      </header>
      <StateTabs
        value={uf}
        label="Filtrar partidos por estado"
        onChange={(state) => {
          setUf(state);
          setMunicipio('');
        }}
      />
      <div className="party-scope">
        <SearchSelect label="Ano da eleição" value={ano} options={years} onChange={setAno} />
        <SearchSelect
          label="Cargo"
          value={cargo}
          options={[...new Set((meta?.eleicoes || []).map((e) => e.cargo))]}
          onChange={(v) => {
            setCargo(v);
            setMunicipio('');
          }}
        />
        <SearchSelect
          label="Município"
          value={municipio}
          disabled={!uf || !['VEREADOR', 'PREFEITO'].includes(cargo)}
          options={[
            { value: '', label: 'Todos os municípios' },
            ...(meta?.municipios || []).map((m) => ({ value: m.id, label: m.nome })),
          ]}
          onChange={setMunicipio}
        />
      </div>
      <p className="acervo-scope">{scope}</p>
      <CatalogState state={options.error ? options : partido ? detail : state} />
      {partido && (
        <div className="party-detail-heading party-dossier-cover" style={partyStyle(partido)}>
          <button className="catalog-back" onClick={() => setPartido('')}>
            ← Todos os partidos
          </button>
          <h2>
            <span className="party-identity" style={partyStyle(partido)}>
              {partido}
            </span>{' '}
            Panorama da legenda
          </h2>
          <PartyHistory sigla={partido} year={ano} />
        </div>
      )}
      {summary && (
        <>
          <dl className="party-stats">
            {[
              ['Pessoas distintas', num(summary.pessoas)],
              ['Candidaturas', num(summary.candidaturas)],
              ['Eleitos registrados', num(summary.eleitos)],
              ['Votos nominais conhecidos', num(summary.votos_nominais)],
              ['Despesas conhecidas', money(summary.despesas)],
              [
                'Presença territorial',
                num(summary.estados) +
                  ' UFs' +
                  (['VEREADOR', 'PREFEITO'].includes(cargo)
                    ? ' · ' + num(summary.municipios) + ' municípios'
                    : ''),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="party-coverage">
            Votos informados em {num(summary.registros_com_votos)} de {num(summary.candidaturas)}{' '}
            candidaturas; despesas informadas em {num(summary.registros_com_despesa)}. Uma pessoa
            pode disputar por siglas diferentes: os totais de pessoas por partido não devem ser
            somados.
          </p>
        </>
      )}
      {partido ? (
        <>
          <div className="party-actions">
            <button onClick={() => people()}>Ver candidatos desta legenda →</button>
            <button
              onClick={() =>
                onGo('partidos', 'representacao', '', {
                  ano,
                  cargo,
                  uf,
                  partido,
                  municipioId: municipio,
                })
              }
            >
              Explorar no Mural →
            </button>
          </div>
          <div className="collection-section-line">
            <h2>Presença nos estados</h2>
            <span>A LEGENDA PELO TERRITÓRIO</span>
          </div>
          <div className="party-state-grid">
            {(detail.data?.territorios || []).map((row) => (
              <article key={row.uf} className="party-territory-file">
                <StateFlag uf={row.uf} />
                <small>{stateInfo(row.uf)?.region}</small>
                <h3>
                  {stateInfo(row.uf)?.name || row.uf} <span>{row.uf}</span>
                </h3>
                <p>
                  {num(row.pessoas)} pessoas · {num(row.candidaturas)} candidaturas ·{' '}
                  {num(row.eleitos)} eleitos
                </p>
                <button onClick={() => people(partido, row.uf)}>Ver candidatos →</button>
                <button onClick={() => territory(row.uf)}>Explorar território →</button>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <label className="party-name-search">
            Encontrar legenda
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sigla ou nome anterior"
            />
          </label>
          <div className="collection-section-line">
            <span>
              {state.loading
                ? 'CONSULTANDO LEGENDAS…'
                : state.error
                  ? 'CONSULTA INDISPONÍVEL'
                  : `${num(rows.length)} LEGENDAS NESTE RECORTE`}
            </span>
            <span>ABRA UMA FICHA PARA EXPLORAR</span>
          </div>
          <div className="party-directory party-files">
            {rows.map((row, index) => (
              <article
                className="party-file"
                key={row.partido || 'missing'}
                style={{ ...partyStyle(row.partido), '--card-order': index % 9 }}
              >
                <div className="party-file-meta">
                  <span>FICHA {String(index + 1).padStart(2, '0')}</span>
                  <span>
                    {ano} / {uf || '06 UFs'}
                  </span>
                </div>
                <h2 className="party-file-monogram">{row.partido || 'Sem sigla'}</h2>
                <p className="party-file-history">
                  {partyOptionLabel(row.partido || '') !== row.partido
                    ? partyOptionLabel(row.partido || '')
                    : 'Legenda registrada nesta eleição'}
                </p>
                <dl>
                  <div>
                    <dt>Pessoas</dt>
                    <dd>{num(row.pessoas)}</dd>
                  </div>
                  <div>
                    <dt>Candidaturas</dt>
                    <dd>{num(row.candidaturas)}</dd>
                  </div>
                  <div>
                    <dt>Eleitos</dt>
                    <dd>{num(row.eleitos)}</dd>
                  </div>
                </dl>
                <button
                  className="party-file-open"
                  disabled={!row.partido}
                  onClick={() => setPartido(row.partido)}
                >
                  Abrir panorama →
                </button>
                <button disabled={!row.partido} onClick={() => people(row.partido)}>
                  Ver candidatos →
                </button>
              </article>
            ))}
          </div>
          {state.data && !rows.length && <p>Nenhuma legenda encontrada neste recorte.</p>}
        </>
      )}
      <details className="catalog-method">
        <summary>Fontes e leitura dos indicadores</summary>
        <p>{data?.method}</p>
        <p>
          Fonte: acervo eleitoral do TSE. A votação mostrada é nominal das candidaturas; não inclui
          votos de legenda nem representa o total oficial de votos do partido. Municípios delimitam
          candidaturas apenas nas disputas municipais.
        </p>
      </details>
      <FlagCredits />
    </section>
  );
}
