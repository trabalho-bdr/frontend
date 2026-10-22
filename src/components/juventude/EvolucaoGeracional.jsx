import React from 'react';
import { TrendingDown, TrendingUp, Minus, ArrowRight } from 'lucide-react';

const fNum = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
const pct = (n) => (n == null ? '—' : `${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`);

export default function EvolucaoGeracional({ evolucaoData = {} }) {
  const { cargo, anos_comparados, series, variacao_pontos_percentuais } = evolucaoData;

  if (!series || series.length < 2) return null;

  const [ano1, ano2] = anos_comparados;
  const s1 = series[0];
  const s2 = series[1];
  const diffs = variacao_pontos_percentuais || {};

  const metrics = [
    {
      label: 'Candidaturas Jovens (%)',
      desc: 'Participação de jovens entre todas as candidaturas válidas',
      val1: s1.pct_candidaturas_jovens,
      val2: s2.pct_candidaturas_jovens,
      den1: `${fNum(s1.jovens)} de ${fNum(s1.validas)}`,
      den2: `${fNum(s2.jovens)} de ${fNum(s2.validas)}`,
      diff: diffs.pct_candidaturas_jovens
    },
    {
      label: 'Jovens Eleitos (%)',
      desc: 'Participação de jovens entre todos os candidatos eleitos',
      val1: s1.pct_eleitos_jovens,
      val2: s2.pct_eleitos_jovens,
      den1: `${fNum(s1.jovens_eleitos)} de ${fNum(s1.eleitos_validos)}`,
      den2: `${fNum(s2.jovens_eleitos)} de ${fNum(s2.eleitos_validos)}`,
      diff: diffs.pct_eleitos_jovens
    },
    {
      label: 'Taxa de Vitória Jovem (%)',
      desc: 'Fração de candidatos jovens que conquistaram a cadeira',
      val1: s1.taxa_eleicao_jovens,
      val2: s2.taxa_eleicao_jovens,
      den1: `${fNum(s1.jovens_eleitos)} de ${fNum(s1.jovens_definidos)} definidos`,
      den2: `${fNum(s2.jovens_eleitos)} de ${fNum(s2.jovens_definidos)} definidos`,
      diff: diffs.taxa_eleicao_jovens
    }
  ];

  return (
    <section className="j-section-panel" aria-labelledby="evolucao-geracional-title">
      <header>
        <span className="j-step-badge">COMPARAÇÃO TEMPORAL · {cargo}</span>
        <h2 id="evolucao-geracional-title">
          A CURVA GERACIONAL: {ano1} → {ano2}
        </h2>
        <p>
          Compare dois pleitos comparáveis para o cargo de {cargo.toLowerCase()}.
          Observe a variação líquida em pontos percentuais (p.p.) e a evolução dos denominadores.
        </p>
      </header>

      <div className="j-evolution-container">
        {metrics.map((m, idx) => {
          const isPos = m.diff > 0;
          const isZero = m.diff === 0;

          return (
            <div className="j-evolution-card" key={idx}>
              <div>
                <h4>{m.label}</h4>
                <p style={{ font: '500 11px var(--j-body)', color: 'var(--j-texto-suave)', margin: '4px 0 0 0' }}>
                  {m.desc}
                </p>
              </div>

              <div className="j-evolution-compare">
                <div className="j-year-val">
                  <span>{ano1}</span>
                  <strong>{pct(m.val1)}</strong>
                  <small style={{ font: '500 9px var(--j-mono)', color: 'var(--j-texto-suave)', display: 'block' }}>
                    {m.den1}
                  </small>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span className={`j-pp-diff ${isPos ? 'positive' : isZero ? '' : 'negative'}`}>
                    {isPos ? `+${m.diff} p.p.` : `${m.diff} p.p.`}
                  </span>
                  <ArrowRight size={16} style={{ color: 'var(--j-texto-suave)', marginTop: '4px' }} />
                </div>

                <div className="j-year-val">
                  <span>{ano2}</span>
                  <strong style={{ color: isPos ? 'var(--j-verde-dark)' : 'var(--j-azul-dark)' }}>
                    {pct(m.val2)}
                  </strong>
                  <small style={{ font: '500 9px var(--j-mono)', color: 'var(--j-texto-suave)', display: 'block' }}>
                    {m.den2}
                  </small>
                </div>
              </div>

              <div style={{ font: '500 11px/1.4 var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                {isPos ? (
                  <span>▲ Houve um avanço de {Math.abs(m.diff)} pontos percentuais no período.</span>
                ) : isZero ? (
                  <span>▬ Estabilidade na proporção entre os dois pleitos.</span>
                ) : (
                  <span>▼ Houve um recuo de {Math.abs(m.diff)} pontos percentuais no período.</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ font: '500 11px var(--j-mono)', color: 'var(--j-texto-suave)', margin: '18px 0 0 0', borderTop: '1px dashed #d1ded0', paddingTop: '10px' }}>
        * Metodologia: Eleições municipais (Vereador) comparam 2020 e 2024; eleições gerais (Deputados) comparam 2018 e 2022. Pleitos suplementares excluídos.
      </p>
    </section>
  );
}
