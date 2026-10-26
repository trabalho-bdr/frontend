
import { mockLegenda } from "./mockLegenda";

const br = (valor: number) => valor.toLocaleString("pt-BR");
const pct = (valor: number) => valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

export function GraficosLegendaMock() {
  const serie = mockLegenda.historico;
  const maxSerie = Math.max(...serie.map((item) => item.votosLegenda)) * 1.15;
  const ponto = (valor: number, indice: number) => ({
    x: 42 + indice * (440 / (serie.length - 1)),
    y: 170 - (valor / maxSerie) * 140,
  });
  const pontos = serie.map((item, indice) => ponto(item.votosLegenda, indice));
  const linha = pontos.map((item) => `${item.x},${item.y}`).join(" ");

  return <section className="mock-charts" aria-labelledby="mock-charts-title">
    <div className="mock-charts-heading"><div><span>PRÉVIA ILUSTRATIVA</span><h2 id="mock-charts-title">Outras leituras para votos por legenda</h2><p>Dados fictícios de demonstração. Estes gráficos não seguem os filtros nem representam resultados do TSE.</p></div><span className="mock-badge">Dados simulados</span></div>
    <div className="mock-chart-grid">
      <article className="dash-chart-card mock-chart-wide"><h3>Evolução entre eleições</h3><p>Mesmo cargo ao longo dos anos · {mockLegenda.cargo}</p>
        <svg className="mock-line-chart" viewBox="0 0 530 215" role="img" aria-label="Gráfico ilustrativo da evolução dos votos de legenda de 2010 a 2022">
          {[30, 76, 123, 170].map((y) => <line key={y} x1="42" x2="482" y1={y} y2={y} className="mock-grid-line" />)}
          <polyline points={linha} fill="none" stroke="var(--chart-pink,#ef4da3)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
          {serie.map((item, indice) => <g key={item.ano}><circle cx={pontos[indice].x} cy={pontos[indice].y} r="5" fill="var(--chart-pink,#ef4da3)" stroke="var(--theme-surface,#292d49)" stroke-width="3" /><text x={pontos[indice].x} y={pontos[indice].y - 13} text-anchor="middle" className="mock-value">{br(item.votosLegenda)}</text><text x={pontos[indice].x} y="198" text-anchor="middle" className="mock-year">{item.ano}</text></g>)}
        </svg>
      </article>
      <article className="dash-chart-card"><h3>Legenda x nominal por partido</h3><p>Composição dos votos em cada partido fictício</p><div className="mock-stack-legend"><span><i className="mock-legend-pink" /> Legenda</span><span><i className="mock-legend-muted" /> Nominal</span></div>
        <div className="mock-party-bars">{mockLegenda.partidos.map((item) => {
          const percentual = 100 * item.legenda / (item.legenda + item.nominais);
          return <div className="mock-party-row" key={item.nome}><span>{item.nome}</span><div className="mock-stacked-bar" role="img" aria-label={`${item.nome}: ${pct(percentual)} de votos de legenda`}><i style={{ width: `${percentual}%` }} /></div><b>{pct(percentual)}</b></div>;
        })}</div>
      </article>
      <article className="dash-chart-card"><h3>Comparação entre municípios</h3><p>Percentual de votos de legenda por município fictício</p><div className="mock-municipality-bars">{mockLegenda.municipios.map((item) => <div className="mock-municipality-row" key={item.nome}><div><span>{item.nome}</span><b>{pct(item.percentual)}</b></div><i><span style={{ width: `${item.percentual / 30 * 100}%` }} /></i></div>)}</div></article>
    </div>
  </section>;
}
