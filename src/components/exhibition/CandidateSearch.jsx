import { useEffect, useId, useRef, useState } from 'react';
import { request } from '../../data/client.js';
import { buildCandidatosQuery, candidatePlace } from './publicityScope.js';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

/**
 * Pesquisa de candidaturas dentro dos filtros da Q9. A escolha é pelo
 * id_candidatura, de modo que eleições diferentes da mesma pessoa não se misturam.
 */
export default function CandidateSearch({ scope, value, onSelect, onClear }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | ready | empty | error
  const [items, setItems] = useState([]);
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  const input = useRef(null);
  const text = query.trim();

  // O recorte mudou: resultados antigos não pertencem mais a ele.
  useEffect(() => {
    setQuery('');
    setItems([]);
    setStatus('idle');
    setOpen(false);
    setActive(-1);
  }, [scope.ano, scope.cargo, scope.uf, scope.municipioId]);

  // Campo vazio e aberto: lista as primeiras candidaturas em ordem alfabética.
  const browsing = open && text.length === 0;
  useEffect(() => {
    if (value) return undefined;
    if (text.length < MIN_CHARS && !browsing) {
      setItems([]);
      setStatus('idle');
      return undefined;
    }
    const controller = new AbortController();
    setStatus('loading');
    setItems([]);
    setActive(-1);
    const timer = setTimeout(() => {
      request('/bdr/q9/candidatos?' + buildCandidatosQuery(scope, text), {
        signal: controller.signal,
        timeout: 45000,
      })
        .then((result) => {
          if (controller.signal.aborted) return;
          const rows = result.candidatos || [];
          setItems(rows);
          setMore(Boolean(result.tem_mais));
          setStatus(rows.length ? 'ready' : 'empty');
        })
        .catch((error) => {
          if (controller.signal.aborted || error?.name === 'AbortError') return;
          setItems([]);
          setStatus('error');
        });
    }, browsing ? 0 : DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // scope é lido por campo para não refazer a busca por identidade de objeto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    text,
    browsing,
    value,
    scope.ano,
    scope.cargo,
    scope.uf,
    scope.municipioId,
    attempt,
  ]);

  const choose = (row) => {
    setOpen(false);
    setQuery('');
    setItems([]);
    setStatus('idle');
    onSelect(row);
  };
  const clear = () => {
    onClear();
    requestAnimationFrame(() => input.current?.focus());
  };
  const showList = open && !value && (text.length >= MIN_CHARS || text.length === 0);
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!items.length) return;
      event.preventDefault();
      setOpen(true);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + delta + items.length) % items.length);
    } else if (event.key === 'Enter' && showList && items[active]) {
      event.preventDefault();
      choose(items[active]);
    }
  };
  const munLabel = scope.municipioNome ? ` (${scope.municipioNome})` : '';
  const message =
    status === 'loading'
      ? 'Buscando candidaturas…'
      : status === 'empty'
        ? text
          ? `Nenhum candidato encontrado para “${text}” em ${scope.ano} · ${scope.cargo}${scope.uf ? ' · ' + scope.uf : ''}${munLabel}.`
          : `Nenhum candidato com despesas em ${scope.ano} · ${scope.cargo}${scope.uf ? ' · ' + scope.uf : ''}${munLabel}.`
        : status === 'error'
          ? 'Falha de conexão com a API. A pesquisa não pôde ser concluída.'
          : '';

  return (
    <div className="q9-search">
      <label htmlFor={`${id}-input`}>Pesquisar candidato</label>
      {value ? (
        <div className="q9-chip" role="group" aria-label="Candidato selecionado">
          <span className="q9-chip-text">
            <strong>{value.nome}</strong>
            <small>
              {value.partido || 'Sem partido'} · {candidatePlace(value)}
            </small>
          </span>
          <button
            type="button"
            onClick={clear}
            aria-label={`Limpar candidato ${value.nome} e voltar a Todos os candidatos`}
          >
            Limpar ✕
          </button>
        </div>
      ) : (
        <div className="q9-search-box">
          <input
            id={`${id}-input`}
            ref={input}
            type="search"
            role="combobox"
            autoComplete="off"
            aria-expanded={showList && items.length > 0}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={showList && items[active] ? `${id}-o${active}` : undefined}
            placeholder="Nome de urna ou nome civil"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
          />
          {showList && items.length > 0 && (
            <ul
              id={`${id}-list`}
              className="q9-options"
              role="listbox"
              aria-label="Candidaturas encontradas"
            >
              <li className="q9-options-head" role="presentation">
                Ordem alfabética · {scope.ano} · {scope.cargo}
                {scope.uf ? ` · ${scope.uf}` : ''}
                {munLabel}
              </li>
              {items.slice(0, 20).map((row, index) => (
                <li
                  key={row.id_candidatura}
                  id={`${id}-o${index}`}
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active || undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(row)}
                  onMouseEnter={() => setActive(index)}
                >
                  <strong>{row.nome}</strong>
                  <small>
                    {row.partido || 'Sem partido'} · {candidatePlace(row)}
                    {row.numero_urna ? ` · nº ${row.numero_urna}` : ''}
                  </small>
                </li>
              ))}
              {more && (
                <li className="q9-options-more" role="presentation">
                  {text
                    ? 'Há mais resultados; digite mais letras para refinar.'
                    : 'Mostrando os primeiros em ordem alfabética; digite para filtrar.'}
                </li>
              )}
            </ul>
          )}
        </div>
      )}
      <p className="q9-search-status" role="status" data-state={status} id={`${id}-status`}>
        {value
          ? `Análise restrita a esta candidatura em ${value.ano}. Limpe para voltar a “Todos os candidatos”.`
          : message ||
            (text.length > 0 && text.length < MIN_CHARS
              ? 'Digite ao menos 2 letras.'
              : 'Todos os candidatos do recorte.')}
        {status === 'error' && !value && (
          <>
            {' '}
            <button type="button" onClick={() => setAttempt((n) => n + 1)}>
              Tentar de novo
            </button>
          </>
        )}
      </p>
    </div>
  );
}
