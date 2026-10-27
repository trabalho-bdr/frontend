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
  ReferenceLine,
} from 'recharts';
import { displayNumber as num, displayMoney as money } from '../../../catalog/logic.js';
import { comRotulos, extremosSemZero, diferencaExtremos } from './labels.js';
const colors = ['#245b4d', '#173e78', '#a6a18e'];
export default function Chart({ data, costMetric, reduced, onInspect }) {
  const { rows, bins } = comRotulos(data);

  const totalCandidaturas = rows.reduce((acc, r) => acc + (r.candidaturas || 0), 0);
  const totalEleitos = rows.reduce((acc, r) => acc + (r.eleitos || 0), 0);
  const mediaGeral = totalCandidaturas ? (100 * totalEleitos) / totalCandidaturas : null;

  const { maisPobre, maisRico } = extremosSemZero(rows);
  const diferenca = diferencaExtremos(maisPobre, maisRico);
  const diferencaTexto = !diferenca
    ? 'Não informado'
    : diferenca.favorecido == null
      ? 'Sem diferença entre os extremos'
      : diferenca.semBase
        ? `Grupo mais ${diferenca.favorecido} tem mais chance · grupo mais pobre não teve eleitos`
        : `Grupo mais ${diferenca.favorecido} tem ${num(diferenca.percentual)}% mais chance`;

  return (
    <figure className="research-chart">
      <figcaption>
        Patrimônio e chance de eleição: {bins === 10 ? 'decis' : 'quartis'} comparados
      </figcaption>
      {maisPobre && maisRico && (
        <dl className="research-summary">
          <div>
            <dt>Patrimônio mediano — grupo mais rico</dt>
            <dd>{money(maisRico.mediana)}</dd>
          </div>
          <div>
            <dt>Patrimônio mediano — grupo mais pobre (sem zero declarado)</dt>
            <dd>{money(maisPobre.mediana)}</dd>
          </div>
          <div>
            <dt>Diferença de chance entre os extremos</dt>
            <dd>{diferencaTexto}</dd>
          </div>
        </dl>
      )}
      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={rows}
          margin={{ left: 6, right: 22, top: 20, bottom: 70 }}
          onClick={(state) => {
            const row = state?.activePayload?.[0]?.payload;
            if (row) onInspect?.(row);
          }}
        >
          <CartesianGrid vertical={false} stroke="#ded3bc" strokeDasharray="3 4" />
          <XAxis
            dataKey="rotulo"
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={70}
          />
          <YAxis unit="%" tick={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload;
              return active && row ? (
                <div className="research-tooltip">
                  <strong>{row.rotulo}</strong>
                  <p>Patrimônio mediano: {money(row.mediana)}</p>
                  <p>
                    Taxa de eleição: {num(row.valor)}% · {num(row.eleitos)} de{' '}
                    {num(row.candidaturas)} candidaturas
                  </p>
                  <p>
                    Faixa estimada (95% de confiança): {num(row.intervalo_inferior)}% a{' '}
                    {num(row.intervalo_superior)}%
                  </p>
                  {row.amostra_pequena && <p>Grupo com poucas candidaturas: leia com cautela.</p>}
                </div>
              ) : null;
            }}
          />
          {mediaGeral != null && (
            <ReferenceLine
              y={mediaGeral}
              stroke="#a63c30"
              strokeDasharray="5 4"
              label={{
                value: `Média geral: ${num(mediaGeral)}%`,
                position: 'insideTopRight',
                fontSize: 11,
                fill: '#a63c30',
              }}
            />
          )}
          <Bar
            dataKey="valor"
            name="Taxa de eleição"
            radius={[4, 4, 0, 0]}
            isAnimationActive={!reduced}
          >
            {rows.map((row) => (
              <Cell key={row.faixa} fill={row.amostra_pequena ? '#a6a18e' : '#173e78'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="money-chart-note">
        Cada coluna é um grupo de patrimônio ({bins === 10 ? 'decis' : 'quartis'} do patrimônio
        positivo{data?.excluir_zero ? '' : ', mais o zero declarado'}), com quantidade parecida de
        candidaturas em cada um. O rótulo mostra a faixa de patrimônio do grupo, do menor ao maior
        valor observado nele. A altura é a taxa de eleição; a linha tracejada marca a média geral.
        Passe o mouse sobre uma coluna para ver quantas candidaturas sustentam aquele número.
        Associação descritiva; não estima efeito causal.
      </p>
    </figure>
  );
}
