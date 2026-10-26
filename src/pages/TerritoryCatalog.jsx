import { useEffect, useState } from 'react';
import { readContext, writeContext } from '../data/investigationContext.js';
import {
  useCatalog,
  CatalogState,
  displayNumber as num,
  displayMoney as money,
} from '../catalog/useCatalog.jsx';
import RecordCollection from '../components/RecordCollection.jsx';
import '../catalog/catalog.css';
import { emptyCatalogFilters } from '../catalog/logic.js';

const names = {
  CE: 'Ceará',
  MA: 'Maranhão',
  MS: 'Mato Grosso do Sul',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
};
export default function TerritoryCatalog({ onGo }) {
  const context = readContext(),
    uf = context.uf || '',
    municipio = context.municipioId || '';
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    [metric, setMetric] = useState('total');
  const [year, setYear] = useState(context.ano || '2024'),
    [cargo, setCargo] = useState(
      ['VEREADOR', 'PREFEITO', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL'].includes(context.cargo)
        ? context.cargo
        : 'VEREADOR',
    );
  const states = useCatalog('estados'),
    towns = useCatalog(
      'estados/' + encodeURIComponent(uf) + '/municipios',
      { q: query, offset: page * 24, limit: 24 },
      !!uf && !municipio,
      250,
    );
  const profile = useCatalog(
    'municipios/' + encodeURIComponent(municipio),
    { ano: year, cargo },
    !!municipio,
  );
  const options = useCatalog('opcoes');
  useEffect(() => {
    if (!municipio || !options.data) return;
    const years = options.data.eleicoes
      .filter((row) => row.cargo === cargo && row.uf === uf)
      .map((row) => row.ano);
    if (years.length && !years.includes(Number(year))) setYear(String(Math.max(...years)));
    else writeContext({ ano: year, cargo, etapa: 'territorio' });
  }, [municipio, cargo, year, options.data, uf]);
  const openState = (state) =>
    onGo('territorios', 'estado', '', {
      uf: state,
      municipioId: '',
      municipioNome: '',
      etapa: 'territorio',
    });
  if (municipio) {
    const data = profile.data,
      place = data?.municipio,
      parties = [...(data?.partidos || [])].sort(
        (a, b) => (b[metric] ?? -Infinity) - (a[metric] ?? -Infinity),
      ),
      max = Math.max(0, ...parties.map((row) => row[metric] ?? 0));
    const latestCensus = data?.censo?.at(-1);
    const votingYears = [
      ...new Set(
        (options.data?.eleicoes || [])
          .filter((e) => e.cargo === cargo && e.uf === uf)
          .map((e) => String(e.ano)),
      ),
    ];
    return (
      <section className="territory-catalog">
        <button className="catalog-back" onClick={() => openState(uf)}>
          ← Municípios de {names[uf] || uf}
        </button>
        <CatalogState state={profile} />
        {data && (
          <>
            <header className="catalog-heading">
              <span>FICHA TERRITORIAL / {place.uf}</span>
              <h1>{place.nome}</h1>
              <p>
                {names[place.uf]} · {place.regiao}
              </p>
              <p>
                Acervo de candidaturas municipais: {data.candidaturas_municipais.primeiro_ano}–
                {data.candidaturas_municipais.ultimo_ano} ·{' '}
                {num(data.candidaturas_municipais.pessoas)} pessoas observadas.
              </p>
            </header>
            <section className="catalog-profile-section">
              <h2>População e participação eleitoral</h2>
              {latestCensus && (
                <p>
                  População: <strong>{num(latestCensus.populacao)}</strong> · referência{' '}
                  {latestCensus.ano_referencia}. PIB: <strong>{num(latestCensus.pib)}</strong> na
                  unidade original do acervo; a unidade monetária ainda não foi validada.
                </p>
              )}
              <RecordCollection
                title="Participação municipal por eleição · sem atribuição a comportamento individual"
                items={data.participacao.map((row) => ({
                  id: String(row.ano) + row.cargo,
                  title: String(row.ano),
                  value:
                    row.abstencao_pct == null
                      ? 'Taxa não informada'
                      : num(row.abstencao_pct) + '% de abstenção',
                  subtitle: row.cargo || 'Participação municipal',
                  bar: {
                    value: row.abstencao_pct,
                    max: 100,
                    label: num(row.abstencao_pct) + '% de abstenção',
                  },
                  fields: [
                    { label: 'Eleitorado apto', value: num(row.eleitorado_apto) },
                    { label: 'Comparecimento', value: num(row.comparecimento) },
                    { label: 'Abstenções', value: num(row.abstencoes) },
                  ],
                }))}
              />
            </section>
            <section className="catalog-profile-section">
              <h2>Votos e partidos neste município</h2>
              <div className="catalog-filters">
                <label>
                  Cargo
                  <select
                    value={cargo}
                    onChange={(e) => {
                      setCargo(e.target.value);
                      const years = (options.data?.eleicoes || [])
                        .filter((row) => row.cargo === e.target.value && row.uf === uf)
                        .map((row) => row.ano);
                      if (!years.includes(Number(year))) setYear(String(Math.max(...years)));
                    }}
                  >
                    {['VEREADOR', 'PREFEITO', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL'].map(
                      (value) => (
                        <option key={value}>{value}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Ano
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    {votingYears.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Leitura
                  <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                    <option value="total">Votação total</option>
                    <option value="nominais">Votos nominais</option>
                    <option value="legenda">Votos de legenda</option>
                    <option value="participacao_legenda">Participação da legenda</option>
                  </select>
                </label>
              </div>
              <p>
                {data.lideres.length === 1
                  ? `${data.lideres[0]} tem a maior votação total nesta disputa.`
                  : data.lideres.length > 1
                    ? `Empate na maior votação: ${data.lideres.join(', ')}.`
                    : 'Nenhuma votação disponível neste recorte.'}{' '}
                São votos registrados no município; cadeiras de deputados pertencem à UF.
              </p>
              <RecordCollection
                items={parties.map((row) => ({
                  id: row.partido,
                  title: row.partido,
                  value: num(row[metric]) + (metric === 'participacao_legenda' ? '%' : ' votos'),
                  bar: { value: row[metric], max, label: num(row[metric]) },
                  fields: [
                    { label: 'Votos nominais', value: num(row.nominais) },
                    { label: 'Votos de legenda', value: num(row.legenda) },
                    { label: 'Votação total', value: num(row.total) },
                    {
                      label: 'Participação da legenda',
                      value: num(row.participacao_legenda) + '%',
                    },
                  ],
                  actionLabel: 'Investigar este partido',
                  onSelect: () =>
                    onGo('legendas', '', '', {
                      uf: place.uf,
                      municipioId: municipio,
                      municipioNome: place.nome,
                      ano: year,
                      cargo,
                      partido: row.partido,
                    }),
                }))}
              />
            </section>
            <nav className="catalog-related">
              <button
                onClick={() =>
                  onGo('legendas', '', '', {
                    uf: place.uf,
                    municipioId: municipio,
                    municipioNome: place.nome,
                    ano: year,
                    cargo,
                    partido: '',
                  })
                }
              >
                Partidos e candidatos neste município ↗
              </button>
              <button
                onClick={() =>
                  onGo('candidatos', '', '', {
                    uf: place.uf,
                    municipioId: municipio,
                    cargo: 'VEREADOR',
                    ano: '',
                    catalogoEstado: JSON.stringify({
                      filters: {
                        ...emptyCatalogFilters,
                        uf: place.uf,
                        cargo: 'VEREADOR',
                        municipio,
                      },
                      order: 'recentes',
                      page: 0,
                    }),
                    catalogo_ano: '',
                    catalogo_uf: place.uf,
                    catalogo_cargo: 'VEREADOR',
                    catalogo_municipio: municipio,
                  })
                }
              >
                Candidaturas municipais de todos os anos ↗
              </button>
              <button
                onClick={() =>
                  onGo('atlas', 'territorio', '', {
                    uf: place.uf,
                    municipioId: municipio,
                    municipioNome: place.nome,
                  })
                }
              >
                Explorar no Atlas ↗
              </button>
              <button
                onClick={() =>
                  onGo('plenario', 'custo', '', {
                    uf: place.uf,
                    municipioId: municipio,
                    municipioNome: place.nome,
                    ano: year,
                    cargo,
                  })
                }
              >
                Disputa no Plenário ↗
              </button>
            </nav>
            <details className="catalog-method">
              <summary>Cobertura do perfil do eleitorado e limites</summary>
              <p>{data.perfil_eleitorado.nota}</p>
              {data.perfil_eleitorado.cobertura.map((row) => (
                <p key={row.ano}>
                  {row.ano}: {num(row.registros)} registros, {num(row.fontes)} fontes e{' '}
                  {num(row.invalidos)} registros com quantidade inválida.
                </p>
              ))}
              {data.limitations.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </details>
          </>
        )}
      </section>
    );
  }
  return (
    <section className="territory-catalog">
      <header className="catalog-heading">
        <span>ÍNDICE TERRITORIAL / SEIS ESTADOS</span>
        <h1>{uf ? names[uf] || uf : 'Estados e municípios'}</h1>
        <p>Abra um estado, encontre um município e siga seus registros eleitorais pelo arquivo.</p>
        <button
          onClick={() =>
            onGo('candidatos', '', '', {
              uf,
              municipioId: '',
              catalogoEstado: JSON.stringify({
                filters: { ...emptyCatalogFilters, uf },
                order: 'recentes',
                page: 0,
              }),
            })
          }
        >
          Pessoas deste território ↗
        </button>
        <button
          onClick={() =>
            onGo('legendas', '', '', { uf, municipioId: '', partido: '', ano: year, cargo })
          }
        >
          Partidos deste território ↗
        </button>
        {uf && (
          <button onClick={() => onGo('atlas', 'territorio', '', { uf, municipioId: '' })}>
            Abrir mapa no Atlas ↗
          </button>
        )}
      </header>
      {!uf ? (
        <>
          <CatalogState state={states} />
          <div className="catalog-state-grid">
            {(states.data?.rows || []).map((row) => (
              <button key={row.uf} onClick={() => openState(row.uf)}>
                <span>{row.uf}</span>
                <h2>{names[row.uf] || row.uf}</h2>
                <p>
                  {num(row.municipios)} municípios · {num(row.pessoas)} pessoas
                </p>
                <small>
                  {row.primeiro_ano}–{row.ultimo_ano}
                </small>
                <b>Explorar o estado ↗</b>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button
            className="catalog-back"
            onClick={() => onGo('territorios', '', '', { uf: '', municipioId: '' })}
          >
            ← Todos os estados do acervo
          </button>
          <label className="catalog-town-search">
            Buscar município
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Nome do município"
            />
          </label>
          <CatalogState state={towns} empty={!!towns.data && !towns.data.rows.length} />
          {towns.data && (
            <RecordCollection
              pageSize={24}
              key={page + '-' + query}
              title={towns.data ? `${num(towns.data.total)} municípios em ${uf}` : ''}
              items={(towns.data?.rows || []).map((row) => ({
                id: row.id,
                title: row.nome,
                subtitle: row.regiao,
                onSelect: () =>
                  onGo('territorios', 'municipio', '', {
                    uf,
                    municipioId: row.id,
                    municipioNome: row.nome,
                  }),
                actionLabel: 'Abrir perfil eleitoral',
              }))}
            />
          )}
          {towns.data?.total > 24 && (
            <nav className="catalog-pagination">
              <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <span>
                Página {page + 1} de {Math.ceil(towns.data.total / 24)}
              </span>
              <button
                disabled={(page + 1) * 24 >= towns.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
