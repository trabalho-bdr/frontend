import { useScope } from '../../data/investigationContext.js';
import { useState } from 'react';
import { fmt, brl } from '../../data/exhibition.js';
import {
  Lead,
  Meaning,
  Source,
  Explore,
  EvidenceRecords,
  useEvidence,
  Unavailable,
  ReadingScope,
  RelatedStories,
} from './Story.jsx';
import { states } from '../../data/catalog.js';
import SpendingBands from './SpendingBands.jsx';

export default function SpendingStory({ onGo }) {
  const [context, setContext] = useScope({ uf: '', ano: '2024', cargo: 'VEREADOR' });
  const uf = context.uf,
    setUf = (uf) => setContext({ uf }),
    scope = context.ano + '|' + context.cargo,
    setScope = (value) => {
      const [ano, cargo] = value.split('|');
      setContext({ ano, cargo });
    };
  const [ano, cargo] = scope.split('|');
  const state = useEvidence('gastos', { ano, cargo, uf });
  const data = state.data,
    rows = data?.rows || [];
  const first = rows[0],
    last = rows.at(-1);
  const valid = rows.length >= 2 && Number.isFinite(first?.taxa) && Number.isFinite(last?.taxa);
  const delta = valid ? last.taxa - first.taxa : null;
  const answer = !valid
    ? 'Ainda não há dados suficientes para comparar as faixas neste recorte.'
    : delta > 0
      ? 'As candidaturas de maiores gastos tiveram maior taxa de eleição.'
      : delta < 0
        ? 'As candidaturas de menores gastos tiveram maior taxa de eleição.'
        : 'As duas faixas tiveram a mesma taxa de eleição.';
  return (
    <section className="expo-story" id="gastos">
      <Lead
        kicker="DINHEIRO E PODER"
        question="Quem gasta mais se elege com mais frequência?"
        discovery={answer}
      />
      <ReadingScope>
        {ano} · {cargo} · {uf || 'seis UFs'} · primeiro turno
      </ReadingScope>
      {valid ? (
        <>
          <SpendingBands first={first} last={last} />
          <Meaning limit="A comparação é descritiva: não isola partido, experiência, município ou outros fatores. Gastos são nominais e os grupos são recalculados a cada recorte.">
            As faixas agrupam candidaturas por despesas conhecidas. A taxa divide eleitos pelas
            candidaturas com resultado definido em cada grupo; não estima o efeito de gastar mais.
          </Meaning>
          <Source data={data} scope={`${ano} · ${cargo} · ${uf || '6 UFs'}`} />
        </>
      ) : (
        <Unavailable {...state} empty={!!data} />
      )}
      <Explore title="Conferir as quatro faixas e o método">
        {valid && (
          <>
            <p>
              Diferença entre as faixas extremas:{' '}
              <strong>{fmt(Math.abs(delta))} pontos percentuais</strong>.
            </p>
            {data?.summary && (
              <p>
                Gasto mediano: <strong>{brl(data.summary.mediana_eleitos)}</strong> entre eleitos e{' '}
                <strong>{brl(data.summary.mediana_nao_eleitos)}</strong> entre não eleitos ou
                suplentes. Medianas e faixas respondem a perguntas diferentes.
              </p>
            )}
            <p>
              {first.eleitos > 0
                ? 'Também houve eleitos na faixa de menores gastos.'
                : 'Nenhuma candidatura da faixa de menores gastos foi eleita neste recorte.'}{' '}
              As quatro faixas têm aproximadamente o mesmo número de candidaturas, mas não os mesmos
              limites em reais.{' '}
            </p>
          </>
        )}
        <EvidenceRecords rows={rows} name="gastos-taxas-por-quartil" />
      </Explore>
      <RelatedStories
        items={
          onGo
            ? [
                { label: 'Patrimônio e eleição', onClick: () => onGo('arquivo', 'patrimonio') },
                { label: 'Votos e cadeiras', onClick: () => onGo('plenario', 'proporcional') },
              ]
            : []
        }
      />
    </section>
  );
}
