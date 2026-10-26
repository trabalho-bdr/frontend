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
  const rows = data.rows
    .filter((r) => r.mediana != null && r.valor != null)
    .map((r) => ({ ...r, x: r.mediana, y: r.valor, z: r.candidaturas }));
  return (
    <figure className="research-chart">
      <figcaption>Patrimônio e chance de eleição: onde ficam as faixas?</figcaption>
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ left: 5, right: 22, top: 20, bottom: 12 }}>
          <CartesianGrid stroke="#ded3bc" strokeDasharray="3 4" />
          <XAxis
            type="number"
            dataKey="x"
            name="Patrimônio mediano"
            tickFormatter={(v) => num(v / 1000) + ' mil'}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Taxa de eleição"
            unit="%"
            tick={{ fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Candidaturas" />
          <Tooltip
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload;
              return active && row ? (
                <div className="research-tooltip">
                  <strong>{row.grupo}</strong>
                  <p>Patrimônio mediano: {money(row.mediana)}</p>
                  <p>
                    Eleição: {num(row.valor)}% · {num(row.eleitos)} de {num(row.candidaturas)}
                  </p>
                  <p>
                    Intervalo de Wilson: {num(row.intervalo_inferior)}% a{' '}
                    {num(row.intervalo_superior)}%
                  </p>
                </div>
              ) : null;
            }}
          />
          <Scatter
            onClick={(point) => onInspect?.(point?.payload || point)}
            data={rows}
            fill="#173e78"
            fillOpacity={0.75}
            isAnimationActive={!reduced}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="money-chart-note">
        Horizontal: patrimônio mediano da faixa. Vertical: taxa de eleição. A área de cada bolha
        representa quantas candidaturas há no grupo; zero declarado permanece separado.
      </p>
    </figure>
  );
}
