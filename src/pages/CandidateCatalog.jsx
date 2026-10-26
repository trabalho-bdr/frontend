import SearchSelect from '../catalog/SearchSelect.jsx';
import PartySelect from '../catalog/PartySelect.jsx';
import RangeFilter from '../catalog/RangeFilter.jsx';
import { motion, useReducedMotion } from 'motion/react';
import { partyStyle } from '../catalog/partyColors.js';
import PartyHistory from '../catalog/PartyHistory.jsx';
import { partyOptionLabel } from '../catalog/partyHistory.js';
import { useEffect, useRef, useState } from 'react';
import { readContext, writeContext } from '../data/investigationContext.js';
import {
  useCatalog,
  catalogQuery,
  municipal,
  isComparable,
  CatalogState,
  displayNumber,
} from '../catalog/useCatalog.jsx';
import {
  emptyCatalogFilters as emptyFilters,
  restoreCatalog,
  canOrderVotes,
} from '../catalog/logic.js';
import { peopleSearchError, peopleSearchOrder } from '../catalog/search.js';
import Portrait from '../catalog/Portrait.jsx';
import PersonPreview from '../catalog/PersonPreview.jsx';
import '../catalog/catalog.css';
import '../catalog/people.css';
import '../catalog/candidate-explorer.css';

function savedView() {
  try {
    return JSON.parse(readContext().catalogoEstado || '{}');
  } catch {
    return {};
  }
}
export default function CandidateCatalog({ onGo, onOpenPerson }) {
  const reducedMotion = useReducedMotion();
  const [initial] = useState(() => restoreCatalog(readContext())),
    [view] = useState(savedView);
  const [filters, setFilters] = useState(initial.filters),
    [draft, setDraft] = useState(initial.filters);
  const [order, setOrder] = useState(peopleSearchOrder(initial.order, initial.filters)),
    [page, setPage] = useState(initial.page);
  const [selectedId, setSelectedId] = useState(view.selectedId || null),
    [mobileDetail, setMobileDetail] = useState(false),
    [notice, setNotice] = useState('');
  const previewRef = useRef(null),
    resultsRef = useRef(null),
    returnScroll = useRef(0),
    restored = useRef(false);
  const options = useCatalog('opcoes', { ano: draft.ano, uf: draft.uf, cargo: draft.cargo });
  const error = peopleSearchError(filters),
    draftError = peopleSearchError(draft),
    pending = JSON.stringify(draft) !== JSON.stringify(filters);
  const results = useCatalog(
    'pessoas',
    { ...filters, ordem: order, offset: page * 12, limit: 12 },
    !error,
  );
  const meta = options.data,
    rows = results.data?.rows || [],
    total = results.data?.total;
  const selected = rows.find((row) => row.id_candidato === selectedId) || rows[0];
  const key = catalogQuery({ ...filters, order, page, selected: selected?.id_candidato });
  const persist = (scrollY, electionId) =>
    writeContext({
      ...Object.fromEntries(
        Object.entries(filters).map(([key, value]) => ['catalogo_' + key, value]),
      ),
      catalogoEstado: JSON.stringify({
        filters,
        order,
        page,
        selectedId: selected?.id_candidato,
        electionId:
          electionId ||
          (view.selectedId === selected?.id_candidato ? view.electionId : null) ||
          selected?.id,
        scrollY,
      }),
      catalogo_ordem: order,
      catalogo_pagina: page,
      ano: filters.ano,
      uf: filters.uf,
      cargo: filters.cargo,
      partido: filters.partido,
      municipioId: filters.municipio,
      etapa: 'catalogo',
    });
  useEffect(() => {
    persist(view.scrollY || 0);
  }, [key]);
  useEffect(() => {
    if (!restored.current && results.data) {
      restored.current = true;
      if (Number(view.scrollY) > 0)
        requestAnimationFrame(() =>
          window.scrollTo({ top: Number(view.scrollY), behavior: 'instant' }),
        );
    }
  }, [results.data]);
  const change = (key, value) =>
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'uf' || key === 'cargo') next.municipio = '';
      if (['uf', 'cargo', 'ano'].includes(key)) next.partido = '';
      if (
        key === 'cargo' &&
        next.ano &&
        meta &&
        !meta.eleicoes.some((e) => e.cargo === value && String(e.ano) === String(next.ano))
      )
        next.ano = '';
      setNotice('');
      return next;
    });
  const submit = (event) => {
    event.preventDefault();
    if (draftError) {
      setNotice(draftError);
      return;
    }
    setFilters({ ...draft });
    setOrder(peopleSearchOrder(order, draft));
    setPage(0);
    setSelectedId(null);
    setMobileDetail(false);
    setNotice('');
    if (!pending && page === 0) results.retry();
  };
  const clear = () => {
    setDraft({ ...emptyFilters });
    setFilters({ ...emptyFilters });
    setOrder('recentes');
    setPage(0);
    setSelectedId(null);
    setMobileDetail(false);
    setNotice('');
  };
  const choose = (row) => {
    setSelectedId(row.id_candidato);
    if (window.matchMedia('(max-width:900px)').matches) {
      returnScroll.current = window.scrollY;
      setMobileDetail(true);
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        previewRef.current?.focus({ preventScroll: true });
      });
    }
  };
  const close = () => {
    setMobileDetail(false);
    requestAnimationFrame(() =>
      window.scrollTo({ top: returnScroll.current, behavior: 'instant' }),
    );
  };
  const openProfile = (row) => {
    persist(mobileDetail ? returnScroll.current : window.scrollY, row.id);
    onOpenPerson(row);
  };
  const select = (key, label, values, disabled = false) => {
    const clean = (v) =>
      String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(key === 'escolaridade' ? /^ENSINO/ : /^$/, '');
    const match = ['escolaridade', 'genero', 'raca', 'ocupacao'].includes(key)
      ? values.find(
          (item) => clean(typeof item === 'object' ? item.value : item) === clean(draft[key]),
        )
      : null;
    const value = match ? (typeof match === 'object' ? match.value : match) : draft[key];
    const placeholder =
      key === 'municipio' && disabled
        ? 'Selecione estado e cargo'
        : key === 'ano'
          ? 'Todos os anos'
          : key === 'uf'
            ? 'Todos os 6 estados'
            : key === 'cargo'
              ? 'Todos os cargos'
              : key === 'resultado'
                ? 'Todos os resultados'
                : 'Todos';
    return (
      <SearchSelect
        key={key}
        label={label}
        value={value}
        disabled={disabled}
        onChange={(value) => change(key, value)}
        placeholder={placeholder}
        options={[
          { value: '', label: placeholder },
          ...(draft[key] &&
          !match &&
          !values.some(
            (item) => String(typeof item === 'object' ? item.value : item) === String(draft[key]),
          )
            ? [
                {
                  value: draft[key],
                  label: key === 'municipio' ? 'Município selecionado' : draft[key],
                },
              ]
            : []),
          ...values,
        ]}
      />
    );
  };
  const elections = meta?.eleicoes || [];
  const years = [
    ...new Set(
      elections
        .filter(
          (e) => (!draft.cargo || e.cargo === draft.cargo) && (!draft.uf || e.uf === draft.uf),
        )
        .map((e) => String(e.ano)),
    ),
  ];
  const cargos = [
    ...new Set(
      elections
        .filter(
          (e) =>
            (!draft.ano || String(e.ano) === String(draft.ano)) && (!draft.uf || e.uf === draft.uf),
        )
        .map((e) => e.cargo),
    ),
  ];
  const reference =
    filters.ano || filters.cargo || filters.uf
      ? [filters.ano, filters.cargo, filters.uf, filters.partido].filter(Boolean).join(' · ')
      : 'Todas as eleições disponíveis';
  return (
    <section
      className={'candidate-catalog candidate-workspace' + (mobileDetail ? ' is-detail' : '')}
    >
      <header className="candidate-heading">
        <div>
          <span>CANDIDATOS</span>
          <h1>
            Quem <em>disputou?</em>
          </h1>
          <p>Uma pessoa, diferentes eleições. Encontre um nome e explore sua trajetória.</p>
        </div>
        <div className="candidate-coverage">
          <span>
            <b>
              {meta
                ? meta.coverage.primeiro_ano + '–' + meta.coverage.ultimo_ano
                : 'Acervo eleitoral'}
            </b>
            Período do acervo
          </span>
          <span>
            <b>6 estados</b>CE · MA · MS · RJ · RN · RS
          </span>
        </div>
      </header>
      <form
        className="catalog-search candidate-filter-form"
        aria-label="Busca de pessoas"
        onSubmit={submit}
      >
        <div className="candidate-filter-main">
          <label className="candidate-name-search">
            Nome ou número eleitoral
            <input
              type="search"
              value={draft.q}
              onChange={(event) => change('q', event.target.value)}
              placeholder="Nome de urna, nome civil ou número"
              maxLength={80}
            />
          </label>
          {select('ano', 'Ano da eleição', years)}
          {select('uf', 'Estado', [...new Set(elections.map((e) => e.uf))])}
          {select('cargo', 'Cargo', cargos)}
          {select(
            'municipio',
            'Município',
            (meta?.municipios || []).map((row) => ({ value: row.id, label: row.nome })),
            !draft.uf || !municipal(draft.cargo),
          )}
          <PartySelect
            value={draft.partido}
            options={meta?.facets.partido || []}
            onChange={(value) => change('partido', value)}
          />
          {select('resultado', 'Resultado', [
            { value: 'ELEITO', label: 'Eleitos' },
            { value: 'NAO_ELEITO', label: 'Não eleitos' },
            { value: 'SUPLENTE', label: 'Suplentes' },
            { value: 'INDEFINIDO', label: 'Indefinido' },
          ])}
          <button
            className="candidate-search-submit"
            type="submit"
            disabled={results.loading && !pending}
          >
            {results.loading && !pending ? 'Buscando…' : 'Buscar'} <span aria-hidden="true">→</span>
          </button>
        </div>
        <label className="party-history-toggle">
          <input
            type="checkbox"
            checked={draft.partido_historico === '1'}
            onChange={(event) => change('partido_historico', event.target.checked ? '1' : '')}
          />{' '}
          Incluir nomes anteriores e posteriores da mesma legenda
        </label>
        <p className="candidate-filter-hint">
          Reúne mudanças de nome. Fusões e incorporações permanecem separadas; a sigla original de
          cada eleição é preservada.
        </p>
        {draft.partido && <PartyHistory sigla={draft.partido} year={draft.ano} />}
        <div className="candidate-filter-bottom">
          <details className="catalog-more">
            <summary>Mais filtros</summary>
            <div className="catalog-filters">
              {select('escolaridade', 'Escolaridade', meta?.facets.escolaridade || [])}
              {select('genero', 'Gênero no cadastro', meta?.facets.genero || [])}
              {select('raca', 'Raça/cor no cadastro', meta?.facets.raca || [])}
              {select('ocupacao', 'Ocupação no cadastro', meta?.facets.ocupacao || [])}
              {select('recorrencia', 'Trajetória', [
                { value: 'primeira', label: 'Primeiro ano observado' },
                { value: 'recorrente', label: 'Retornou a disputar' },
              ])}
              {[
                ['idade', 'Idade na eleição'],
                ['gasto', 'Despesa declarada'],
                ['patrimonio', 'Patrimônio declarado'],
              ].map(([prefix, label]) => (
                <RangeFilter
                  key={prefix + ':' + filters[prefix + '_min'] + ':' + filters[prefix + '_max']}
                  prefix={prefix}
                  label={label}
                  values={draft}
                  onChange={(patch) => {
                    setDraft((current) => ({ ...current, ...patch }));
                    setNotice('');
                  }}
                />
              ))}
            </div>
            <p>
              Grafias equivalentes foram reunidas; descrições de ocupações diferentes permanecem
              separadas. “Sem informação na fonte” indica ausência de valor; “Não divulgável” é uma
              classificação separada da fonte. Faixas numéricas incluem apenas valores conhecidos;
              zero declarado não significa ausência. Valores e escolaridade pertencem à candidatura
              que corresponde aos filtros. O perfil reúne todo o histórico disponível.
            </p>
          </details>
          <button className="candidate-clear" type="button" onClick={clear}>
            Limpar filtros
          </button>
        </div>
        <p className="candidate-filter-hint" role="status">
          {notice ||
            draftError ||
            (pending
              ? 'Há alterações nos filtros. Clique em Buscar para atualizar os resultados.'
              : 'Os filtros encontram pessoas com candidaturas nesse recorte. Selecione um cartão para consultar os detalhes.')}
        </p>
        {options.error && <CatalogState state={options} />}
      </form>
      <div className="catalog-results-heading" ref={resultsRef}>
        <div>
          <p aria-live="polite">
            {results.loading
              ? 'Procurando pessoas…'
              : total != null
                ? `${displayNumber(total)} ${total === 1 ? 'pessoa encontrada' : 'pessoas encontradas'} · ${displayNumber(results.data.candidaturas_no_recorte)} ${results.data.candidaturas_no_recorte === 1 ? 'candidatura' : 'candidaturas'} no recorte`
                : ''}
          </p>
          <small>Exibindo: {reference}</small>
        </div>
        <SearchSelect
          label="Ordenar por"
          value={order}
          onChange={(value) => {
            setOrder(value);
            setPage(0);
            setSelectedId(null);
          }}
          options={[
            { value: 'recentes', label: 'Eleição mais recente' },
            { value: 'antigas', label: 'Trajetória mais antiga' },
            { value: 'nome', label: 'Nome' },
            { value: 'votos', label: 'Votos na mesma disputa', disabled: !canOrderVotes(filters) },
            {
              value: 'gastos',
              label: 'Despesa na mesma disputa',
              disabled: !isComparable(filters),
            },
          ]}
        />
      </div>
      <div className="candidate-browser">
        <div className="candidate-result-column">
          {error ? (
            <p className="catalog-state" role="alert">
              {error}
            </p>
          ) : (
            <CatalogState state={results} empty={!!results.data && !rows.length} />
          )}
          {rows.length > 0 && (
            <ol className="catalog-candidates people-stickers candidate-card-grid">
              {rows.map((row, index) => {
                const name = row.nome_pessoa || row.nome || 'Nome não informado';
                return (
                  <li key={row.id_candidato} style={{ '--card-index': index }}>
                    <motion.button
                      initial={reducedMotion ? false : { opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                      whileHover={reducedMotion ? undefined : { scale: 1.01, y: -3 }}
                      whileTap={reducedMotion ? undefined : { scale: 0.985 }}
                      transition={{
                        type: 'spring',
                        stiffness: 170,
                        damping: 21,
                        delay: Math.min(index * 0.025, 0.25),
                      }}
                      className="catalog-candidate people-sticker candidate-compact"
                      aria-pressed={selected?.id_candidato === row.id_candidato}
                      onClick={() => choose(row)}
                    >
                      <div className="candidate-photo">
                        <Portrait name={name} url={row.foto_url} photoYear={row.foto_ano} />
                        <span className="candidate-party" style={partyStyle(row.partido)}>
                          {row.partido || 'Sem sigla'}
                        </span>
                      </div>
                      <h2>{name}</h2>
                      <p>
                        {row.municipio || row.uf}
                        {row.municipio ? ' · ' + row.uf : ''}
                      </p>
                      <span className="candidate-card-reference">
                        {row.cargo} · {row.ano}
                      </span>
                      <span className="candidate-history-count">
                        {displayNumber(row.participacoes)}{' '}
                        {row.participacoes === 1 ? 'candidatura' : 'candidaturas'} no acervo
                      </span>
                      <span className="candidate-card-action">
                        Ver detalhes <span aria-hidden="true">→</span>
                      </span>
                    </motion.button>
                  </li>
                );
              })}
            </ol>
          )}
          {total > 0 && (
            <nav className="catalog-pagination" aria-label="Páginas de pessoas">
              <button
                disabled={page === 0 || results.loading}
                onClick={() => {
                  setPage((n) => n - 1);
                  setSelectedId(null);
                }}
              >
                Anterior
              </button>
              <span>
                Página {page + 1} de {Math.ceil(total / 12)}
              </span>
              <button
                disabled={(page + 1) * 12 >= total || results.loading}
                onClick={() => {
                  setPage((n) => n + 1);
                  setSelectedId(null);
                }}
              >
                Próxima
              </button>
            </nav>
          )}
        </div>
        <aside
          className="candidate-preview"
          aria-label="Detalhes da pessoa selecionada"
          ref={previewRef}
          tabIndex={-1}
        >
          <PersonPreview
            key={selected?.id_candidato || 'empty'}
            person={selected}
            initialElectionId={selected?.id_candidato === view.selectedId ? view.electionId : null}
            onOpenProfile={openProfile}
            onClose={close}
          />
        </aside>
      </div>
      <div className="candidate-mode-links">
        <button
          onClick={() =>
            onGo('legendas', '', '', {
              ano: filters.ano || '2024',
              cargo: filters.cargo || 'VEREADOR',
              uf: filters.uf,
              municipioId: filters.municipio,
              partido: filters.partido,
            })
          }
        >
          Panorama dos partidos deste recorte →
        </button>
        <span>Outra forma de explorar o mesmo acervo</span>
        <button
          onClick={() =>
            onGo('arquivo', 'trajetorias', 'pessoas', {
              ano: filters.ano,
              cargo: filters.cargo,
              uf: filters.uf,
              partido: filters.partido,
              municipioId: filters.municipio,
              buscaPessoa: filters.q,
              pessoaId: '',
              candidaturaId: '',
            })
          }
        >
          Explorar trajetórias →
        </button>
      </div>
    </section>
  );
}
