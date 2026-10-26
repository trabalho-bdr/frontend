import '../record-collection.css';
import { useEffect, useState } from 'react';
import { useScope } from '../../data/investigationContext.js';
import { request } from '../../data/client.js';
import { Explore } from './Story.jsx';
import CandidateSearch from './CandidateSearch.jsx';
import PublicityCloud from './PublicityCloud.jsx';
import PublicityComparison from './PublicityComparison.jsx';
import { formatPercent as percent } from './publicityComparison.js';
import {
  ALL_OFFICES,
  buildDespesasQuery,
  candidateLabel,
  candidateMatchesScope,
  getCompatibleYear,
  OFFICES_BY_YEAR,
} from './publicityScope.js';
import './publicity-polish.css';

const money = (value) =>
  value == null
    ? '—'
    : Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      });
const number = (value) => (value == null ? '—' : Number(value).toLocaleString('pt-BR'));
const ufs = ['CE', 'MA', 'MS', 'RJ', 'RN', 'RS'];

export default function PublicityInvestigation() {
  const [scope, setScope] = useScope({
    ano: 2024,
    cargo: 'VEREADOR',
    uf: '',
    municipioId: '',
    municipioNome: '',
    criterio: 'sugeridas',
  });
  const [scopeNotice, setScopeNotice] = useState('');
  const [towns, setTowns] = useState([]);
  const [townsLoading, setTownsLoading] = useState(false);

  // Carrega municípios quando um estado é selecionado
  useEffect(() => {
    if (!scope.uf) {
      setTowns([]);
      return;
    }
    const ac = new AbortController();
    setTownsLoading(true);
    request('/municipios?uf=' + encodeURIComponent(scope.uf), {
      signal: ac.signal,
      timeout: 25000,
    })
      .then((result) => {
        if (!ac.signal.aborted) {
          const list = Array.isArray(result) ? result : result?.municipios || [];
          const sorted = [...list].sort((a, b) =>
            (a.nome || '').localeCompare(b.nome || '', 'pt-BR'),
          );
          setTowns(sorted);
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) setTowns([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setTownsLoading(false);
      });
    return () => ac.abort();
  }, [scope.uf]);

  // Garante que o ano e o cargo sejam sempre compatíveis
  useEffect(() => {
    const validOffices = OFFICES_BY_YEAR[scope.ano] || [];
    if (!validOffices.includes(scope.cargo)) {
      const year = getCompatibleYear(scope.cargo, scope.ano);
      const yearOffices = OFFICES_BY_YEAR[year] || [];
      const cargo = yearOffices.includes(scope.cargo) ? scope.cargo : yearOffices[0];
      setScopeNotice(
        `A publicidade tem cobertura de 2018 a 2024. O recorte foi ajustado para ${year} · ${cargo}.`,
      );
      setScope((current) => ({ ...current, ano: year, cargo }));
    }
  }, [scope.ano, scope.cargo]);

  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const [focus, setFocus] = useState(null);
  const [candidate, setCandidate] = useState(null);

  // Uma candidatura de outro ano, cargo, UF ou município é descartada
  const person = candidateMatchesScope(candidate, scope) ? candidate : null;
  useEffect(() => {
    if (candidate && !person) setCandidate(null);
  }, [candidate, person]);

  useEffect(() => {
    const validOffices = OFFICES_BY_YEAR[scope.ano] || [];
    if (!validOffices.includes(scope.cargo)) return;
    const ac = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    setFocus(null);
    const query = buildDespesasQuery(scope, person);
    request('/bdr/q9/despesas?' + query, { signal: ac.signal, timeout: 45000 })
      .then((result) => {
        if (!ac.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!ac.signal.aborted)
          setError(
            'A consulta ao acervo não respondeu. Verifique se a API está ativa e tente novamente.',
          );
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [
    scope.ano,
    scope.cargo,
    scope.uf,
    scope.municipioId,
    scope.criterio,
    retry,
    person?.id_candidatura,
  ]);
  const groups = data?.grupos || [],
    categories = data?.categorias || [],
    summary = data?.resumo;
  const chosen = focus?.categoria
    ? categories.find((row) => row.grupo === focus.grupo && row.categoria === focus.categoria)
    : groups.find((row) => row.grupo === focus?.grupo);
  const spotlight = chosen || groups[0];
  const share =
    summary?.total_campanha > 0 ? (100 * summary.publicidade) / summary.total_campanha : null;
  const munLabel = scope.municipioNome ? ` (${scope.municipioNome})` : '';
  const placeText = `${scope.cargo.toLowerCase()} em ${scope.ano}${scope.uf ? ' no ' + scope.uf + munLabel : ' nas seis UFs'}`;
  const subject = person ? `na candidatura de ${person.nome}` : `em ${placeText}`;
  const lead = loading
    ? 'Calculando os investimentos deste recorte…'
    : error
      ? 'A consulta ao acervo está indisponível; ainda não é possível concluir sobre este recorte.'
      : !summary
        ? 'Ainda não há dados suficientes para descrever este recorte.'
        : !groups.length
          ? 'Não há publicidade identificada neste recorte.'
          : `${groups[0].grupo} concentra ${percent(groups[0].participacao)} da publicidade identificada ${subject}${person ? ` (${placeText})` : ''}.`;
  const change = (field, value) => setScope((current) => ({ ...current, [field]: value }));
  if (error)
    return (
      <section
        className="expo-publicity expo-story"
        aria-label="Investimentos em publicidade eleitoral"
      >
        <header className="expo-lead">
          <span className="expo-kicker">PUBLICIDADE ELEITORAL</span>
          <h2>O que move a campanha?</h2>
        </header>
        <p className="expo-reading-scope">
          {scope.ano} · {scope.cargo} · {scope.uf ? `${scope.uf}${munLabel}` : 'Seis UFs'}
        </p>
        <div className="expo-unavailable" role="alert">
          <p>Não foi possível consultar os dados de publicidade deste recorte.</p>
          <button onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button>
          {person && (
            <button onClick={() => setCandidate(null)}>Voltar a Todos os candidatos</button>
          )}
        </div>
      </section>
    );
  return (
    <section
      className="expo-publicity expo-story"
      aria-label="Investimentos em publicidade eleitoral"
    >
      <header className="expo-lead">
        <span className="expo-kicker">PUBLICIDADE ELEITORAL</span>
        <h2>O que move a campanha?</h2>
        <div className="expo-answer">
          <p className="expo-discovery" aria-live="polite">
            {lead}
          </p>
        </div>
      </header>
      <p className="expo-reading-scope">
        Recorte: {scope.ano} · {scope.cargo} ·{' '}
        {scope.uf ? `${scope.uf}${munLabel}` : 'CE, MA, MS, RJ, RN e RS'} ·{' '}
        {person ? `candidatura: ${candidateLabel(person)}` : 'todos os candidatos'} · valores
        contratados
      </p>
      {scopeNotice && (
        <p className="expo-reading-scope" role="status">
          {scopeNotice}
        </p>
      )}
      <div className="expo-publicity-filters">
        <label>
          Ano
          <select
            value={scope.ano}
            onChange={(event) => {
              const year = Number(event.target.value);
              const validOffices = OFFICES_BY_YEAR[year] || [];
              const cargo = validOffices.includes(scope.cargo) ? scope.cargo : validOffices[0];
              setScope((current) => ({
                ...current,
                ano: year,
                cargo,
              }));
            }}
          >
            {[2024, 2022, 2020, 2018].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cargo
          <select
            value={scope.cargo}
            onChange={(event) => {
              const newCargo = event.target.value;
              const newYear = getCompatibleYear(newCargo, scope.ano);
              setScope((current) => ({
                ...current,
                cargo: newCargo,
                ano: newYear,
              }));
            }}
          >
            <optgroup label="Eleições Municipais (2024, 2020)">
              {ALL_OFFICES.filter((o) => o.grupo === 'Eleições Municipais').map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Eleições Gerais (2022, 2018)">
              {ALL_OFFICES.filter((o) => o.grupo === 'Eleições Gerais').map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label>
          Estado
          <select
            value={scope.uf}
            onChange={(event) => {
              const uf = event.target.value;
              setScope((current) => ({
                ...current,
                uf,
                municipioId: '',
                municipioNome: '',
              }));
            }}
          >
            <option value="">Seis UFs</option>
            {ufs.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
        <label>
          Município
          <select
            value={scope.municipioId || ''}
            onChange={(event) => {
              const id = event.target.value;
              const found = towns.find((t) => String(t.id) === String(id));
              setScope((current) => ({
                ...current,
                municipioId: id,
                municipioNome: found?.nome || '',
              }));
            }}
            disabled={!scope.uf || townsLoading}
          >
            <option value="">
              {!scope.uf
                ? 'Selecione um estado'
                : townsLoading
                  ? 'Carregando municípios…'
                  : 'Todos os municípios'}
            </option>
            {towns.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
        <CandidateSearch
          scope={scope}
          value={person}
          onSelect={setCandidate}
          onClear={() => setCandidate(null)}
        />
      </div>
      {error && (
        <p className="expo-unavailable" role="alert">
          {error} <button onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button>
        </p>
      )}
      <div className="expo-publicity-metrics" aria-busy={loading}>
        <article>
          <span>PUBLICIDADE IDENTIFICADA ↗</span>
          <strong>{loading ? '…' : money(summary?.publicidade)}</strong>
          <p>Valor contratado nas categorias selecionadas</p>
        </article>
        <article>
          <span>PARCELA DAS DESPESAS ◔</span>
          <strong>{loading ? '…' : percent(share)}</strong>
          <p>
            Publicidade identificada em relação às despesas totais declaradas
            {person ? ' desta candidatura' : ' do recorte'}
            {summary ? ` · ${money(summary.total_campanha)} em despesas totais` : ''}
          </p>
        </article>
        <article>
          <span>CANDIDATURAS COM PUBLICIDADE ♧</span>
          <strong>{loading ? '…' : number(summary?.candidaturas)}</strong>
          <p>Cada candidatura é contada uma vez.</p>
        </article>
      </div>
      <div className="expo-publicity-sections">
        <section>
          <span className="expo-kicker">O PESO DE CADA CATEGORIA</span>
          <h3>Categorias em destaque</h3>
          <p>
            Valor contratado por categoria de publicidade identificada
            {person ? ` em ${person.nome}` : ' neste recorte'}. Escolha uma palavra para conferir o
            valor e a participação.
          </p>
          {loading ? (
            <p role="status">
              Organizando as categorias… Calculando os valores de {scope.cargo.toLowerCase()} em{' '}
              {scope.ano}.
            </p>
          ) : error ? (
            <p role="status">A nuvem aguarda a consulta ao acervo.</p>
          ) : categories.length ? (
            <PublicityCloud
              rows={categories}
              selectedKey={focus?.categoria ? focus.grupo + '::' + focus.categoria : null}
              onSelect={(row) =>
                setFocus(row ? { grupo: row.grupo, categoria: row.categoria } : null)
              }
            />
          ) : (
            <p>Não há categorias de publicidade identificada neste recorte.</p>
          )}
        </section>
        <section className="expo-publicity-focus">
          <span className="expo-kicker">
            {focus ? 'SEU RECORTE EM DESTAQUE' : 'MAIOR CONCENTRAÇÃO'}
          </span>
          <h3>
            {loading
              ? 'Lendo os investimentos…'
              : spotlight?.categoria || spotlight?.grupo || 'Nenhum tipo identificado'}
          </h3>
          <strong>{loading ? '—' : money(spotlight?.valor)}</strong>
          <p>contratados {focus?.categoria ? 'nesta categoria' : 'neste tipo de publicidade'}</p>
          <b>{loading ? '—' : percent(spotlight?.participacao)}</b>
          <p>do investimento em publicidade identificada</p>
          <small>Candidaturas: {loading ? '—' : number(spotlight?.candidaturas)}</small>
          <p>Clique em uma palavra ou em um tipo abaixo para explorar o valor investido.</p>
          {focus && <button onClick={() => setFocus(null)}>Ver todos os tipos ↗</button>}
        </section>
      </div>
      <section className="expo-publicity-distribution">
        <span className="expo-kicker">INVESTIMENTO EM PERSPECTIVA</span>
        <h3>Como os gastos se distribuem</h3>
        <p>Participação de cada tipo no valor contratado em publicidade.</p>
        <small>{groups.length} tipos</small>
        <ol className="expo-publicity-bars" aria-label="Participação das categorias de publicidade">
          {groups.map((row) => (
            <li key={row.grupo}>
              <button
                type="button"
                aria-pressed={focus?.grupo === row.grupo}
                onClick={() => setFocus({ grupo: row.grupo })}
              >
                <span>
                  <strong>{row.grupo}</strong>
                  <b>{money(row.valor)}</b>
                </span>
                <i aria-hidden="true">
                  <em style={{ width: `${Math.min(100, Math.max(0, row.participacao || 0))}%` }} />
                </i>
                <small>{percent(row.participacao)} da publicidade identificada</small>
              </button>
            </li>
          ))}
          {!groups.length && (
            <li>{loading ? 'Carregando valores…' : 'Sem valores identificados neste recorte.'}</li>
          )}
        </ol>
      </section>
      <PublicityComparison
        scope={scope}
        person={person}
        onSelect={setCandidate}
        onClear={() => setCandidate(null)}
      />
      <Explore title="Classificação, cobertura e registros">
        <label>
          <input
            type="checkbox"
            checked={scope.criterio === 'explicitas'}
            onChange={(event) =>
              change('criterio', event.target.checked ? 'explicitas' : 'sugeridas')
            }
          />{' '}
          Mostrar somente classificações explícitas
        </label>
        <p>
          As categorias são sugestões analíticas derivadas das descrições das despesas, não
          categorias oficiais do TSE. Valores contratados não significam valores pagos.{' '}
          {summary &&
            `${money(summary.em_revisao)} da publicidade exibida depende de classificação textual em revisão; ${number(summary.sem_valor)} registros não têm valor monetário válido.`}
        </p>
        <p>
          Fonte: despesas declaradas à Justiça Eleitoral no acervo. Cobertura: CE, MA, MS, RJ, RN e
          RS.
        </p>
      </Explore>
    </section>
  );
}
