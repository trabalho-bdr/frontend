import React from 'react';
import { Sparkles, ArrowDown } from 'lucide-react';

export default function DescobertasGeracoes({ descobertas = [], onScrollToSection }) {
  if (!descobertas || descobertas.length === 0) return null;

  return (
    <div className="j-discoveries-block" role="region" aria-label="Descobertas analíticas calculadas">
      <div className="j-discoveries-head">
        <h3>
          <Sparkles size={16} /> O QUE AS GERAÇÕES REVELAM?
        </h3>
        <span style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
          INDICADORES CALCULADOS A PARTIR DO RECORTE ATUAL
        </span>
      </div>

      <div className="j-discoveries-grid">
        {descobertas.slice(0, 3).map((d, idx) => (
          <article className="j-discovery-card" key={idx}>
            <span className="j-discovery-headline">{d.titulo}</span>
            <strong className="j-discovery-value">{d.valor}</strong>
            <p className="j-discovery-body">{d.subtitulo}</p>
            {d.comparativo && (
              <span className="j-discovery-meta">{d.comparativo}</span>
            )}
            {d.taxa && (
              <span className="j-discovery-meta" style={{ color: 'var(--j-verde-dark)' }}>
                {d.taxa}
              </span>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
