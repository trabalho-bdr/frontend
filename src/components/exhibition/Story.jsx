import RecordCollection from '../RecordCollection.jsx';
import { useEffect, useState } from 'react';
import { loadEvidence, savedEvidence, csvDownload, fmt } from '../../data/exhibition.js';
import { readContext } from '../../data/investigationContext.js';
import './exhibition.css';
import './reading.css';
export function useEvidence(kind, params = {}, { enabled = true } = {}) {
  const context = readContext();
  if (['patrimonio', 'escolaridade', 'gastos', 'partidos'].includes(kind))
    params = {
      ano: context.ano || 2024,
      cargo: context.cargo || 'VEREADOR',
      uf: context.uf || '',
      partido: context.partido || '',
      municipio: context.municipioId || '',
      ...params,
    };
  const key = kind + JSON.stringify(params),
    [state, setState] = useState(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState({ key, data: savedEvidence(kind, params), loading: true });
    loadEvidence(kind, params, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, error: true });
      });
    return () => controller.abort();
  }, [kind, key, revision, enabled]);
  const current = state?.key === key ? state : null;
  return {
    ...current,
    data: current?.data || (!current ? savedEvidence(kind, params) : null),
    loading: !current || current.loading,
    retry: () => setRevision((n) => n + 1),
  };
}
export function Source({ data, scope = '', origin = 'TSE / acervo eleitoral' }) {
  const filter = data?.scope || {};
  return (
    <details className="expo-provenance">
      <summary>
        Fonte e recorte ·{' '}
        {data?.source === 'live'
          ? 'consulta atual'
          : data?.source === 'snapshot' || data?.source === 'amostra'
            ? 'referência arquivada'
            : 'consulta sem confirmação'}
      </summary>
      <p>Fonte: {origin}.</p>
      {scope && (
        <p>
          Recorte: {scope}
          {filter.partido ? ' · Partido: ' + filter.partido : ''}
          {filter.municipio ? ' · Município: ' + filter.municipio : ''}.
        </p>
      )}
      <p>Acervo de CE, MA, MS, RJ, RN e RS. A cobertura efetiva é a indicada nesta visualização.</p>
    </details>
  );
}
export function Lead({ kicker, question, discovery, children }) {
  return (
    <header className="expo-lead">
      <span className="expo-kicker">{kicker}</span>
      <h2>{question}</h2>
      <div className="expo-answer">
        <p className="expo-discovery" aria-live="polite">
          {discovery}
        </p>
      </div>
      {children}
    </header>
  );
}
export function ReadingScope({ children }) {
  return <p className="expo-reading-scope">Recorte: {children}</p>;
}
export function Counterpoint({ children }) {
  return (
    <aside className="expo-counterpoint">
      <strong>O CONTRAPONTO</strong>
      <p>{children}</p>
    </aside>
  );
}
export function RelatedStories({ items = [] }) {
  return items.length ? (
    <nav className="expo-related" aria-label="Continue a investigação">
      <strong>CONTINUE A INVESTIGAÇÃO</strong>
      {items.map(({ label, onClick }) => (
        <button type="button" onClick={onClick} key={label}>
          {label} ↗
        </button>
      ))}
    </nav>
  ) : null;
}
export function Meaning({ children, limit }) {
  return (
    <div className="expo-meaning">
      <span>Como interpretar</span>
      <p>{children}</p>
      {limit && (
        <details className="expo-method-note">
          <summary>Entenda os limites da análise</summary>
          <p>{limit}</p>
        </details>
      )}
    </div>
  );
}
export function Explore({
  children,
  title = 'Explore você mesmo',
  open = false,
  id,
  onExpandedChange,
}) {
  const [expanded, setExpanded] = useState(open);
  return (
    <details
      className="expo-explore"
      open={expanded}
      onToggle={(e) => {
        setExpanded(e.currentTarget.open);
        onExpandedChange?.(e.currentTarget.open);
      }}
      id={id}
    >
      <summary>
        <span>{title}</span>
      </summary>
      {expanded && <div className="expo-explore-content">{children}</div>}
    </details>
  );
}
export function DidYouKnow({ fact, explanation, scope, source, onInvestigate }) {
  return (
    <aside className="expo-fact">
      <span className="expo-stamp">VOCÊ SABIA?</span>
      <h3>{fact}</h3>
      <p>{explanation}</p>
      <small>
        {scope} · Fonte: {source}
      </small>
      {onInvestigate && <button onClick={onInvestigate}>Investigar esse fato ↗</button>}
    </aside>
  );
}
export function EvidenceRecords({ rows, name = 'dados', columns }) {
  const [open, setOpen] = useState(false);
  const keys = columns || Object.keys(rows[0] || {});
  const titleKey =
    ['nome', 'partido', 'categoria', 'grupo', 'escolaridade', 'label', 'serie'].find((key) =>
      keys.includes(key),
    ) || keys[0];
  const show = (value) =>
    value == null
      ? 'Não informado'
      : typeof value === 'number'
        ? fmt(value)
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
  const items = rows.map((row, index) => ({
    id: row.id || index,
    title: titleKey ? show(row[titleKey]) : `Registro ${index + 1}`,
    fields: keys
      .filter((key) => key !== titleKey)
      .map((key) => ({ label: key.replaceAll('_', ' '), value: show(row[key]) })),
  }));
  return (
    <div className="expo-data">
      <button onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {open ? 'Recolher fichas' : 'Conferir as fichas deste recorte'}
      </button>
      <button disabled={!rows.length} onClick={() => csvDownload(rows, name)}>
        Baixar CSV deste recorte
      </button>
      {open && <RecordCollection items={items} title={`${rows.length} registros · ${name}`} />}
    </div>
  );
}
export function Unavailable({ loading, retry, empty = false }) {
  return (
    <div className="expo-unavailable" role="status">
      <p>
        {loading
          ? 'Conferindo o recorte…'
          : empty
            ? 'Este recorte não tem registros suficientes para apresentar uma conclusão. Escolha outro filtro para comparar.'
            : 'Não foi possível carregar este recorte. Dados ausentes não são zero.'}
      </p>
      {!empty && retry && <button onClick={retry}>Tentar novamente</button>}
    </div>
  );
}
