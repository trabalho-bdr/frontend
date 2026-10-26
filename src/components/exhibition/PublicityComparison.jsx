import { useEffect, useState } from 'react';
import { request } from '../../data/client.js';
import CandidateSearch from './CandidateSearch.jsx';
import { isMunicipalOffice } from './publicityScope.js';
import {
  biggestChanges,
  comparisonQuery,
  currentComparison,
  formatMoney as money,
  formatPercent as percent,
  formatPoints,
  modalityColour,
} from './publicityComparison.js';

const number = (value) => (value == null ? '—' : Number(value).toLocaleString('pt-BR'));
const supported = [
  'VEREADOR',
  'PREFEITO',
  'DEPUTADO ESTADUAL',
  'DEPUTADO FEDERAL',
  'SENADOR',
  'GOVERNADOR',
  'PRESIDENTE',
];

function ElectionCard({ row, mode }) {
  const person = row.candidato;
  return (
    <article className="q9-election-card">
      <h4>Eleição de {row.ano}</h4>
      {!row.presente ? (
        <p>Sem candidatura neste recorte. Ausência não representa derrota.</p>
      ) : (
        <>
          {mode === 'candidato' && (
            <p>
              <b>{person?.nome || 'Nome não disponível'}</b>
              <br />
              {person?.partido || 'Partido não informado'} ·{' '}
              {person?.resultado || 'Resultado desconhecido'}
              <br />
              Votos disponíveis: {number(person?.votos)}
            </p>
          )}
          <dl>
            <div>
              <dt>Publicidade identificada</dt>
              <dd>{money(row.publicidade)}</dd>
            </div>
            <div>
              <dt>Despesa total de campanha</dt>
              <dd>{money(row.total_campanha)}</dd>
            </div>
            {mode === 'partido' && (
              <>
                <div>
                  <dt>Candidaturas</dt>
                  <dd>{number(row.candidaturas)}</dd>
                </div>
                <div>
                  <dt>Com resultado conhecido</dt>
                  <dd>{number(row.resultado?.analisadas)}</dd>
                </div>
                <div>
                  <dt>Eleitas</dt>
                  <dd>{number(row.resultado?.eleitas)}</dd>
                </div>
                <div>
                  <dt>Taxa de eleição</dt>
                  <dd>{percent(row.resultado?.taxa)}</dd>
                </div>
                <div>
                  <dt>Gasto médio por candidatura com despesa conhecida</dt>
                  <dd>{money(row.gasto_medio)}</dd>
                </div>
              </>
            )}
          </dl>
          {mode === 'partido' && (
            <p className="q9-coverage">
              Média: despesa conhecida ÷ {number(row.com_despesas)} candidaturas com valores
              válidos. Taxa: {number(row.resultado?.eleitas)} eleitas ÷{' '}
              {number(row.resultado?.analisadas)} com resultado conhecido.
            </p>
          )}
          <p className="q9-coverage">
            Cobertura: {number(row.cobertura?.com_valor)} de {number(row.cobertura?.despesas)}{' '}
            despesas com valor válido; {number(row.cobertura?.sem_valor)} sem valor;{' '}
            {number(row.sem_despesas)} candidaturas sem despesa conhecida;{' '}
            {number(row.sem_resultado)} sem resultado conhecido.
          </p>
          {!!row.cobertura?.sem_valor && (
            <p>Valores monetários parciais: despesas sem valor não foram convertidas em zero.</p>
          )}
          {!!row.cobertura?.ajustes_negativos && (
            <p>{number(row.cobertura.ajustes_negativos)} ajustes negativos preservados.</p>
          )}
          {!!row.em_revisao && <p>Classificação em revisão: {money(row.em_revisao)}.</p>}
        </>
      )}
    </article>
  );
}

function Composition({ row }) {
  return (
    <div className="q9-composition">
      <b>
        {row.ano} · publicidade identificada: {money(row.publicidade)}
      </b>
      {row.composicao_valida ? (
        <div
          className="q9-composition-track"
          role="img"
          aria-label={`Composição de ${row.ano}: ${row.grupos.map((g) => `${g.grupo} ${percent(g.participacao)}`).join('; ')}`}
        >
          {row.grupos
            .filter((g) => g.participacao > 0)
            .map((g) => (
              <span
                key={g.grupo}
                title={`${g.grupo}: ${percent(g.participacao)}`}
                style={{ width: `${g.participacao}%`, background: modalityColour(g.grupo) }}
              />
            ))}
        </div>
      ) : (
        <p className="q9-coverage">
          {row.grupos.some((g) => g.valor < 0)
            ? 'Há modalidades com saldo negativo. Os valores e participações estão na tabela; a barra de 100% não se aplica.'
            : 'Sem base completa e positiva para uma barra de 100%. Consulte os valores disponíveis na tabela.'}
        </p>
      )}
    </div>
  );
}

export default function PublicityComparison({ scope, person, onSelect, onClear }) {
  const [mode, setMode] = useState('partido');
  const [party, setParty] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [selection, setSelection] = useState(null);
  const [state, setState] = useState(null);
  const [retry, setRetry] = useState(0);
  const municipal = isMunicipalOffice(scope.cargo);
  const metaQuery = new URLSearchParams({ cargo: scope.cargo });
  const effectiveUf = scope.uf || (mode === 'candidato' ? person?.uf : '');
  const effectiveTown = scope.municipioId || (mode === 'candidato' ? person?.id_municipio : '');
  if (effectiveUf) metaQuery.set('uf', effectiveUf);
  if (municipal && effectiveTown) metaQuery.set('id_municipio', effectiveTown);
  const metaKey = metaQuery.toString();
  const validOffice = supported.includes(scope.cargo);
  useEffect(() => {
    if (!validOffice) return;
    const ac = new AbortController();
    request('/bdr/q9/partidos?' + metaKey, { signal: ac.signal, timeout: 45000 })
      .then((data) => {
        if (!ac.signal.aborted) setMetadata({ key: metaKey, data });
      })
      .catch(() => {
        if (!ac.signal.aborted) setMetadata({ key: metaKey, error: true });
      });
    return () => ac.abort();
  }, [metaKey, validOffice, retry]);
  const meta = metadata?.key === metaKey ? metadata : null;
  const years = [...(meta?.data?.anos || [])].sort((a, b) => a - b);
  const parties = meta?.data?.partidos || [];
  const activeParty = parties.some((p) => p.id_partido === party) ? party : '';
  const selected =
    selection?.key === metaKey && selection.years.every((y) => years.includes(y))
      ? selection.years
      : [years[0], years.at(-1)];
  const [before, after] = selected;
  const key =
    validOffice && years.length >= 2
      ? comparisonQuery({ scope, mode, party: activeParty, person, before, after })
      : null;
  useEffect(() => {
    if (!key) return;
    const ac = new AbortController();
    setState({ key, loading: true });
    request('/bdr/q9/evolucao?' + key, { signal: ac.signal, timeout: 45000 })
      .then((data) => {
        if (!ac.signal.aborted) setState({ key, data });
      })
      .catch(() => {
        if (!ac.signal.aborted) setState({ key, error: true });
      });
    return () => ac.abort();
  }, [key, retry]);
  const current = currentComparison(state, key);
  const data = current?.data;
  const comparison = data?.comparacao;
  const changes = biggestChanges(comparison?.modalidades || []);
  return (
    <section className="expo-publicity-history q9-comparison" aria-labelledby="q9-comparison-title">
      <span className="expo-kicker">ESTRATÉGIA ENTRE ELEIÇÕES</span>
      <h3 id="q9-comparison-title">Mudanças na publicidade e desempenho eleitoral</h3>
      <p>
        Compare duas eleições no mesmo cargo e território. O ano dos filtros acima continua
        delimitando a nuvem. Valores monetários nominais.
      </p>
      <div className="expo-publicity-mode" role="group" aria-label="Modo de comparação">
        <button aria-pressed={mode === 'candidato'} onClick={() => setMode('candidato')}>
          Por candidato
        </button>
        <button aria-pressed={mode === 'partido'} onClick={() => setMode('partido')}>
          Por partido
        </button>
      </div>
      {!validOffice ? (
        <p>
          A comparação de resultado não está disponível para vices: o resultado depende da chapa.
        </p>
      ) : (
        <>
          <div className="q9-comparison-controls">
            <label>
              Eleição anterior
              <select
                value={before || ''}
                disabled={years.length < 2}
                onChange={(e) =>
                  setSelection({ key: metaKey, years: [Number(e.target.value), after] })
                }
              >
                {!years.length && <option value="">Carregando eleições…</option>}
                {years
                  .filter((y) => y < after)
                  .map((y) => (
                    <option key={y}>{y}</option>
                  ))}
              </select>
            </label>
            <label>
              Eleição posterior
              <select
                value={after || ''}
                disabled={years.length < 2}
                onChange={(e) =>
                  setSelection({ key: metaKey, years: [before, Number(e.target.value)] })
                }
              >
                {!years.length && <option value="">Carregando eleições…</option>}
                {years
                  .filter((y) => y > before)
                  .map((y) => (
                    <option key={y}>{y}</option>
                  ))}
              </select>
            </label>
            {mode === 'partido' ? (
              <label>
                Partido
                <select
                  value={activeParty}
                  disabled={!meta?.data}
                  onChange={(e) => setParty(e.target.value)}
                >
                  <option value="">
                    {!meta ? 'Carregando partidos…' : 'Selecione um partido'}
                  </option>
                  {parties.map((p) => (
                    <option key={p.id_partido} value={p.id_partido}>
                      {p.sigla} · {p.nome}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <CandidateSearch scope={scope} value={person} onSelect={onSelect} onClear={onClear} />
            )}
          </div>
          <p className="q9-coverage">
            Território:{' '}
            {(municipal && (scope.municipioNome || (mode === 'candidato' && person?.municipio))) ||
              scope.uf ||
              (mode === 'candidato' && person?.uf) ||
              'mesmas seis UFs'}{' '}
            · {scope.cargo}.
          </p>
          {meta?.error ? (
            <p role="alert">
              Não foi possível consultar as eleições e os partidos.{' '}
              <button onClick={() => setRetry((n) => n + 1)}>Tentar novamente</button>
            </p>
          ) : meta?.data && years.length < 2 ? (
            <p>Não há duas eleições disponíveis neste cargo e território.</p>
          ) : !key ? (
            <p>
              {mode === 'partido'
                ? 'Selecione um partido para comparar suas candidaturas.'
                : person
                  ? 'O município da candidatura não está disponível; selecione o território para comparar.'
                  : 'Escolha uma pessoa pela busca para comparar suas candidaturas.'}
            </p>
          ) : current?.error ? (
            <p role="alert">
              A comparação não pôde ser consultada.{' '}
              <button onClick={() => setRetry((n) => n + 1)}>Tentar novamente</button>
            </p>
          ) : !data ? (
            <p role="status">Comparando investimentos e resultados eleitorais…</p>
          ) : (
            <>
              <div className="q9-election-cards">
                {data.serie.map((row) => (
                  <ElectionCard key={row.ano} row={row} mode={mode} />
                ))}
              </div>
              {mode === 'candidato' && (
                <p className="q9-comparison-outcome">
                  <b>{comparison.desempenho}.</b> {comparison.reeleicao.rotulo}. Vitórias
                  consecutivas não comprovam exercício de mandato ou tentativa de reeleição. Votos
                  são apresentados sem percentual: não há denominador validado da mesma disputa.
                </p>
              )}
              <div className="q9-deltas">
                {[
                  ['publicidade', 'Publicidade identificada'],
                  ['total_campanha', 'Despesa total de campanha'],
                ].map(([field, label]) => (
                  <p key={field}>
                    <b>{label}:</b> variação absoluta {money(comparison[field].absoluta)} · variação
                    percentual{' '}
                    {comparison[field].sem_base
                      ? 'sem base de comparação'
                      : percent(comparison[field].percentual)}
                    .
                  </p>
                ))}
              </div>
              <div className="q9-compositions">
                {data.serie.map((row) => (
                  <Composition key={row.ano} row={row} />
                ))}
              </div>
              <p className="q9-coverage">
                Um único nível: modalidades (grupos normalizados). Subcategorias não são somadas
                novamente. Cada participação usa a publicidade identificada do próprio ano.
              </p>
              <div
                className="q9-comparison-table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Composição por modalidade, com rolagem horizontal"
              >
                <table className="q9-comparison-table">
                  <caption>Publicidade por modalidade · valores nominais</caption>
                  <thead>
                    <tr>
                      <th scope="col">Modalidade</th>
                      <th scope="col">Valor {before}</th>
                      <th scope="col">Participação {before}</th>
                      <th scope="col">Valor {after}</th>
                      <th scope="col">Participação {after}</th>
                      <th scope="col">Mudança (p.p.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.modalidades.map((row) => (
                      <tr key={row.grupo}>
                        <th scope="row">
                          <i
                            className="q9-modality-dot"
                            style={{ background: modalityColour(row.grupo) }}
                          />
                          {row.grupo}
                        </th>
                        <td>{money(row.valor_antes)}</td>
                        <td>{percent(row.antes)}</td>
                        <td>{money(row.valor_depois)}</td>
                        <td>{percent(row.depois)}</td>
                        <td>{formatPoints(row.delta_pp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!comparison.modalidades.length && (
                <p>Não há modalidades de publicidade identificadas nos dados disponíveis.</p>
              )}
              <div className="q9-change-notes" aria-label="Maiores mudanças">
                {changes.length ? (
                  changes.map((row) => (
                    <p key={row.grupo}>
                      <b>{row.grupo}</b> {row.delta_pp > 0 ? 'aumentou' : 'reduziu'} sua
                      participação em {formatPoints(Math.abs(row.delta_pp)).replace('+', '')}.
                    </p>
                  ))
                ) : (
                  <p>Não há mudança de participação calculável entre os dois anos.</p>
                )}
              </div>
            </>
          )}
          {mode === 'partido' && (
            <p>
              A composição das candidaturas pode mudar entre eleições. Taxa de eleição não é taxa de
              reeleição. Tentativas de reeleição: indicador indisponível, sem numerador e
              denominador confirmados. Siglas e identidades partidárias são preservadas.
            </p>
          )}
        </>
      )}
      <p>A comparação mostra mudanças e associações; não demonstra efeito causal.</p>
    </section>
  );
}
