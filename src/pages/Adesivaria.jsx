import { electionYearsForOffice } from '../data/filterScope.js';
import RecordCollection from '../components/RecordCollection.jsx';
import { readContext, writeContext } from '../data/investigationContext.js';
import { useEffect, useMemo, useState } from 'react';
import PublicityInvestigation from '../components/exhibition/PublicityInvestigation.jsx';
import MaterialOverview from '../components/exhibition/MaterialOverview.jsx';
import { Explore } from '../components/exhibition/Story.jsx';
import ComparisonPanel from '../components/ComparisonPanel.jsx';
import { getMunicipios, states } from '../data/client.js';
import useRankings from '../adesivaria/useRankings.js';
import RankingList, { Pagination } from '../adesivaria/RankingList.jsx';
import CandidatePanel from '../adesivaria/CandidatePanel.jsx';
import {
  MATERIALS,
  PAGE_SIZE,
  offlineTowns,
  normalized,
  municipalOffice,
  num,
  money,
  known,
  ratio,
} from '../adesivaria/model.js';
import '../adesivaria/adesivaria.css';

const initial = {
  abrangencia: 'seis_estados',
  ano: '2024',
  cargo: 'VEREADOR',
  uf: '',
  municipio: '',
  partido: '',
  material: 'todos',
};
const firstPages = { offset: 0, offset_votos: 0, offset_categorias: 0, limit: PAGE_SIZE };

export default function Adesivaria({ mode, onOpenCandidate, onOpenRecord, materialsOnly = false }) {
  const [scope, setScope] = useState(() => ({
      ...initial,
      ...readContext(),
      municipio: readContext().municipioId || '',
      abrangencia: readContext().municipioId
        ? 'municipio'
        : readContext().uf
          ? 'estado'
          : 'seis_estados',
    })),
    [pages, setPages] = useState(firstPages),
    [sample, setSample] = useState(false),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(null);
  const [townSearch, setTownSearch] = useState(''),
    [townState, setTownState] = useState(null),
    [ranking, setRanking] = useState('gastos');

  const live = true;
  const { data, busy, error, waiting } = useRankings(scope, pages, live, revision);
  useEffect(() => {
    if (!live || scope.abrangencia !== 'municipio') return;
    let active = true;
    getMunicipios({ uf: scope.uf, limit: 1500 })
      .then((rows) => {
        if (active) setTownState({ uf: scope.uf, rows });
      })
      .catch(() => {
        if (active) setTownState({ uf: scope.uf, error: true, rows: [] });
      });
    return () => {
      active = false;
    };
  }, [live, scope.abrangencia, scope.uf, revision]);
  const towns = live
    ? townState?.uf === scope.uf
      ? townState.rows
      : []
    : offlineTowns.filter((town) => town.uf === scope.uf);
  const visibleTowns = useMemo(
    () =>
      towns.filter(
        (town) =>
          String(town.id) === scope.municipio ||
          normalized(`${town.nome} ${town.id}`).includes(normalized(townSearch)),
      ),
    [towns, townSearch, scope.municipio],
  );
  const change = (key, value) => {
    setScope((current) => {
      const next = { ...current, [key]: value };
      if (key === 'abrangencia') {
        next.uf = value === 'seis_estados' ? '' : current.uf || 'CE';
        next.municipio = '';
        if (value === 'municipio') {
          if (!municipalOffice(next.cargo)) next.cargo = 'VEREADOR';
          if (Number(next.ano) % 4) next.ano = String(Math.max(2004, Number(next.ano) - 2));
        }
      }
      if (key === 'uf') next.municipio = '';
      if (key === 'cargo' && !electionYearsForOffice(value).includes(Number(next.ano)))
        next.ano = String(electionYearsForOffice(value).at(-1));
      return next;
    });
    setPages(firstPages);
    setSelected(null);
    if (['abrangencia', 'uf'].includes(key)) setTownSearch('');
  };
  const townName = towns.find((town) => String(town.id) === scope.municipio)?.nome;
  const territory =
    scope.abrangencia === 'seis_estados'
      ? 'CE, MA, MS, RJ, RN e RS'
      : scope.abrangencia === 'municipio'
        ? `${townName || 'Selecione município'} / ${scope.uf}`
        : scope.uf;
  const caption = `${scope.ano} · ${scope.cargo} · ${territory} · 1º turno${scope.partido ? ' · ' + scope.partido : ''}`;
  const stats = data?.stats,
    maxExpense = data?.podium?.[0]?.gastos_classificados,
    maxVotes = stats?.maior_votacao;
  const setPage = (key, value) => {
    setPages((current) => ({ ...current, [key]: value }));
    setSelected(null);
  };
  const select = (key, label, options, disabled = false) => (
    <label key={key}>
      {label}
      <select
        aria-label={label}
        value={scope[key]}
        disabled={disabled}
        onChange={(event) => change(key, event.target.value)}
      >
        {options.map(([value, text, off]) => (
          <option value={value} key={value} disabled={off}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  const rankRows = ranking === 'gastos' ? data?.candidates || [] : data?.votes || [];
  return (
    <div className="adesivaria-ranking ar-editorial">
      {!materialsOnly && <PublicityInvestigation />}
      <Explore title="Investigar adesivos, santinhos e bandeiras">
        <p>
          Este recorte detalha três materiais específicos. Seus valores não representam toda a
          publicidade eleitoral.
        </p>
        <MaterialOverview
          data={data}
          caption={caption}
          busy={busy}
          error={error}
          waiting={waiting}
          retry={() => setRevision((value) => value + 1)}
        />
      </Explore>
      <Explore title="Conferir os dados e mudar o recorte">
        <section className="ar-filters" aria-label="Filtros da investigação">
          <p>
            Estes filtros alteram apenas os materiais, registros e rankings dos painéis abaixo. A
            análise geral de publicidade tem filtros próprios; confira o recorte de cada painel.
          </p>
          <div className="ar-filter-grid">
            {select('abrangencia', 'Abrangência', [
              ['seis_estados', 'Seis estados da base'],
              ['estado', 'Um estado'],
              ['municipio', 'Um município'],
            ])}
            {select(
              'uf',
              'Estado',
              [
                ['', 'CE · MA · MS · RJ · RN · RS'],
                ...states.map((state) => [state.uf, `${state.uf} · ${state.nome}`]),
              ],
              scope.abrangencia === 'seis_estados',
            )}
            {select(
              'ano',
              'Ano eleitoral',
              electionYearsForOffice(scope.cargo)
                .reverse()
                .map((year) => [String(year), String(year)]),
            )}
            {select(
              'cargo',
              'Cargo',
              [
                'VEREADOR',
                'PREFEITO',
                'DEPUTADO ESTADUAL',
                'DEPUTADO FEDERAL',
                'SENADOR',
                'GOVERNADOR',
              ].map((office) => [
                office,
                office,
                scope.abrangencia === 'municipio' && !municipalOffice(office),
              ]),
            )}
            <label>
              Partido
              <input
                aria-label="Partido"
                value={scope.partido}
                onChange={(event) => change('partido', event.target.value.toUpperCase())}
                placeholder="Todas as siglas"
                maxLength={35}
              />
            </label>
            {scope.abrangencia === 'municipio' && (
              <>
                <label className="ar-town-search">
                  Buscar município
                  <input
                    type="search"
                    aria-label="Buscar município"
                    placeholder="Fortaleza ou 2304400"
                    value={townSearch}
                    onChange={(event) => setTownSearch(event.target.value)}
                  />
                </label>
                {select('municipio', 'Município', [
                  ['', 'Selecione um município'],
                  ...visibleTowns.map((town) => [
                    String(town.id),
                    `${town.nome} / ${town.uf} · ${town.id}`,
                  ]),
                ])}
              </>
            )}
          </div>
          {scope.abrangencia === 'municipio' && (
            <p>
              O município é o local da candidatura. Despesas de disputas estaduais e federais não
              são atribuídas a ele.
            </p>
          )}
        </section>
        <div className="ar-provenance">
          <span className={live ? 'is-live' : ''}>
            {live ? 'BASE ELEITORAL CONSULTADA' : 'AMOSTRA DO ACERVO, PARCIAL'}
          </span>
          <p>
            {caption}.{' '}
            {live
              ? 'Dados dos seis estados disponíveis.'
              : 'Amostra local de candidaturas e lançamentos; não representa o conjunto inteiro.'}
          </p>
        </div>
        {data && (
          <>
            <p className="ar-editorial-counts">
              {num(stats.lancamentos)} lançamentos classificados no material em foco ·{' '}
              {num(stats.valores_informados)} com valor informado ·{' '}
              {num(stats.candidaturas_material)} candidaturas. Valores ausentes não são zero.
            </p>
            <RecordCollection
              title={`Descrições originais · ${MATERIALS[scope.material]} · ${caption}`}
              items={data.categories.map((row) => ({
                id: row.tipo + row.categoria,
                title: row.categoria,
                value: money(row.valor),
                subtitle: row.tipo,
                fields: [
                  {
                    label: 'Categoria padronizada',
                    value: row.categoria_normalizada || 'Não informada',
                  },
                  { label: 'Lançamentos', value: num(row.registros) },
                  {
                    label: 'Classificação',
                    value: row.requer_revisao
                      ? 'Requer revisão'
                      : 'Consulte as regras de classificação',
                  },
                ],
              }))}
            />
            <Pagination
              offset={pages.offset_categorias}
              total={stats.categorias}
              limit={25}
              onChange={(value) => setPage('offset_categorias', value)}
              label="Páginas de descrições incluídas"
            />
          </>
        )}
        {error && (
          <p role="alert">
            Não foi possível atualizar este recorte.{' '}
            <button onClick={() => setRevision((value) => value + 1)}>Tentar novamente</button>
          </p>
        )}
      </Explore>
      <Explore title="Investigar candidaturas e votos">
        <p>
          Selecione um material para investigar candidaturas. As três barras seguem identificadas
          pelo próprio recorte.
        </p>
        <div className="ar-material-picks" role="group" aria-label="Material para investigar">
          {Object.entries(MATERIALS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={scope.material === key}
              onClick={() => change('material', key)}
            >
              {label}
            </button>
          ))}
        </div>
        {data && (
          <>
            <p>
              {MATERIALS[scope.material]} · {caption}.{' '}
              {ranking === 'gastos'
                ? 'Candidaturas ordenadas pelo gasto classificado'
                : 'Candidaturas ordenadas pelos votos conhecidos'}
              .
            </p>
            <div className="ar-ranking-switch" role="group" aria-label="Ordenar candidaturas">
              <button aria-pressed={ranking === 'gastos'} onClick={() => setRanking('gastos')}>
                Maiores gastos
              </button>
              <button aria-pressed={ranking === 'votos'} onClick={() => setRanking('votos')}>
                Mais votos
              </button>
            </div>
            <RankingList
              rows={rankRows}
              metric={ranking === 'gastos' ? 'gastos_classificados' : 'votos'}
              maximum={ranking === 'gastos' ? maxExpense : maxVotes}
              onPick={setSelected}
              offset={ranking === 'gastos' ? pages.offset : pages.offset_votos}
              total={ranking === 'gastos' ? stats.candidaturas_valor : stats.candidaturas_votos}
              onPage={(value) => setPage(ranking === 'gastos' ? 'offset' : 'offset_votos', value)}
            />
            <p>
              Os rankings agregam disputas distintas quando o recorte inclui mais de um município.
              Gasto maior não demonstra efeito sobre votos.
            </p>
          </>
        )}
      </Explore>
      <Explore title="Examinar partidos e outros cruzamentos">
        {data && (
          <RecordCollection
            title={`Despesas por partido · ${MATERIALS[scope.material]} · ${caption}`}
            items={data.parties.map((row) => ({
              id: row.partido,
              title: row.partido,
              value: money(row.valor),
              bar: {
                value: row.valor,
                max: Math.max(...data.parties.map((item) => item.valor ?? 0)),
                label: `${row.partido}: ${money(row.valor)}`,
              },
              fields: [
                { label: 'Candidaturas com material', value: num(row.candidaturas) },
                { label: 'Lançamentos', value: num(row.lancamentos) },
              ],
            }))}
          />
        )}
        <ComparisonPanel topic="adesivos" mode={live ? 'live' : 'snapshot'} />
      </Explore>
      <Explore title="Entenda a classificação e seus limites">
        <p>
          {data?.methodology ||
            'A classificação específica reconhece nomes explícitos de adesivos, santinhos e bandeiras nas descrições das despesas.'}
        </p>
        <p>
          A nuvem aplica os rótulos normalizados dos painéis BDR a uma seleção das descrições
          originais de maior saldo positivo. As três barras usam todos os lançamentos elegíveis do
          recorte. Descrições ambíguas, itens mistos e serviços não equivalentes não são atribuídos
          automaticamente aos três materiais.
        </p>
        <p>
          {data?.turn_methodology || 'Valores nominais do primeiro turno no recorte selecionado.'}
        </p>
        <p>
          Fonte: Despesa_Candidatura, Candidatura, Eleicao, Municipio, Partido e
          Resultado_Candidatura do acervo eleitoral. Este documento editorial não é uma nota fiscal
          original.
        </p>
      </Explore>
      {selected && (
        <CandidatePanel
          key={selected.id + JSON.stringify(scope)}
          candidate={selected}
          scope={scope}
          live={live}
          onClose={() => setSelected(null)}
          onOpenCandidate={onOpenCandidate}
          onOpenRecord={onOpenRecord}
        />
      )}
    </div>
  );
}
