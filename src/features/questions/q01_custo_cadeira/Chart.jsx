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
  const rows = data.rows.map((row) => ({ ...row, valor: row[costMetric] }));
  return (
    <figure className="research-chart">
      <figcaption>O custo muda no tempo</figcaption>
      <ResponsiveContainer width="100%" height={330}>
        <LineChart
          onClick={(state) => {
            const row = state?.activePayload?.[0]?.payload;
            if (row) onInspect?.(row);
          }}
          data={rows}
          margin={{ left: 6, right: 20, top: 14, bottom: 8 }}
        >
          <CartesianGrid stroke="#ded3bc" strokeDasharray="3 4" />
          <XAxis dataKey="ano" />
          <YAxis tickFormatter={(v) => num(v / 1000) + ' mil'} width={70} />
          <Tooltip labelFormatter={(v) => 'Eleição de ' + v} formatter={(v) => money(v)} />
          <Line
            type="linear"
            dataKey="valor"
            name="Valor por eleito"
            stroke="#a63c30"
            strokeWidth={3}
            dot={{ r: 5, fill: '#fffaf0', strokeWidth: 3 }}
            connectNulls={false}
            isAnimationActive={!reduced}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="money-chart-note">
        Cada ponto representa uma eleição observada do mesmo cargo. Troque a medida para comparar
        valores nominais, corrigidos ou a mediana individual.
      </p>
    </figure>
  );
}
