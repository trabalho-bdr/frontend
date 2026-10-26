import { money, num, ratio, candidateScope, known, PAGE_SIZE } from './model.js';

export function Pagination({ offset, total, limit = PAGE_SIZE, onChange, label }) {
  return (
    <nav className="ar-pagination" aria-label={label}>
      <button disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
        ← ANTERIOR
      </button>
      <span>
        {total
          ? `${Math.floor(offset / limit) + 1} / ${Math.ceil(total / limit)}`
          : 'SEM REGISTROS'}
      </span>
      <button disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>
        PRÓXIMOS →
      </button>
    </nav>
  );
}
export default function RankingList({ rows, metric, maximum, onPick, offset, total, onPage }) {
  const expense = metric === 'gastos_classificados';
  return (
    <section
      className={`ar-ranking ${expense ? 'ar-expenses' : 'ar-votes'}`}
      aria-label={expense ? 'Ranking de gastos classificados' : 'Ranking de votos'}
    >
      <header>
        <span className="ar-kicker">
          {expense ? '01 / DESPESAS NO MATERIAL' : '02 / VOTOS DO RECORTE'}
        </span>
        <h3>{expense ? 'QUEM GASTOU MAIS' : 'QUEM RECEBEU MAIS VOTOS'}</h3>
        <p>
          {num(total)} candidaturas com {expense ? 'valor classificado' : 'votação'} informado
          {expense ? ' neste material.' : ', incluindo candidaturas sem material classificado.'}
        </p>
      </header>
      {rows.length ? (
        <ol start={offset + 1}>
          {rows.map((c) => (
            <li key={c.id}>
              <button
                className="ar-rank-row"
                onClick={() => onPick(c)}
                aria-label={`Abrir ficha de ${c.nome}, ${expense ? 'posição por gastos' : 'posição por votos'} ${c[expense ? 'posicao_gastos' : 'posicao_votos']}`}
              >
                <span className="ar-rank-position">
                  {c[expense ? 'posicao_gastos' : 'posicao_votos']}
                </span>
                <span className="ar-rank-content">
                  <strong>{c.nome}</strong>
                  <small>
                    {c.partido || 'Partido não informado'} · Nº {c.numero ?? '—'}
                  </small>
                  <small>{candidateScope(c)}</small>
                  <span className="ar-rank-value">
                    {expense ? money(c.gastos_classificados) : num(c.votos) + ' votos'}
                  </span>
                  <span className="ar-rank-track" aria-hidden="true">
                    <i style={{ width: ratio(c[metric], maximum) + '%' }} />
                  </span>
                  <span className="ar-rank-other">
                    {expense
                      ? `${num(c.votos)}${known(c.votos) ? ' votos' : ''} · ${c.posicao_votos ? `${c.posicao_votos}º na votação` : 'Sem posição por votos'}`
                      : `${money(c.gastos_classificados)}${known(c.gastos_classificados) ? ' no material' : ''} · ${c.posicao_gastos ? `${c.posicao_gastos}º nas despesas` : 'Sem posição por despesas'}`}
                  </span>
                </span>
                <span className="ar-open-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ar-empty-small">
          Nenhum valor conhecido neste ranking. Ausência de dados não significa zero.
        </p>
      )}
      <Pagination
        offset={offset}
        total={total}
        onChange={onPage}
        label={expense ? 'Páginas de gastos' : 'Páginas de votos'}
      />
    </section>
  );
}
