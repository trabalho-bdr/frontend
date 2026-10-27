import { useId, useState } from 'react';
import { electoralHistory, officeChanges } from './trajectory.js';
import './trajectory.css';

const outcomes = {
  elected: 'Eleito',
  'not-elected': 'Não eleito (inclui suplente)',
  unknown: 'Resultado não informado ou indefinido',
};
function Symbol({ outcome, x = 12, y = 12 }) {
  if (outcome === 'elected')
    return <circle cx={x} cy={y} r="7" fill="#245b4d" stroke="#fffaf0" strokeWidth="2" />;
  if (outcome === 'not-elected')
    return (
      <path
        d={`M${x - 6},${y - 6}l12,12m0,-12l-12,12`}
        stroke="#a63c30"
        strokeWidth="3"
        fill="none"
      />
    );
  return (
    <path d={`M${x},${y - 8}l8,8l-8,8l-8,-8Z`} fill="#fffaf0" stroke="#66717a" strokeWidth="2" />
  );
}
export default function TrajectoryChart({ rows, name }) {
  const titleId = useId();
  const [selectedId, setSelectedId] = useState(null);
  const history = electoralHistory(rows);
  if (!history.length)
    return <p>Nenhuma candidatura com ano informado foi encontrada para este candidato.</p>;
  const offices = [...new Set(history.map((row) => row.cargo))];
  const years = [...new Set(history.map((row) => row.ano))];
  const width = Math.max(720, years.length * 85 + 240);
  const height = Math.max(260, offices.length * 68 + 110);
  const left = 205,
    right = width - 45,
    top = 55,
    bottom = height - 65;
  const minYear = years[0],
    maxYear = years.at(-1);
  const points = history.map((row, index) => {
    const peers = history.filter((other) => other.ano === row.ano && other.cargo === row.cargo);
    const peerIndex = peers.findIndex((other) => other === row);
    return {
      ...row,
      key: row.id || String(index),
      x:
        (minYear === maxYear
          ? (left + right) / 2
          : left + ((row.ano - minYear) / (maxYear - minYear)) * (right - left)) +
        (peerIndex - (peers.length - 1) / 2) * 18,
      y:
        offices.length === 1
          ? (top + bottom) / 2
          : top + (offices.indexOf(row.cargo) * (bottom - top)) / (offices.length - 1),
    };
  });
  const selected = points.find((row) => row.key === selectedId) || points.at(-1);
  const changes = officeChanges(history);
  return (
    <figure className="candidate-trajectory">
      <figcaption>
        <h4>Trajetória eleitoral de {name}</h4>
        <p>Cargos disputados ao longo dos anos. Selecione um ponto para conferir a candidatura.</p>
      </figcaption>
      <div className="candidate-trajectory-layout">
        <div
          className="candidate-trajectory-scroll"
          tabIndex={0}
          role="region"
          aria-label="Gráfico da trajetória eleitoral; role horizontalmente em telas pequenas"
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ minWidth: width }}
            role="group"
            aria-labelledby={titleId}
          >
            <title id={titleId}>{`Anos e cargos das candidaturas de ${name}`}</title>
            <text x="12" y="22" className="trajectory-axis-title">
              CARGO DISPUTADO
            </text>
            {offices.map((office, index) => {
              const y =
                offices.length === 1
                  ? (top + bottom) / 2
                  : top + (index * (bottom - top)) / (offices.length - 1);
              return (
                <g key={office}>
                  <line x1={left} x2={right} y1={y} y2={y} stroke="#d8cbb5" />
                  <text x={left - 16} y={y + 4} textAnchor="end">
                    {office}
                  </text>
                </g>
              );
            })}
            {years.map((year) => {
              const x =
                minYear === maxYear
                  ? (left + right) / 2
                  : left + ((year - minYear) / (maxYear - minYear)) * (right - left);
              return (
                <g key={year}>
                  <line
                    x1={x}
                    x2={x}
                    y1={top - 15}
                    y2={bottom + 12}
                    stroke="#e2d8c6"
                    strokeDasharray="3 5"
                  />
                  <text x={x} y={bottom + 35} textAnchor="middle">
                    {year}
                  </text>
                </g>
              );
            })}
            <text x={right} y={height - 8} textAnchor="end" className="trajectory-axis-title">
              ANO DA ELEIÇÃO
            </text>
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#677f91"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            {points.map((point) => (
              <g
                key={point.key}
                tabIndex={0}
                role="button"
                aria-pressed={selected.key === point.key}
                aria-label={`${point.ano}, ${point.cargo}, ${point.partido || 'partido não informado'}, ${outcomes[point.outcome]}`}
                onClick={() => setSelectedId(point.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(point.key);
                  }
                }}
                className="trajectory-point"
              >
                <title>{`${point.ano} · ${point.cargo} · ${point.partido || 'Partido não informado'} · ${point.resultado || outcomes[point.outcome]}`}</title>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="15"
                  fill="#fffaf0"
                  stroke={selected.key === point.key ? '#173e78' : 'transparent'}
                  strokeWidth="2"
                />
                <Symbol outcome={point.outcome} x={point.x} y={point.y} />
              </g>
            ))}
          </svg>
        </div>
        <aside className="trajectory-legend" aria-label="Legenda dos símbolos do gráfico">
          <strong>Resultado da candidatura</strong>
          <ul>
            {Object.entries(outcomes).map(([outcome, text]) => (
              <li key={outcome}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <Symbol outcome={outcome} />
                </svg>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p>
            A linha tracejada conecta registros observados. Os cargos são categorias, sem ordem de
            promoção.
          </p>
        </aside>
      </div>
      <div className="trajectory-selected" aria-live="polite">
        <strong>
          {selected.ano} · {selected.cargo}
        </strong>
        <p>
          {selected.partido || 'Partido não informado'} ·{' '}
          {selected.municipio || selected.uf || 'Território não informado'} ·{' '}
          {selected.resultado || outcomes[selected.outcome]}
        </p>
      </div>
      <div className="trajectory-changes">
        <strong>Mudanças de cargo nas candidaturas</strong>
        {changes.length ? (
          <ul>
            {changes.map((change, index) => (
              <li key={index}>
                {change.fromYear}–{change.year}: {change.from} → {change.to}
              </li>
            ))}
          </ul>
        ) : (
          <p>Não há mudança de cargo entre os registros observados.</p>
        )}
      </div>
      <p className="trajectory-note">
        Histórico disponível nas seis UFs do acervo. Os pontos representam candidaturas; vitória não
        comprova exercício de mandato. Anos sem registro não indicam saída da política.
      </p>
    </figure>
  );
}
