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
  const rows = [
    { name: 'Fundos públicos', value: data.summary?.publico },
    { name: 'Outros recursos declarados', value: data.summary?.privado },
    { name: 'Origem não classificada', value: data.summary?.nao_classificado },
  ].filter((row) => row.value > 0);
  if (!rows.length) return null;
  return (
    <figure className="research-chart">
      <figcaption>De onde vem o dinheiro declarado?</figcaption>
      <ResponsiveContainer width="100%" height={270}>
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius={68}
            outerRadius={108}
            paddingAngle={2}
            isAnimationActive={!reduced}
          >
            {rows.map((row, i) => (
              <Cell key={row.name} fill={colors[i]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => money(v)} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="money-chart-legend">
        {rows.map((row, i) => (
          <li key={row.name}>
            <i style={{ background: colors[i] }} />
            {row.name}: {money(row.value)}
          </li>
        ))}
      </ul>
      <p className="money-chart-note">
        Composição das receitas financeiras vinculadas. O gráfico seguinte compara as taxas de
        eleição por participação de fundos públicos; não estima um efeito causal.
      </p>
    </figure>
  );
}
