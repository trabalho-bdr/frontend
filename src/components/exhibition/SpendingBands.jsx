import { fmt, brl } from '../../data/exhibition.js';
import './publicity-polish.css';

export default function SpendingBands({ first, last }) {
  return (
    <div
      className="expo-spending-bands"
      aria-label="Proporção de candidaturas eleitas em cada faixa de gastos"
    >
      <p className="expo-spending-intro">Compare os dois extremos de gastos declarados:</p>
      {[
        { row: first, label: '25% com menores gastos' },
        { row: last, label: '25% com maiores gastos' },
      ].map(({ row, label }) => (
        <div className="expo-spending-band" key={label}>
          <div className="expo-spending-band-heading">
            <strong>{label}</strong>
            <b>{fmt(row.taxa, 1)}% eleitas</b>
          </div>
          <div
            className="expo-spending-track"
            role="img"
            aria-label={`${label}: ${fmt(row.eleitos, 0)} eleitas de ${fmt(row.candidaturas, 0)} candidaturas, ${fmt(row.taxa, 1)}%`}
          >
            <span style={{ width: `${Math.min(100, Math.max(0, row.taxa))}%` }} />
          </div>
          <div className="expo-spending-band-note">
            <span>
              {fmt(row.eleitos, 0)} eleitas entre {fmt(row.candidaturas, 0)} candidaturas
            </span>
            <span>
              Gastos de {brl(row.minimo)} a {brl(row.maximo)}
            </span>
          </div>
        </div>
      ))}
      <div className="expo-spending-scale" aria-hidden="true">
        {[0, 25, 50, 75, 100].map((n) => (
          <span key={n}>{n}%</span>
        ))}
      </div>
      <p className="expo-spending-caption">
        A barra representa a porcentagem de candidaturas eleitas, não o valor gasto.
      </p>
    </div>
  );
}
