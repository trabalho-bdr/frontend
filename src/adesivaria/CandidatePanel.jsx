import { useEffect, useMemo, useRef, useState } from 'react';
import { getAdesivariaCandidate } from '../data/client.js';
import { MATERIALS, candidateScope, money, num, offlineDetail } from './model.js';
import { Pagination } from './RankingList.jsx';

export default function CandidatePanel({
  candidate,
  scope,
  live,
  onClose,
  onOpenCandidate,
  onOpenRecord,
}) {
  const dialog = useRef(null),
    [offset, setOffset] = useState(0),
    [state, setState] = useState(null);
  const key = JSON.stringify([candidate.id, scope, offset]);
  const offline = useMemo(
    () => (live ? null : offlineDetail(candidate.id, scope, offset)),
    [key, live],
  );
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    getAdesivariaCandidate(
      candidate.id,
      { ...scope, limit: 10, offset },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, error: true });
      });
    return () => controller.abort();
  }, [key, live]);
  const current = state?.key === key ? state : null,
    data = live ? current?.data : offline,
    c = data?.candidate || candidate;
  return (
    <dialog
      ref={dialog}
      className="ar-dialog"
      aria-labelledby="ar-candidate-name"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="ar-dialog-paper">
        <header>
          <span className="ar-kicker">
            FICHA DE INVESTIGAÇÃO / {live ? 'ACERVO CONSULTADO' : 'AMOSTRA PARCIAL'}
          </span>
          <button autoFocus onClick={onClose} aria-label="Fechar ficha da candidatura">
            ×
          </button>
        </header>
        <p className="ar-ballot">
          Nº {c.numero ?? '—'} / {c.partido || 'Partido não informado'}
        </p>
        <h2 id="ar-candidate-name">{c.nome}</h2>
        <p className="ar-scope">{candidateScope(c)}</p>
        {live && !current ? (
          <p role="status">Conferindo os lançamentos desta candidatura…</p>
        ) : current?.error ? (
          <p role="alert">Consulta da ficha indisponível. Feche e abra novamente para tentar.</p>
        ) : (
          <>
            <section className="ar-candidate-materials">
              <h3>OS MATERIAIS DECLARADOS</h3>
              <p>
                {live
                  ? 'Categorias reconhecidas nos lançamentos do 1º turno.'
                  : 'Somente os lançamentos parciais da amostra; não são o total gasto em materiais.'}
              </p>
              <dl>
                {Object.entries(MATERIALS)
                  .filter(([key]) => key !== 'todos')
                  .map(([key, label]) => {
                    const row = data?.groups.find((group) => group.tipo === label);
                    return (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>
                          {row ? money(row.valor) : 'Nenhum lançamento carregado'}
                          <small>
                            {row
                              ? `${num(row.registros)} lançamentos · ${num(row.valores_informados)} com valor`
                              : 'Não significa gasto zero'}
                          </small>
                        </dd>
                      </div>
                    );
                  })}
              </dl>
            </section>
            <div className="ar-candidate-totals">
              <div>
                <span>NO MATERIAL SELECIONADO</span>
                <strong>{money(c.gastos_classificados)}</strong>
                <small>
                  {num(c.lancamentos)} lançamentos · {MATERIALS[scope.material]}
                </small>
              </div>
              <div>
                <span>DESPESA TOTAL DE CAMPANHA</span>
                <strong>{money(c.gastos)}</strong>
                <small>Indicador distinto; não é a soma somente destes materiais.</small>
              </div>
            </div>
            <dl className="ar-election-details">
              <div>
                <dt>Votos · 1º turno</dt>
                <dd>{num(c.votos)}</dd>
              </div>
              <div>
                <dt>Resultado · 1º turno</dt>
                <dd>{c.resultado || 'Indefinido / não informado'}</dd>
              </div>
              <div>
                <dt>Posição por despesas no recorte</dt>
                <dd>{c.posicao_gastos ? `${c.posicao_gastos}º` : 'Sem valor para ranking'}</dd>
              </div>
              <div>
                <dt>Posição por votos no recorte</dt>
                <dd>{c.posicao_votos ? `${c.posicao_votos}º` : 'Sem votação para ranking'}</dd>
              </div>
            </dl>
            {c.conflito_resultado && (
              <p className="ar-note">
                Há resultados conflitantes na fonte; valores conflitantes não foram somados nem
                escolhidos arbitrariamente.
              </p>
            )}
            <section className="ar-ledger">
              <h3>O QUE ENTROU NESTA CONTA?</h3>
              <p>
                Descrições originais dos lançamentos classificados no material selecionado. São
                registros de despesas, não notas fiscais nem comprovantes.
              </p>
              {data?.entries.length ? (
                <ul>
                  {data.entries.map((entry) => (
                    <li key={entry.id}>
                      <span>
                        {entry.categoria}
                        <small>{entry.tipo}</small>
                      </span>
                      <strong>{money(entry.valor)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum lançamento incluído neste material. Não se presume despesa zero.</p>
              )}
              <Pagination
                offset={offset}
                total={data?.total || 0}
                limit={10}
                onChange={setOffset}
                label="Páginas dos lançamentos da ficha"
              />
            </section>
          </>
        )}
        <p className="ar-note">
          Gastos e votos são indicadores distintos. Sua comparação não demonstra causalidade.
        </p>
        <div className="ar-dialog-links">
          <button
            onClick={() => {
              onClose();
              onOpenRecord?.(c);
            }}
          >
            FICHA NO ARQUIVO ↗
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenCandidate?.(c);
            }}
          >
            PRESTAÇÃO DE CONTAS ↗
          </button>
        </div>
      </div>
    </dialog>
  );
}
