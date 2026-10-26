import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { displayNumber as num, displayMoney as money } from '../../../catalog/logic.js';
const colors = ['#245b4d', '#173e78', '#a6a18e'];
export default function Chart({ data, costMetric, reduced, onInspect }) {
  const rows = data.rows.map((row) => ({
    ...row,
    nominais_pct: row.valor == null ? null : 100 - row.valor,
  }));
  return (
    <figure className="research-chart">
      <figcaption>Nome e legenda: a composição da votação</figcaption>
      <ResponsiveContainer width="100%" height={310}>
        <BarChart data={rows} margin={{ left: 0, right: 18, top: 14 }}>
          <CartesianGrid vertical={false} stroke="#ded3bc" />
          <XAxis dataKey="ano" />
          <YAxis domain={[0, 100]} unit="%" />
          <Tooltip formatter={(v) => num(v) + '%'} />
          <Legend />
          <Bar
            stackId="votos"
            dataKey="nominais_pct"
            name="Votos nominais"
            fill="#173e78"
            isAnimationActive={!reduced}
          />
          <Bar
            stackId="votos"
            dataKey="valor"
            name="Votos de legenda"
            fill="#d8ab32"
            isAnimationActive={!reduced}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="money-chart-note">
        Cada coluna é a votação completa do recorte naquele ano. A parcela amarela mostra o peso do
        voto dado à legenda.
      </p>
    </figure>
  );
}
