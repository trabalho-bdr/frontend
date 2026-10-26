import { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { territorialFindings } from '../atlas/data.js';
import { indicatorSettings, formatIndicator } from '../atlas/geography.js';
import { PrintLabel, SourceNote } from './Editorial.jsx';

export default function AtlasDiscoveries({
  rows,
  indicator,
  uf,
  coverage,
  loading,
  archived,
  onSelect,
}) {
  const finding = useMemo(() => territorialFindings(rows, indicator), [rows, indicator]);
  const context = `${indicatorSettings[indicator].context} · ${uf || '6 UFs'}`;
  const range =
    finding &&
    (indicator === 'abstencao_2024'
      ? `${finding.range.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p.`
      : formatIndicator(finding.range, indicator));
  return (
    <section className="br-territorial-findings" aria-label="Descobertas dos municípios carregados">
      <div className="br-findings-heading">
        <div>
          <PrintLabel tone="blue">LEITURAS DO TERRITÓRIO</PrintLabel>
          <h3>O que o mapa revela.</h3>
        </div>
        <p>
          {loading
            ? 'Consultando o recorte…'
            : `${archived ? 'AMOSTRA ARQUIVADA' : 'FICHAS CONSULTADAS'} · ${coverage.withValue} de ${coverage.total} municípios com valor.`}
        </p>
      </div>
      {!loading && finding ? (
        <>
          <div className="br-findings-grid">
            {[
              ['MENOR VALOR CARREGADO', finding.minimum],
              ['MAIOR VALOR CARREGADO', finding.maximum],
            ].map(([label, row], index) => (
              <button
                key={label}
                className={`br-finding br-finding-${index}`}
                onClick={() => onSelect(row)}
              >
                <span>{label}</span>
                <strong>{formatIndicator(row[indicator], indicator)}</strong>
                <h4>
                  {row.nome} <small>/ {row.uf}</small>
                </h4>
                <p>{indicatorSettings[indicator].label}</p>
                <span className="br-finding-open">
                  ABRIR A FICHA <ArrowUpRight size={19} />
                </span>
              </button>
            ))}
            <article className="br-finding br-finding-range">
              <span>DISTÂNCIA ENTRE OS EXTREMOS</span>
              <strong>{range}</strong>
              <h4>
                Entre as fichas
                <br />
                que têm valor.
              </h4>
              <p>
                {finding.count} municípios observados. Não é uma estimativa dos municípios sem
                dados.
              </p>
            </article>
          </div>
          <SourceNote>
            {context}. Estes extremos descrevem somente as fichas carregadas, não um ranking de todo
            o estado ou do país. Empates são possíveis.
          </SourceNote>
        </>
      ) : (
        <div className="br-findings-empty" role="status">
          {loading
            ? 'As descobertas aparecerão quando a consulta terminar.'
            : 'Não há valores deste indicador para destacar no recorte carregado.'}
        </div>
      )}
    </section>
  );
}
