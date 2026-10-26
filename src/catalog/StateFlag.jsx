import { stateInfo, archiveStates } from './states.js';
export default function StateFlag({ uf, className = '', decorative = false }) {
  const state = stateInfo(uf);
  if (!state) return null;
  return (
    <img
      className={'state-flag ' + className}
      src={'/flags/' + uf.toLowerCase() + '.svg'}
      alt={decorative ? '' : 'Bandeira ' + (uf === 'MS' ? 'de ' : 'do ') + state.name}
      width="150"
      height="100"
      decoding="async"
    />
  );
}
export function StateTabs({ value, onChange, label = 'Explorar por estado' }) {
  return (
    <nav className="collection-state-tabs" aria-label={label}>
      <button type="button" aria-pressed={!value} onClick={() => onChange('')}>
        <span className="state-tabs-all" aria-hidden="true">
          06
        </span>
        <span>
          Todo o acervo<small>Seis estados</small>
        </span>
      </button>
      {archiveStates.map((state) => (
        <button
          type="button"
          key={state.uf}
          aria-pressed={value === state.uf}
          onClick={() => onChange(state.uf)}
        >
          <StateFlag uf={state.uf} decorative />
          <span>
            {state.uf}
            <small>{state.name}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}
export function FlagCollection() {
  return (
    <div className="flag-collection" aria-hidden="true">
      {archiveStates.map((state) => (
        <div key={state.uf}>
          <StateFlag uf={state.uf} decorative />
          <span>{state.uf}</span>
        </div>
      ))}
      <span className="flag-collection-seal">
        06 UFs
        <br />
        UM ACERVO
      </span>
    </div>
  );
}

export function FlagCredits() {
  return (
    <p className="collection-flag-credits">
      Bandeiras dos estados ·{' '}
      <a href="/flags/credits.html" target="_blank" rel="noreferrer">
        fontes e créditos ↗
      </a>
    </p>
  );
}
