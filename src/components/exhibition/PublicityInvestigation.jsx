import '../record-collection.css';
import { useEffect, useState } from 'react';
import { useScope } from '../../data/investigationContext.js';
import { request } from '../../data/client.js';
import { Explore } from './Story.jsx';
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
const percent = (value) =>
  value == null ? '—' : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const ufs = ['CE', 'MA', 'MS', 'RJ', 'RN', 'RS'];
const offices = {
  2018: ['DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'SENADOR', 'GOVERNADOR'],
  2020: ['VEREADOR', 'PREFEITO'],
  2022: ['DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'SENADOR', 'GOVERNADOR'],
  2024: ['VEREADOR', 'PREFEITO'],
};

export default function PublicityInvestigation() {
  const [scope, setScope] = useScope({
    ano: 2024,
    cargo: 'VEREADOR',
    uf: '',
    criterio: 'sugeridas',
  });
  const [scopeNotice, setScopeNotice] = useState('');
  useEffect(() => {
    if (!offices[scope.ano]?.includes(scope.cargo)) {
      const year = ['VEREADOR', 'PREFEITO'].includes(scope.cargo) ? 2024 : 2022;
      const cargo = offices[year].includes(scope.cargo) ? scope.cargo : offices[year][0];
      setScopeNotice(
        'A publicidade tem cobertura de 2018 a 2024. O recorte incompatível foi ajustado para ' +
          year +
          ' · ' +
          cargo +
          '.',
      );
      setScope({ ano: year, cargo });
    }
  }, [scope.ano, scope.cargo]);
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const [focus, setFocus] = useState(null),
    [parties, setParties] = useState([]),
    [party, setParty] = useState(''),
    [history, setHistory] = useState(null),
    [historyLoading, setHistoryLoading] = useState(false);
  const [historyMode, setHistoryMode] = useState('partido'),
    [personQuery, setPersonQuery] = useState(''),
    [people, setPeople] = useState([]),
    [person, setPerson] = useState(null);

  const [partiesLoading, setPartiesLoading] = useState(true),
    [partiesError, setPartiesError] = useState(false),
    [historyError, setHistoryError] = useState(false);
  useEffect(() => {
    if (!offices[scope.ano]?.includes(scope.cargo)) return;
    const ac = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    setFocus(null);
    const query = new URLSearchParams({
      ano: String(scope.ano),
      cargo: scope.cargo,
      criterio: scope.criterio,
    });
    if (scope.uf) query.set('uf', scope.uf);
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
  }, [scope, retry]);
  useEffect(() => {
    const ac = new AbortController();
    setPartiesLoading(true);
    setPartiesError(false);
    setParties([]);
    setHistory(null);
    const query = new URLSearchParams({ cargo: scope.cargo });
    if (scope.uf) query.set('uf', scope.uf);
    request('/bdr/q9/partidos?' + query, { signal: ac.signal, timeout: 45000 })
      .then((result) => {
        if (!ac.signal.aborted) {
          setParties(result.partidos || []);
          setParty((current) =>
            (result.partidos || []).some((row) => String(row.id_partido) === String(current))
              ? current
              : '',
          );
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) setPartiesError(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setPartiesLoading(false);
      });
    return () => ac.abort();
  }, [scope.cargo, scope.uf, retry]);
  useEffect(() => {
    setPerson(null);
    setPeople([]);
    setPersonQuery('');
  }, [scope.ano, scope.cargo, scope.uf]);
  useEffect(() => {
    if (personQuery.trim().length < 2 || person) return;
    const ac = new AbortController();
    const timer = setTimeout(() => {
      const query = new URLSearchParams({
        ano: String(scope.ano),
        cargo: scope.cargo,
        busca: personQuery.trim(),
      });
      if (scope.uf) query.set('uf', scope.uf);
      request('/bdr/q9/candidatos?' + query, { signal: ac.signal, timeout: 45000 })
        .then((result) => {
          if (!ac.signal.aborted) setPeople(result.candidatos || []);
        })
        .catch(() => {
          if (!ac.signal.aborted) setPeople([]);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [personQuery, person, scope.ano, scope.cargo, scope.uf]);
  useEffect(() => {
    if ((historyMode === 'partido' && !party) || (historyMode === 'candidato' && !person)) {
      setHistory(null);
      setHistoryLoading(false);
      setHistoryError(false);
      return;
    }
    const ac = new AbortController();
    setHistoryLoading(true);
    setHistoryError(false);
    setHistory(null);
    const query = new URLSearchParams({ cargo: scope.cargo, criterio: scope.criterio });
    if (scope.uf) query.set('uf', scope.uf);
    query.set(
      historyMode === 'partido' ? 'id_partido' : 'id_candidato',
      historyMode === 'partido' ? party : person.id_candidato,
    );
    request('/bdr/q9/evolucao?' + query, { signal: ac.signal, timeout: 45000 })
      .then((result) => {
        if (!ac.signal.aborted) setHistory(result);
      })
      .catch(() => {
        if (!ac.signal.aborted) setHistoryError(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setHistoryLoading(false);
      });
    return () => ac.abort();
  }, [historyMode, party, person, scope.cargo, scope.uf, scope.criterio, retry]);
  const groups = data?.grupos || [],
    categories = data?.categorias || [],
    summary = data?.resumo;
  const chosen = focus?.categoria
    ? categories.find((row) => row.grupo === focus.grupo && row.categoria === focus.categoria)
    : groups.find((row) => row.grupo === focus?.grupo);
  const spotlight = chosen || groups[0];
  const words = categories
    .filter((row) => Number.isFinite(row.valor) && row.valor > 0)
    .slice(0, 24);
  const maximum = Math.max(1, ...words.map((row) => row.valor));
  const share =
    summary?.total_campanha > 0 ? (100 * summary.publicidade) / summary.total_campanha : null;
  const lead = loading
    ? 'Calculando os investimentos deste recorte…'
    : error
      ? 'A consulta ao acervo está indisponível; ainda não é possível concluir sobre este recorte.'
      : !summary
        ? 'Ainda não há dados suficientes para descrever este recorte.'
        : !groups.length
          ? 'Não há publicidade identificada neste recorte.'
          : `${groups[0].grupo} concentra ${percent(groups[0].participacao)} da publicidade identificada em ${scope.cargo.toLowerCase()} em ${scope.ano}${scope.uf ? ' no ' + scope.uf : ' nas seis UFs'}.`;
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
          {scope.ano} · {scope.cargo} · {scope.uf || 'Seis UFs'}
        </p>
        <div className="expo-unavailable" role="alert">
          <p>Não foi possível consultar os dados de publicidade deste recorte.</p>
          <button onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button>
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
        Recorte: {scope.ano} · {scope.cargo} · {scope.uf || 'CE, MA, MS, RJ, RN e RS'} · valores
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
              setScope((current) => ({
                ...current,
                ano: year,
                cargo: offices[year].includes(current.cargo) ? current.cargo : offices[year][0],
              }));
            }}
          >
            {[2024, 2022, 2020, 2018].map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
        <label>
          Cargo
          <select value={scope.cargo} onChange={(event) => change('cargo', event.target.value)}>
            {(offices[scope.ano] || []).map((cargo) => (
              <option key={cargo} value={cargo}>
                {cargo}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={scope.uf} onChange={(event) => change('uf', event.target.value)}>
            <option value="">Seis UFs</option>
            {ufs.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </label>
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
            Publicidade em relação às despesas do recorte
            {summary ? ` · ${money(summary.total_campanha)} no total` : ''}
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
            Palavras maiores representam valores maiores dentro da seleção mostrada. Escolha uma
            para conferir o valor contratado e sua participação.
          </p>
          {loading ? (
            <p role="status">
              Organizando as categorias… Calculando os valores de {scope.cargo.toLowerCase()} em{' '}
              {scope.ano}.
            </p>
          ) : error ? (
            <p role="status">A nuvem aguarda a consulta ao acervo.</p>
          ) : words.length ? (
            <div
              className="expo-cloud-words"
              aria-label="Categorias de publicidade por valor contratado"
            >
              {words.map((row) => (
                <button
                  type="button"
                  key={row.grupo + '::' + row.categoria}
                  className={`expo-cloud-word ${/santinh/i.test(row.grupo + ' ' + row.categoria) ? 'red' : /bandeir|faixa|banner/i.test(row.grupo) ? 'yellow' : 'blue'}`}
                  aria-pressed={focus?.categoria === row.categoria && focus.grupo === row.grupo}
                  onClick={() =>
                    setFocus((current) =>
                      current?.categoria === row.categoria && current?.grupo === row.grupo
                        ? null
                        : { grupo: row.grupo, categoria: row.categoria },
                    )
                  }
                  title={`${row.categoria} · ${money(row.valor)}`}
                  style={{ fontSize: `${16 + Math.round(20 * Math.sqrt(row.valor / maximum))}px` }}
                >
                  <span>{row.categoria}</span>
                  <small>{row.grupo}</small>
                </button>
              ))}
            </div>
          ) : (
            <p>Não há categorias com saldo positivo para esta nuvem.</p>
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
      <section className="expo-publicity-history">
        <span className="expo-kicker">ESTRATÉGIA ENTRE ELEIÇÕES</span>
        <h3>Estratégia publicitária e sucesso eleitoral</h3>
        <p>
          Compare os anos disponíveis no mesmo cargo e estado. O filtro de ano acima vale para a
          nuvem e a distribuição.
        </p>
        <div className="expo-publicity-mode">
          <button
            aria-pressed={historyMode === 'partido'}
            onClick={() => setHistoryMode('partido')}
          >
            Por partido
          </button>
          <button
            aria-pressed={historyMode === 'candidato'}
            onClick={() => setHistoryMode('candidato')}
          >
            Por candidato
          </button>
        </div>
        {historyMode === 'partido' ? (
          <label>
            Partido
            <select
              disabled={partiesLoading || partiesError}
              value={party}
              onChange={(event) => {
                setParty(event.target.value);
                setHistory(null);
                setHistoryError(false);
              }}
            >
              <option value="">
                {partiesLoading
                  ? 'Carregando partidos…'
                  : partiesError
                    ? 'Partidos indisponíveis'
                    : parties.length
                      ? 'Selecione um partido'
                      : 'Nenhum partido neste recorte'}
              </option>
              {parties.map((row) => (
                <option key={row.id_partido} value={row.id_partido}>
                  {row.sigla} · {row.nome}
                </option>
              ))}
            </select>
          </label>
        ) : person ? (
          <p>
            <strong>{person.nome}</strong> · {person.uf}{' '}
            <button onClick={() => setPerson(null)}>Trocar candidatura</button>
          </p>
        ) : (
          <div className="expo-publicity-person">
            <label>
              Pesquisar candidatura
              <input
                type="search"
                value={personQuery}
                onChange={(event) => setPersonQuery(event.target.value)}
                placeholder="Nome de urna ou nome civil"
              />
            </label>
            {people.length > 0 && (
              <div>
                {people.slice(0, 12).map((row) => (
                  <button
                    key={row.id_candidatura}
                    onClick={() => {
                      setPerson(row);
                      setPeople([]);
                    }}
                  >
                    {row.nome} · {row.partido} · {row.uf}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {partiesError && (
          <p role="alert">
            Não foi possível carregar os partidos.{' '}
            <button onClick={() => setRetry((n) => n + 1)}>Tentar novamente</button>
          </p>
        )}
        {historyError ? (
          <p role="alert">
            A série não pôde ser consultada.{' '}
            <button onClick={() => setRetry((n) => n + 1)}>Tentar novamente</button>
          </p>
        ) : historyLoading ? (
          <p role="status">Comparando investimentos e resultados eleitorais…</p>
        ) : history?.serie?.length ? (
          <div className="expo-publicity-years">
            {history.serie.map((row) => (
              <article key={row.ano}>
                <span>{row.ano}</span>
                <strong>{row.candidaturas ? money(row.publicidade) : 'Sem candidatura'}</strong>
                <p>Taxa de eleição: {percent(row.resultado?.taxa)}</p>
                <small>
                  {number(row.resultado?.eleitas)} eleitas de {number(row.resultado?.analisadas)}{' '}
                  com resultado definido
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p>
            {historyMode === 'partido' ? 'Selecione um partido' : 'Selecione uma candidatura'} para
            acompanhar a série disponível.
          </p>
        )}
        <p>
          A composição das candidaturas pode mudar entre eleições; diferenças de investimento não
          demonstram efeito causal na eleição.
        </p>
      </section>
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
