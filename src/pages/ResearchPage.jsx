import ExplorationWorkbench from '../components/exhibition/ExplorationWorkbench.jsx';
import ResearchCharts from '../components/exhibition/ResearchCharts.jsx';
import { questionDestinations } from '../data/exhibition.js';
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  describeCorrelation,
  linearTrend,
  detectOutliers,
  rateExtremes,
  shrinkRate,
} from '../data/exploration.js';
import { researchQuestions } from '../data/questions.js';
import { readContext, writeContext } from '../data/investigationContext.js';
import useResearchData from '../features/questions/shared/useResearchData.js';
import { useCatalog, displayNumber as num, displayMoney as money } from '../catalog/useCatalog.jsx';
import { emptyCatalogFilters } from '../catalog/logic.js';
import SearchSelect from '../catalog/SearchSelect.jsx';
import PartySelect from '../catalog/PartySelect.jsx';
import PartyHistory from '../catalog/PartyHistory.jsx';
import {
  Lead,
  Meaning,
  Explore,
  EvidenceRecords,
  Unavailable,
} from '../components/exhibition/Story.jsx';
import PublicityInvestigation from '../components/exhibition/PublicityInvestigation.jsx';
import useMotionPreference from '../hooks/useMotionPreference.js';
import '../catalog/candidate-explorer.css';
import '../catalog/acervo.css';
import './research.css';

import { getQuestion, describe } from '../features/questions/registry.js';
const fmt = (v, unit) =>
  v == null
    ? 'Não informado'
    : unit === 'money'
      ? money(v)
      : num(v) + (unit === 'percent' ? '%' : '');

export default function ResearchPage({ question, onGo, embedded = false }) {
  const q = Number(question) || 0,
    definition = researchQuestions.find((r) => r.id === q);
  if (!definition)
    return (
      <section className="research-index">
        <header className="catalog-heading">
          <span>AS DEZ PERGUNTAS / EVIDÊNCIAS DO ACERVO</span>
          <h1>Perguntas que guiam o arquivo.</h1>
          <p>
            Entre por uma pergunta. Confira a resposta, o recorte e o que os dados ainda não
            permitem concluir.
          </p>
        </header>
        <div className="research-question-grid">
          {researchQuestions.map((item) => (
            <article key={item.id}>
              <span className="research-number">{String(item.id).padStart(2, '0')}</span>
              <small>{item.theme}</small>
              <h2>{item.title}</h2>
              <p>{item.note}</p>
              <span className="research-status">{item.status}</span>
              <button onClick={() => onGo(...questionDestinations[item.id])}>
                Abrir pergunta →
              </button>
            </article>
          ))}
        </div>
        <p className="research-note">
          Cobertura parcial: CE, MA, MS, RJ, RN e RS. Uma ausência de associação também é um
          resultado; falta de dado não é zero.
        </p>
      </section>
    );
  return <Question key={q} q={q} definition={definition} onGo={onGo} embedded={embedded} />;
}

const MUNICIPAL_CARGOS = ['VEREADOR', 'PREFEITO', 'VICE-PREFEITO'];
const isMunicipalCargo = (c) => MUNICIPAL_CARGOS.includes(String(c || '').toUpperCase());

const Q_ALL_OFFICES_CARGOS = [
  { value: 'VEREADOR', label: 'Vereador', description: 'Eleições Municipais (2024, 2020)' },
  { value: 'PREFEITO', label: 'Prefeito', description: 'Eleições Municipais (2024, 2020)' },
  {
    value: 'DEPUTADO FEDERAL',
    label: 'Deputado Federal',
    description: 'Eleições Gerais (2022, 2018)',
  },
  {
    value: 'DEPUTADO ESTADUAL',
    label: 'Deputado Estadual',
    description: 'Eleições Gerais (2022, 2018)',
  },
  { value: 'SENADOR', label: 'Senador', description: 'Eleições Gerais (2022, 2018)' },
  { value: 'GOVERNADOR', label: 'Governador', description: 'Eleições Gerais (2022, 2018)' },
  {
    value: 'VICE-PREFEITO',
    label: 'Vice-Prefeito',
    description: 'Eleições Municipais (2024, 2020)',
  },
  {
    value: 'VICE-GOVERNADOR',
    label: 'Vice-Governador',
    description: 'Eleições Gerais (2022, 2018)',
  },
];

const Q_ALL_OFFICES_YEARS = [
  { value: '2024', label: '2024 · Eleições Municipais' },
  { value: '2022', label: '2022 · Eleições Gerais · em validação' },
  { value: '2020', label: '2020 · Eleições Municipais · em validação' },
  { value: '2018', label: '2018 · Eleições Gerais · em validação' },
];

function Question({ q, definition, onGo, embedded }) {
  const [initial] = useState(readContext);
  const allowed = getQuestion(q).allowedCargos;
  const initialCargo =
    allowed && !allowed.includes(initial.cargo) ? 'VEREADOR' : initial.cargo || 'VEREADOR';
  const initialYear = (() => {
    if (getQuestion(q).validatedYear) return '2024';
    if ([3, 6].includes(q)) {
      const isMun = isMunicipalCargo(initialCargo);
      if (isMun)
        return ['2024', '2020'].includes(String(initial.ano)) ? String(initial.ano) : '2024';
      return ['2022', '2018'].includes(String(initial.ano)) ? String(initial.ano) : '2022';
    }
    return initial.ano || '2024';
  })();
  const [cargo, setCargo] = useState(initialCargo);
  const [year, setYear] = useState(initialYear);
  const [uf, setUf] = useState(initial.uf || '');
  const [party, setParty] = useState(q === 7 ? '' : initial.partido || '');
  const [town, setTown] = useState(isMunicipalCargo(initialCargo) ? initial.municipioId || '' : '');
  const [metric, setMetric] = useState('populacao'),
    [target, setTarget] = useState(initial.partido ? 'participacao_partido' : 'abstencao'),
    [youth, setYouth] = useState('16_24'),
    [universe, setUniverse] = useState('18mais'),
    [focusedRecord, setFocusedRecord] = useState(null),
    [explorationMode, setExplorationMode] = useState(''),
    [costMetric, setCostMetric] = useState('valor'),
    [historico, setHistorico] = useState(false),
    [excluirZero, setExcluirZero] = useState(false),
    [taxaAjustada, setTaxaAjustada] = useState(false);
  const metaState = useCatalog('opcoes', { ano: year, uf, cargo }),
    meta = metaState.data;
  const years = [3, 6].includes(q)
    ? isMunicipalCargo(cargo)
      ? ['2024', '2020']
      : ['2022', '2018']
    : [
        ...new Set(
          (meta?.eleicoes || [])
            .filter((e) => e.cargo === cargo && (!uf || e.uf === uf))
            .map((e) => String(e.ano)),
        ),
      ];
  useEffect(() => {
    if (![3, 6].includes(q) && years.length && !years.includes(year)) setYear(years[0]);
  }, [years.join('|'), year, q]);
  useEffect(() => {
    if (q !== 9)
      writeContext({
        etapa: 'catalogo',
        ano: year,
        cargo,
        uf,
        partido: party,
        municipioId: town,
        municipioNome: town ? (meta?.municipios || []).find((m) => m.id === town)?.nome || '' : '',
      });
  }, [q, year, cargo, uf, party, town]);
  const query = new URLSearchParams({
    ano: year,
    cargo,
    uf,
    partido: party,
    municipio: town,
    metric,
    target,
    youth,
    universe,
    historico: historico ? '1' : '0',
    excluir_zero: excluirZero ? '1' : '0',
  }).toString();
  const [retry, setRetry] = useState(0),
    reduced = useMotionPreference();
  const state = useResearchData(q, query, retry);
  const data = state.data,
    rows = data?.rows || [],
    points = (data?.points || rows).filter((r) => r.x != null && r.y != null),
    summary = data?.summary;
  const plottablePoints = points.map((p) => ({
      ...p,
      z: Number.isFinite(p.eleitores) ? p.eleitores : 0,
    })),
    scatterTrend = linearTrend(points),
    scatterOutlierIds = new Set(
      [...detectOutliers(points, 'x'), ...detectOutliers(points, 'y')].map((p) => p.id ?? p.nome),
    ),
    scatterOutliers = plottablePoints.filter((p) => scatterOutlierIds.has(p.id ?? p.nome)),
    scatterNormal = plottablePoints.filter((p) => !scatterOutlierIds.has(p.id ?? p.nome));
  const explore = () => onGo(...definition.place);
  const openPeople = () => {
    const filters = {
      ...emptyCatalogFilters,
      ano: q === 10 ? '' : year,
      cargo,
      uf,
      partido: party,
      municipio: town,
    };
    onGo('candidatos', '', '', {
      ano: filters.ano,
      cargo,
      uf,
      partido: party,
      municipioId: town,
      catalogoEstado: JSON.stringify({ filters, order: 'recentes', page: 0 }),
    });
  };
  if (q === 9)
    return (
      <section className="research-detail">
        {!embedded && (
          <button className="catalog-back" onClick={() => onGo('perguntas')}>
            ← As dez perguntas
          </button>
        )}
        {!embedded && <p className="research-original">09 / {definition.original}</p>}
        <PublicityInvestigation />
        {!embedded && (
          <div className="research-actions">
            <button onClick={() => onGo('campanhas', 'publicidade', 'dinheiro')}>
              Investigar materiais na Adesivaria →
            </button>
          </div>
        )}
      </section>
    );
  const series =
    q === 1
      ? rows.map((r) => ({ ...r, valor: r[costMetric] }))
      : q === 7
        ? data?.series || []
        : rows;
  const chartUnit = q === 1 ? 'money' : data?.unit === 'volatility' ? 'percent' : 'percent';
  return (
    <section className="research-detail">
      {!embedded && (
        <button className="catalog-back" onClick={() => onGo('perguntas')}>
          ← As dez perguntas
        </button>
      )}
      <Lead
        kicker={
          embedded
            ? definition.theme.toUpperCase()
            : 'PERGUNTA ' + String(q).padStart(2, '0') + ' / ' + definition.theme.toUpperCase()
        }
        question={definition.title}
        discovery={
          state.loading
            ? 'Conferindo os dados deste recorte…'
            : state.error
              ? 'A consulta não respondeu. Nenhuma conclusão foi preenchida.'
              : describe(data, q)
        }
      />
      {definition.original && (
        <details className="research-original">
          <summary>Pergunta original da pesquisa</summary>
          <p>{definition.original}</p>
        </details>
      )}
      <div className="research-filters">
        <SearchSelect
          label={q === 10 ? 'Referência do recorte · série 2002–2024' : 'Ano da eleição'}
          value={year}
          options={
            [3, 6].includes(q)
              ? Q_ALL_OFFICES_YEARS
              : (years.length ? years : [year]).map((value) => ({
                  value,
                  label:
                    value +
                    (getQuestion(q).validatedYear && value !== '2024' ? ' · em validação' : ''),
                }))
          }
          onChange={(newYear) => {
            setYear(newYear);
            if ([3, 6].includes(q)) {
              const isMunYear = ['2024', '2020'].includes(newYear);
              const isMun = isMunicipalCargo(cargo);
              if (isMunYear && !isMun) {
                setCargo('VEREADOR');
                setTown('');
              } else if (!isMunYear && isMun) {
                setCargo('DEPUTADO FEDERAL');
                setTown('');
              }
            }
          }}
        />
        <SearchSelect
          label="Cargo"
          value={cargo}
          options={
            [3, 6].includes(q)
              ? Q_ALL_OFFICES_CARGOS
              : allowed || [...new Set((meta?.eleicoes || []).map((e) => e.cargo))]
          }
          onChange={(newCargo) => {
            setCargo(newCargo);
            setTown('');
            if ([3, 6].includes(q)) {
              const isMun = isMunicipalCargo(newCargo);
              if (isMun && !['2024', '2020'].includes(year)) {
                setYear('2024');
              } else if (!isMun && !['2022', '2018'].includes(year)) {
                setYear('2022');
              }
            }
          }}
        />
        <SearchSelect
          label="Estado"
          value={uf}
          options={[{ value: '', label: 'Seis estados' }, ...['CE', 'MA', 'MS', 'RJ', 'RN', 'RS']]}
          onChange={(v) => {
            setUf(v);
            setTown('');
          }}
        />
        <SearchSelect
          label="Município"
          value={town}
          options={[
            { value: '', label: 'Todos os municípios' },
            ...(meta?.municipios || []).map((m) => ({ value: m.id, label: m.nome })),
          ]}
          onChange={setTown}
          disabled={!uf || !isMunicipalCargo(cargo)}
        />
        {q !== 7 && (
          <PartySelect value={party} options={meta?.facets?.partido || []} onChange={setParty} />
        )}
        {q === 3 && (
          <>
            <SearchSelect
              label="Indicador municipal"
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'populacao', label: 'População · 2022' },
                { value: 'idhm', label: 'IDHM · referência 2010' },
                { value: 'idade_mediana', label: 'Idade mediana · 2022' },
                { value: 'indice_envelhecimento', label: 'Índice de envelhecimento · 2022' },
              ]}
            />
            <SearchSelect
              label="Relacionar com"
              value={target}
              onChange={setTarget}
              options={[
                { value: 'abstencao', label: 'Abstenção' },
                { value: 'participacao_partido', label: 'Participação do partido selecionado' },
              ]}
            />
          </>
        )}
        {q === 4 && (
          <SearchSelect
            label="Eleitorado de referência · distribuição"
            value={universe}
            onChange={setUniverse}
            options={[
              { value: '18mais', label: '18 anos ou mais' },
              { value: 'todos', label: 'Todas as idades eleitorais' },
            ]}
          />
        )}
        {q === 6 && (
          <SearchSelect
            label="Eleitorado jovem"
            value={youth}
            onChange={setYouth}
            options={[
              { value: '16_17', label: '16 e 17 anos' },
              { value: '18_24', label: '18 a 24 anos' },
              { value: '16_24', label: '16 a 24 anos' },
              { value: '16_29', label: '16 a 29 anos' },
            ]}
          />
        )}
        {q === 1 && (
          <SearchSelect
            label="Medida financeira"
            value={costMetric}
            onChange={setCostMetric}
            options={[
              { value: 'valor', label: 'Gasto de todos por eleito · nominal' },
              { value: 'corrigido', label: 'Gasto de todos por eleito · IPCA dez/2024' },
              { value: 'apenas_eleitos', label: 'Gasto apenas dos eleitos por eleito' },
              { value: 'mediana', label: 'Mediana individual dos eleitos' },
            ]}
          />
        )}
      </div>
      {q === 5 && (
        <label className="research-history-option">
          <input
            type="checkbox"
            checked={historico}
            onChange={(e) => setHistorico(e.target.checked)}
          />{' '}
          Acompanhar a mesma organização após mudança de nome · sem juntar fusões
        </label>
      )}
      {q === 2 && (
        <label className="research-history-option">
          <input
            type="checkbox"
            checked={excluirZero}
            onChange={(e) => setExcluirZero(e.target.checked)}
          />{' '}
          Desconsiderar candidaturas com patrimônio declarado igual a zero
        </label>
      )}
      <p className="research-scope">
        {q === 10 ? 'Série observada 2002–2024' : year} · {cargo} · {uf || 'Seis UFs'}
        {party ? ' · ' + party : ''}
        {town ? ' · município selecionado' : ''}.{' '}
        {q === 10
          ? 'Os filtros selecionam a coorte; a trajetória reúne seus cargos nas seis UFs.'
          : 'Eleições ordinárias; cobertura efetiva abaixo.'}
      </p>
      {party && <PartyHistory sigla={party} year={year} />}
      {(state.loading || state.error) && (
        <Unavailable loading={state.loading} retry={() => setRetry((n) => n + 1)} />
      )}
      {data && (
        <>
          <span className="research-status">
            {data.status === 'disponivel'
              ? definition.status
              : data.status === 'em_validacao'
                ? 'Dados em validação'
                : data.status === 'fonte_pendente'
                  ? 'Fonte adicional necessária'
                  : 'Resposta parcial · confira a cobertura'}
          </span>
          <ResearchCharts
            question={q}
            data={data}
            costMetric={costMetric}
            reduced={reduced}
            onInspect={setFocusedRecord}
          />
          {summary && (
            <dl className="research-summary">
              {Object.entries(summary)
                .filter(
                  ([key, value]) =>
                    value != null &&
                    typeof value !== 'object' &&
                    ![
                      'grupo',
                      'valor',
                      'corrigido',
                      'apenas_eleitos',
                      'pearson',
                      'spearman',
                    ].includes(key),
                )
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{summaryLabel(key)}</dt>
                    <dd>
                      {typeof value === 'number'
                        ? (q === 1 && ['total', 'gasto_eleitos', 'mediana'].includes(key)) ||
                          (q === 8 && ['publico', 'privado', 'nao_classificado'].includes(key))
                          ? money(value)
                          : key === 'ano'
                            ? String(value)
                            : num(value)
                        : value}
                    </dd>
                  </div>
                ))}
            </dl>
          )}
          {data.unit === 'distribution' && rows.length > 0 && (
            <figure className="research-chart">
              <figcaption>Escolaridade conhecida: candidaturas e eleitorado (%)</figcaption>
              <ResponsiveContainer width="100%" height={390}>
                <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 18 }}>
                  <CartesianGrid horizontal={false} stroke="#ded3bc" />
                  <XAxis type="number" unit="%" />
                  <YAxis type="category" dataKey="grupo" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => num(v) + '%'} />
                  <Legend />
                  <Bar
                    dataKey="valor"
                    name="Candidaturas"
                    fill="#173e78"
                    isAnimationActive={!reduced}
                  />
                  <Bar
                    dataKey="referencia"
                    name="Eleitorado"
                    fill="#24694f"
                    isAnimationActive={!reduced}
                  />
                </BarChart>
              </ResponsiveContainer>
            </figure>
          )}
          {['scatter', 'distribution'].includes(data.unit) && points.length > 0 && (
            <figure className="research-chart">
              <figcaption>
                {data.x_label} × {data.y_label}
              </figcaption>
              {describeCorrelation(summary?.pearson) && (
                <p className="money-chart-note">
                  {describeCorrelation(summary?.pearson)}
                  {summary?.n != null &&
                    ` Comparação com ${num(summary.n)} municípios que têm os dois valores conhecidos.`}
                </p>
              )}
              <ResponsiveContainer width="100%" height={350}>
                <ScatterChart margin={{ left: 6, right: 15, bottom: 30, top: 12 }}>
                  <CartesianGrid stroke="#ded3bc" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={data.x_label}
                    tickFormatter={(v) => num(v)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="number" dataKey="y" name={data.y_label} tick={{ fontSize: 11 }} />
                  <ZAxis dataKey="z" range={[50, 400]} name="Eleitorado do município" />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="research-tooltip">
                          <strong>
                            {payload[0].payload.nome} · {payload[0].payload.uf}
                          </strong>
                          <p>
                            {data.x_label}: {num(payload[0].payload.x)}
                          </p>
                          <p>
                            {data.y_label}: {num(payload[0].payload.y)}
                          </p>
                          {payload[0].payload.eleitores != null && (
                            <p>Eleitorado: {num(payload[0].payload.eleitores)}</p>
                          )}
                        </div>
                      ) : null
                    }
                  />
                  {data.comparable_axes &&
                    (() => {
                      const combined = points.flatMap((p) => [p.x, p.y]);
                      const minV = Math.min(...combined),
                        maxV = Math.max(...combined);
                      if (!Number.isFinite(minV) || !Number.isFinite(maxV) || minV === maxV)
                        return null;
                      return (
                        <ReferenceLine
                          segment={[
                            { x: minV, y: minV },
                            { x: maxV, y: maxV },
                          ]}
                          stroke="#a63c30"
                          strokeDasharray="4 4"
                          label={{
                            value: 'Mesmo valor nos dois grupos',
                            position: 'insideTopRight',
                            fontSize: 11,
                            fill: '#a63c30',
                          }}
                        />
                      );
                    })()}
                  {scatterTrend && (
                    <ReferenceLine
                      segment={[scatterTrend.from, scatterTrend.to]}
                      stroke="#173e78"
                      strokeWidth={2}
                      ifOverflow="extendDomain"
                      label={{
                        value: 'Tendência geral',
                        position: 'insideBottomRight',
                        fontSize: 11,
                        fill: '#173e78',
                      }}
                    />
                  )}
                  <Scatter
                    onClick={(point) => setFocusedRecord(point?.payload || point)}
                    data={scatterNormal}
                    fill="#245b4d"
                    fillOpacity={0.65}
                    isAnimationActive={!reduced}
                  />
                  {scatterOutliers.length > 0 && (
                    <Scatter
                      onClick={(point) => setFocusedRecord(point?.payload || point)}
                      data={scatterOutliers}
                      fill="#a63c30"
                      fillOpacity={0.85}
                      isAnimationActive={!reduced}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
              <p>
                Cada ponto é um município, com tamanho proporcional ao eleitorado. Eixo horizontal:{' '}
                {data.x_label}. Vertical: {data.y_label}.
              </p>
              {scatterOutliers.length > 0 && (
                <p className="money-chart-note">
                  Os pontos em vermelho têm valores bem acima ou abaixo dos demais municípios e
                  podem esticar a leitura do gráfico; passe o mouse sobre um deles para ver qual
                  município é.
                </p>
              )}
            </figure>
          )}
          {![1, 2, 5].includes(q) &&
            !['scatter', 'distribution'].includes(data.unit) &&
            series.length > 0 &&
            (() => {
              // Só para a pergunta 8: média geral (para a linha de
              // referência), destaque de amostra pequena e separação da
              // faixa "Origem incompleta", que não é um ponto da escala de
              // % público — é uma categoria de qualidade de dado à parte.
              const isFunding = q === 8;
              const totalCandidaturas = isFunding
                ? series.reduce((acc, r) => acc + (r.definidos || 0), 0)
                : 0;
              const totalEleitos = isFunding
                ? series.reduce((acc, r) => acc + (r.eleitos || 0), 0)
                : 0;
              const mediaGeral =
                isFunding && totalCandidaturas ? (100 * totalEleitos) / totalCandidaturas : null;
              const plotSeries = isFunding
                ? series.map((row) => {
                    const valorAjustado =
                      mediaGeral != null
                        ? shrinkRate(row.eleitos, row.definidos, mediaGeral)
                        : null;
                    return {
                      ...row,
                      valorBruto: row.valor,
                      valorAjustado,
                      valor: taxaAjustada && valorAjustado != null ? valorAjustado : row.valor,
                    };
                  })
                : series;
              const extremos = isFunding ? rateExtremes(plotSeries, ['Origem incompleta']) : null;
              const temIncompleta =
                isFunding && series.some((r) => r.grupo === 'Origem incompleta');
              return (
                <figure className="research-chart">
                  <figcaption>
                    {q === 1
                      ? 'Comparação financeira entre eleições equivalentes'
                      : q === 7
                        ? 'Mudança média na distribuição dos votos por par de eleições'
                        : q === 10
                          ? 'Padrões observados · categorias exclusivas'
                          : 'Comparação dos grupos · ' +
                            (q === 5 ? 'votos de legenda (%)' : 'taxa de eleição (%)')}
                  </figcaption>
                  {isFunding && (
                    <label className="research-history-option">
                      <input
                        type="checkbox"
                        checked={taxaAjustada}
                        onChange={(e) => setTaxaAjustada(e.target.checked)}
                      />{' '}
                      Ajustar pelo tamanho da amostra (puxa grupos pequenos para a média geral,
                      deixa grupos grandes quase inalterados)
                    </label>
                  )}
                  <ResponsiveContainer
                    width="100%"
                    height={Math.min(700, Math.max(250, series.length * 42))}
                  >
                    <BarChart data={plotSeries} layout="vertical" margin={{ left: 0, right: 25 }}>
                      <CartesianGrid horizontal={false} stroke="#ded3bc" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) =>
                          chartUnit === 'money' ? num(v / 1000) + ' mil' : num(v) + '%'
                        }
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis type="category" dataKey="grupo" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const row = payload[0].payload;
                          return (
                            <div className="research-tooltip">
                              <strong>{label}</strong>
                              {row.valorBruto != null ? (
                                <p>
                                  Taxa bruta: {num(row.valorBruto)}%
                                  {row.valorAjustado != null &&
                                    ` · Ajustada pela amostra: ${num(row.valorAjustado)}%`}
                                </p>
                              ) : (
                                <p>{fmt(payload[0].value, chartUnit)}</p>
                              )}
                              {row.candidaturas != null && (
                                <p>
                                  {num(row.eleitos ?? 0)} eleitos de{' '}
                                  {num(row.definidos ?? row.candidaturas)}{' '}
                                  {row.definidos != null
                                    ? 'com resultado definido'
                                    : 'candidaturas'}
                                </p>
                              )}
                            </div>
                          );
                        }}
                      />
                      {mediaGeral != null && (
                        <ReferenceLine
                          x={mediaGeral}
                          stroke="#173e78"
                          strokeDasharray="5 4"
                          label={{
                            value: `Média geral: ${num(mediaGeral)}%`,
                            position: 'top',
                            fontSize: 11,
                            fill: '#173e78',
                          }}
                        />
                      )}
                      <Bar
                        dataKey="valor"
                        name={q === 1 ? 'Valor' : 'Percentual'}
                        fill={q === 8 ? '#a63c30' : '#245b4d'}
                        isAnimationActive={!reduced}
                      >
                        {isFunding &&
                          plotSeries.map((row) => (
                            <Cell
                              key={row.grupo}
                              fill={
                                row.grupo === 'Origem incompleta'
                                  ? '#929b9c'
                                  : row.definidos != null && row.definidos < 30
                                    ? '#d9b98f'
                                    : '#a63c30'
                              }
                            />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {isFunding && (
                    <p className="money-chart-note">
                      {taxaAjustada
                        ? 'Taxa ajustada: cada grupo é tratado como se já tivesse 30 candidaturas extras na média geral do recorte, antes de calcular a taxa. Isso evita que grupos com poucas candidaturas pareçam artificialmente ótimos ou péssimos.'
                        : 'Taxa bruta: eleitos dividido por candidaturas com resultado definido, sem nenhum ajuste. Grupos pequenos podem parecer mais extremos do que realmente são — marque a opção acima para comparar de forma mais justa.'}
                    </p>
                  )}
                  {temIncompleta && (
                    <p className="money-chart-note">
                      A faixa em cinza ("Origem incompleta") não é um ponto da escala de
                      participação pública — é um grupo à parte, de candidaturas cuja origem da
                      receita não pôde ser classificada.
                    </p>
                  )}
                  {extremos && !extremos.semBase && extremos.percentual !== 0 && (
                    <p className="money-chart-note">
                      Candidaturas em "
                      {extremos.percentual > 0 ? extremos.hi.grupo : extremos.lo.grupo}" têm uma
                      taxa de eleição {num(Math.abs(extremos.percentual))}% maior que em "
                      {extremos.percentual > 0 ? extremos.lo.grupo : extremos.hi.grupo}".
                    </p>
                  )}
                  {extremos?.semBase && (
                    <p className="money-chart-note">
                      Não é possível comparar os extremos: "
                      {extremos.lo.valor === 0 ? extremos.lo.grupo : extremos.hi.grupo}" não teve
                      nenhuma candidatura eleita neste recorte.
                    </p>
                  )}
                </figure>
              );
            })()}
          <ExplorationWorkbench
            mode={explorationMode}
            onModeChange={setExplorationMode}
            question={q}
            data={data}
            scope={{ ano: year, cargo, uf, partido: party, municipio: town }}
            parameters={{ metric, target, youth, universe, historico: historico ? '1' : '0' }}
            options={meta}
            focusedRecord={focusedRecord}
            onScopeChange={(patch) => {
              if ('uf' in patch) setUf(patch.uf);
              if ('municipio' in patch) setTown(patch.municipio);
            }}
            onGo={onGo}
          />
          <Meaning limit={(data.limitations || []).join(' ')}>{data.method}</Meaning>
          <Explore title="Fontes, cobertura e o que ainda falta">
            {q === 8 && data.provenance && (
              <>
                <p>
                  Contas excluídas por recibos conflitantes no arquivo anual:{' '}
                  {num(data.provenance.conflicts_excluded)}. Duplicações removidas:{' '}
                  {num(data.provenance.duplicates_removed)}. Esses números são do arquivo das seis
                  UFs; o vínculo do recorte está nos indicadores acima.
                </p>
                {data.provenance.url && (
                  <p>
                    <a href={data.provenance.url} target="_blank" rel="noreferrer">
                      Arquivo anual oficial importado ↗
                    </a>
                  </p>
                )}
                <details>
                  <summary>Arquivos e hashes de conferência</summary>
                  {(data.provenance.files || [])
                    .filter((file) => !uf || file.uf === uf)
                    .map((file) => (
                      <p key={file.name} style={{ overflowWrap: 'anywhere' }}>
                        {file.name} · {num(file.rows)} lançamentos lidos · SHA-256: {file.sha256}
                      </p>
                    ))}
                </details>
              </>
            )}
            <p>
              Fonte: acervo eleitoral do TSE, {data.database}. Consulta:{' '}
              {data.extracted_at?.slice(0, 10)}.{' '}
              {[3, 4, 6].includes(q)
                ? 'Perfil do eleitorado reconciliado em 2024; referências históricas ainda em validação. IDHM usa referência 2010, não um novo IDHM de 2022.'
                : ''}
            </p>
            {(data.limitations || []).map((note) => (
              <p key={note}>{note}</p>
            ))}
            {q === 8 && (
              <p>
                <a
                  href="https://dadosabertos.tse.jus.br/group/prestacao-de-contas-eleitorais"
                  target="_blank"
                  rel="noreferrer"
                >
                  Receitas eleitorais oficiais do TSE ↗
                </a>
                . O arquivo importado guarda origem, hash e contagens de conferência; não publica
                nomes ou documentos de doadores.
              </p>
            )}
            {q === 1 && data.inflation?.source && (
              <p>
                <a href={data.inflation.source} target="_blank" rel="noreferrer">
                  Série oficial IPCA · BCB/IBGE ↗
                </a>
                . {data.inflation.method}
              </p>
            )}
          </Explore>
          <EvidenceRecords rows={rows} name={'pergunta-' + q + '-' + year} />
          {data.points && (
            <Explore title="Conferir municípios e demografia de referência">
              <EvidenceRecords rows={data.points} name={'pergunta-' + q + '-municipios'} />
            </Explore>
          )}
        </>
      )}
      <nav className="research-actions" aria-label="Siga a evidência pelo acervo">
        <button onClick={openPeople}>Ver pessoas deste recorte →</button>
        <button
          onClick={() =>
            onGo('legendas', '', '', { ano: year, cargo, uf, partido: party, municipioId: town })
          }
        >
          Panorama do partido →
        </button>
        <button
          onClick={() =>
            onGo('territorios', town ? 'municipio' : 'estado', '', {
              ano: year,
              cargo,
              uf,
              municipioId: town,
              partido: party,
            })
          }
        >
          Explorar território →
        </button>
        {!embedded && <button onClick={explore}>Abrir exploração temática →</button>}
      </nav>
    </section>
  );
}

function summaryLabel(key) {
  return (
    {
      n: 'Municípios com pares completos',
      pearson: 'Correlação de Pearson',
      spearman: 'Correlação de Spearman',
      candidaturas: 'Candidaturas observadas',
      com_valor: 'Com despesa conhecida',
      eleitos: 'Eleitos registrados',
      total: 'Despesas conhecidas',
      gasto_eleitos: 'Despesas conhecidas dos eleitos',
      mediana: 'Mediana dos eleitos',
      conhecidos: 'Patrimônio conhecido',
      definidos: 'Resultados definidos',
      eleitores_conhecidos: 'Eleitores · escolaridade conhecida',
      candidatos_conhecidos: 'Candidaturas · escolaridade conhecida',
      eleitores_excluidos: 'Eleitores · escolaridade excluída',
      candidatos_excluidos: 'Candidaturas · escolaridade excluída',
      com_receita_final: 'Vinculadas à prestação final',
      com_receita_positiva: 'Com receita financeira positiva',
      publico: 'Receitas de fundos públicos',
      privado: 'Outros recursos declarados',
      nao_classificado: 'Origem não classificada',
      pessoas: 'Pessoas com identidade consistente',
      mais_de_um_cargo: 'Pessoas com mais de um cargo observado',
      mudanca_organizacional: 'Mudança entre organizações · eventos excluídos',
      anos: 'Anos com registros',
      registros: 'Registros municipais de votação',
      ano: 'Ano selecionado',
    }[key] || key.replaceAll('_', ' ')
  );
}
