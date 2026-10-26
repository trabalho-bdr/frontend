import { useScope } from '../../data/investigationContext.js';
import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LabelList,
} from 'recharts';
import {
  Lead,
  Meaning,
  Explore,
  Source,
  EvidenceRecords,
  useEvidence,
  Unavailable,
  ReadingScope,
  Counterpoint,
  RelatedStories,
  DidYouKnow,
} from './Story.jsx';
import { states } from '../../data/catalog.js';
import { fmt } from '../../data/exhibition.js';

export default function PartyStory({ onGo }) {
  const [context, setContext] = useScope({ uf: '', ano: '2024', cargo: 'VEREADOR' });
  const uf = context.uf,
    setUf = (uf) => setContext({ uf }),
    scope = context.ano + '|' + context.cargo,
    setScope = (value) => {
      const [ano, cargo] = value.split('|');
      setContext({ ano, cargo });
    };
  const [ano, cargo] = scope.split('|');
  const state = useEvidence('partidos', { uf, ano, cargo }),
    data = state.data,
    rows = data?.rows || [];
  const totalVotes = rows.reduce((s, r) => s + (r.votos || 0), 0),
    totalSeats = rows.reduce((s, r) => s + (r.eleitos || 0), 0);
  const compared = rows.map((r) => ({
    ...r,
    pct_votos: totalVotes ? (100 * r.votos) / totalVotes : null,
    pct_eleitos: totalSeats ? (100 * (r.eleitos || 0)) / totalSeats : null,
  }));
  const ranked =
    totalVotes && totalSeats
      ? [...compared].sort((a, b) => b.pct_eleitos - b.pct_votos - (a.pct_eleitos - a.pct_votos))
      : [];
  const highest = ranked[0],
    lowest = ranked.at(-1),
    difference = highest ? highest.pct_eleitos - highest.pct_votos : null;
  const chartRows = [highest, lowest].filter(
    (row, index, list) => row && list.findIndex((item) => item?.partido === row.partido) === index,
  );
  const discovery = highest
    ? `${highest.partido} tem a maior diferença a favor dos eleitos: ${fmt(difference)} pontos percentuais acima de sua participação nos votos.`
    : 'Este recorte ainda não tem votos e resultados suficientes para comparar as siglas.';
  return (
    <section className="expo-story">
      <Lead
        kicker="MURAL DOS PARTIDOS / VOTOS E REPRESENTAÇÃO"
        question="Quais partidos transformam votos em cadeiras?"
        discovery={discovery}
      />
      <ReadingScope>
        {ano} · {cargo} · {uf || 'seis UFs'} · votos nominais e de legenda
      </ReadingScope>
      {highest ? (
        <>
          <div
            className="expo-chart expo-chart-simple"
            aria-label="Participação nos votos e nos eleitos das duas siglas de maior contraste"
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartRows}
                layout="vertical"
                margin={{ left: 12, right: 66, top: 8, bottom: 8 }}
              >
                <CartesianGrid horizontal={false} stroke="#e6ddcb" />
                <XAxis type="number" domain={[0, 'auto']} unit="%" />
                <YAxis type="category" dataKey="partido" width={76} tick={{ fontSize: 15 }} />
                <Tooltip formatter={(value) => fmt(value) + '%'} />
                <Legend />
                <Bar dataKey="pct_votos" name="Votos" fill="#173e78" barSize={24}>
                  <LabelList
                    dataKey="pct_votos"
                    position="right"
                    formatter={(value) => fmt(value, 1) + '%'}
                    style={{ fontSize: 13, fontWeight: 700 }}
                  />
                </Bar>
                <Bar dataKey="pct_eleitos" name="Eleitos" fill="#d24c39" barSize={24}>
                  <LabelList
                    dataKey="pct_eleitos"
                    position="right"
                    formatter={(value) => fmt(value, 1) + '%'}
                    style={{ fontSize: 13, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Meaning limit="Votos nominais + legenda e resultados do primeiro turno, sem suplementares. A comparação reúne disputas territoriais; não refaz o cálculo oficial de vagas e não isola federações.">
            As duas siglas mostram os maiores contrastes entre parcela dos votos e parcela dos
            eleitos. A comparação reúne {fmt(totalVotes, 0)} votos e {fmt(totalSeats, 0)}{' '}
            candidaturas eleitas; todos os partidos estão em “Explorar mais”.
          </Meaning>
          <Source data={data} scope={`${ano} · ${cargo} · ${uf || '6 UFs'}`} />
        </>
      ) : (
        <Unavailable {...state} empty={!!data} />
      )}

      <Explore title="Conferir todos os partidos e o método">
        <Counterpoint>
          Essas parcelas não são taxa de sucesso individual: a taxa usa candidaturas com resultado
          definido como denominador. Partido, federação e município também influenciam a
          distribuição das vagas.
        </Counterpoint>
        <EvidenceRecords rows={compared} name="partidos-votos-candidaturas-eleitos" />
      </Explore>
      <RelatedStories
        items={
          onGo
            ? [
                {
                  label: 'Por que mais votos não garantem eleição?',
                  onClick: () => onGo('plenario', 'proporcional'),
                },
                { label: 'Onde a sigla líder mudou?', onClick: () => onGo('atlas', 'lideranca') },
                {
                  label: 'Trajetórias e troca de partido',
                  onClick: () => onGo('arquivo', 'juventude'),
                },
              ]
            : []
        }
      />
    </section>
  );
}
