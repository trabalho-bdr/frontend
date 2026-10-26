import { useScope } from '../../data/investigationContext.js';
import { useEffect, useState } from 'react';
import { getLegendaInvestigacao } from '../../data/client.js';
import { fmt } from '../../data/exhibition.js';
import { Explore, EvidenceRecords, RelatedStories } from './Story.jsx';

const offices = [
  ['VEREADOR', 'Vereador · 2020 × 2024'],
  ['DEPUTADO ESTADUAL', 'Deputado estadual · 2018 × 2022'],
  ['DEPUTADO FEDERAL', 'Deputado federal · 2018 × 2022'],
];
const yearsFor = (cargo) => (cargo === 'VEREADOR' ? [2020, 2024] : [2018, 2022]);
const fallback = () => null;

export default function LegendaInvestigation({ onGo }) {
  const [scope, setScope] = useScope({ cargo: 'VEREADOR', uf: '', partido: '', municipioId: '' });
  const cargo = scope.cargo;
  const setCargo = (cargo) => setScope({ cargo });
  const [data, setData] = useState(fallback('VEREADOR')),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(fallback(cargo));
    setLoading(true);
    setError(false);
    getLegendaInvestigacao(
      { cargo, uf: scope.uf, partido: scope.partido, municipio: scope.municipioId },
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [cargo, scope.uf, scope.partido, scope.municipioId, revision]);
  const years = yearsFor(cargo),
    first = data?.rows?.find((row) => row.ano === years[0]),
    last = data?.rows?.find((row) => row.ano === years[1]);
  const valid =
    first && last && Number.isFinite(first.percentual) && Number.isFinite(last.percentual);
  const diff = valid ? last.percentual - first.percentual : null;
  const answer = valid
    ? `Entre ${years[0]} e ${years[1]}, a participação dos votos de legenda para ${cargo.toLowerCase()} ${diff < -0.005 ? 'caiu' : diff > 0.005 ? 'subiu' : 'ficou praticamente estável'}: ${fmt(first.percentual)}% → ${fmt(last.percentual)}%.`
    : 'Ainda não há dois anos comparáveis neste recorte.';
  const scale = Math.max(1, first?.percentual || 0, last?.percentual || 0) * 1.15;
  return (
    <section className="expo-story expo-legenda-investigation" aria-labelledby="legenda-question">
      <header className="expo-lead">
        <span className="expo-kicker">VOTOS DE LEGENDA</span>
        <h2 id="legenda-question">O voto de legenda diminuiu?</h2>
        <p className="expo-discovery">{answer}</p>
      </header>
      <p className="expo-reading-scope">
        Recorte: {cargo} · {years.join(' × ')} · {scope.uf || 'seis UFs'}
        {scope.partido ? ' · ' + scope.partido : ''}
        {scope.municipioNome ? ' · ' + scope.municipioNome : ''} · primeiro turno
      </p>
      {valid ? (
        <>
          <div
            className="expo-legenda-pair"
            role="img"
            aria-label={`Votos de legenda como parcela do total: ${years[0]} ${fmt(first.percentual)}%; ${years[1]} ${fmt(last.percentual)}%`}
          >
            {[first, last].map((row) => (
              <div className="expo-legenda-row" key={row.ano}>
                <strong>{row.ano}</strong>
                <div>
                  <i style={{ width: `${(100 * row.percentual) / scale}%` }} />
                </div>
                <b>{fmt(row.percentual)}%</b>
              </div>
            ))}
          </div>
          <p className="expo-legenda-explain">
            Em cada ano, dividimos os votos de legenda pela soma de votos de legenda e votos
            nominais do mesmo cargo. A diferença é de {fmt(Math.abs(diff))} ponto
            {Math.abs(diff) >= 1.005 ? 's' : ''} percentual{Math.abs(diff) >= 1.005 ? 'is' : ''}; os
            totais de votos e a cobertura estão em “Entenda os dados”.
          </p>
        </>
      ) : (
        <p className="expo-unavailable">Sem dois anos com votos válidos para esta comparação.</p>
      )}

      {error && (
        <p className="expo-source">
          Consulta indisponível. Nenhum dado arquivado será exibido.{' '}
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            Atualizar consulta
          </button>
        </p>
      )}
      <Explore title="Entenda os dados e confira os votos">
        <p>A comparação usa eleições ordinárias equivalentes do mesmo cargo.</p>
        <p>
          O percentual é calculado depois de somar os votos, não pela média simples dos percentuais
          de municípios ou partidos. Mudanças na composição do eleitorado, nas siglas e nas disputas
          não são isoladas por esta comparação.
        </p>
        <EvidenceRecords
          rows={data?.rows || []}
          name={`voto-legenda-${cargo.toLowerCase().replaceAll(' ', '-')}`}
        />
        <p className="expo-source">
          {data?.source === 'live' ? 'Consulta atual' : 'Referência local do acervo'} · Fonte:
          Votos_Partido_Municipio, Eleicao e Municipio · base oficial do acervo.
        </p>
      </Explore>
      <RelatedStories
        items={
          onGo
            ? [
                {
                  label: 'Votos e eleitos por partido',
                  onClick: () => onGo('partidos', 'representacao'),
                },
                {
                  label: 'Onde a liderança partidária mudou?',
                  onClick: () => onGo('atlas', 'lideranca'),
                },
                {
                  label: 'Por que mais votos não garantem uma cadeira?',
                  onClick: () => onGo('plenario', 'proporcional'),
                },
              ]
            : []
        }
      />
    </section>
  );
}
