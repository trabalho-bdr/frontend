import { useEffect, useState } from 'react';
import { useCatalog } from '../../../catalog/useCatalog.jsx';
import { candidateContext, catalogQuery } from '../../../catalog/logic.js';
import TrajectoryChart from './TrajectoryChart.jsx';
import './trajectory.css';

export default function CandidateTrajectoryExplorer({ scope, onGo }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const scopeKey = catalogQuery({ ...scope, ano: '' });
  const results = useCatalog(
    'pessoas',
    { ...scope, ano: '', q: query, ordem: 'nome', limit: 8, offset: page * 8 },
    submitted,
  );
  const profile = useCatalog(
    'pessoas/' + encodeURIComponent(selected?.id_candidato || ''),
    {},
    !!selected,
  );
  useEffect(() => {
    setPage(0);
    setSelected(null);
  }, [scopeKey]);
  const rows = results.data?.rows || [];
  return (
    <section
      className="candidate-trajectory-explorer"
      aria-label="Pesquisar candidato e analisar sua trajetória"
    >
      <h4>Pesquise um candidato para analisar a trajetória</h4>
      <p>
        Busque pelo nome civil ou de urna. Os filtros de cargo, estado, município e partido
        selecionam candidatos que passaram por esse recorte em qualquer ano; o gráfico reúne todo o
        histórico disponível do candidato escolhido.
      </p>
      <form
        className="evidence-people-search"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim().length < 2) return;
          setQuery(text.trim());
          setSubmitted(true);
          setPage(0);
          setSelected(null);
          results.retry();
        }}
      >
        <label>
          Nome do candidato
          <input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Nome civil ou de urna"
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <button type="submit">Pesquisar candidatos</button>
      </form>
      {results.loading && <p role="status">Pesquisando candidatos…</p>}
      {results.error && (
        <div role="alert">
          <p>A busca não respondeu.</p>
          <button onClick={results.retry}>Tentar novamente</button>
        </div>
      )}
      {results.data && (
        <>
          <p role="status">
            {results.data.total}{' '}
            {results.data.total === 1 ? 'candidato encontrado' : 'candidatos encontrados'}.
          </p>
          {!rows.length && (
            <p>
              Nenhum candidato corresponde ao nome neste recorte. Experimente parte do nome ou
              ajuste os filtros acima.
            </p>
          )}
          <div className="trajectory-candidate-results">
            {rows.map((row) => (
              <button
                key={row.id_candidato}
                aria-pressed={selected?.id_candidato === row.id_candidato}
                onClick={() => setSelected(row)}
              >
                <strong>{row.nome_pessoa || row.nome}</strong>
                {row.nome_civil && <span>{row.nome_civil}</span>}
                <span>
                  {row.ultimo_cargo || row.cargo} · {row.ultima_sigla || row.partido} ·{' '}
                  {row.ultimo_municipio || row.ultima_uf || row.municipio || row.uf}
                </span>
                <span>
                  {row.primeiro_registro}–{row.ultimo_registro} · {row.participacoes} candidaturas
                </span>
                <b>Analisar trajetória →</b>
              </button>
            ))}
          </div>
          {results.data.total > 8 && (
            <nav className="exploration-pagination" aria-label="Páginas de candidatos">
              <button
                disabled={!page || results.loading}
                onClick={() => setPage((value) => value - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page + 1} de {Math.ceil(results.data.total / 8)}
              </span>
              <button
                disabled={(page + 1) * 8 >= results.data.total || results.loading}
                onClick={() => setPage((value) => value + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
      {selected && (
        <section aria-label="Análise do candidato selecionado" aria-busy={profile.loading}>
          {profile.loading && (
            <p role="status">Carregando a trajetória de {selected.nome_pessoa || selected.nome}…</p>
          )}
          {profile.error && (
            <div role="alert">
              <p>Não foi possível carregar a trajetória deste candidato.</p>
              <button onClick={profile.retry}>Tentar novamente</button>
            </div>
          )}
          {profile.data && (
            <>
              <TrajectoryChart
                key={selected.id_candidato}
                name={profile.data.pessoa?.nome || selected.nome_pessoa || selected.nome}
                rows={profile.data.candidaturas || []}
              />
              <button onClick={() => onGo('candidatos', 'perfil', '', candidateContext(selected))}>
                Abrir perfil completo e fontes →
              </button>
            </>
          )}
        </section>
      )}
    </section>
  );
}
