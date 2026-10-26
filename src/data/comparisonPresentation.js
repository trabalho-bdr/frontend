// Series identities, independent of chart order and the decorative palette.
// Hues/dashes carry no party, ideological or quantitative classification.
export const SERIES_COLORS = [
  '#315F89',
  '#8D527B',
  '#3E765D',
  '#9C762E',
  '#656399',
  '#9A593D',
  '#326F76',
];
const known = [
  'CE',
  'MA',
  'MS',
  'RJ',
  'RN',
  'RS',
  'Todos os partidos',
  'PL',
  'PT',
  'PSOL',
  'PSD',
  'MDB',
  'UNIÃO',
  'PP',
  'REPUBLICANOS',
  'PSDB',
  'PDT',
  'PSB',
  'NOVO',
  'REDE',
  'PODE',
  'Adesivos',
  'Bandeiras',
  'Santinhos',
];
export function seriesStyle(label) {
  const key = String(label);
  let hash = 0;
  for (const character of key) hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  const index = known.includes(key) ? known.indexOf(key) : hash;
  return {
    color: SERIES_COLORS[index % SERIES_COLORS.length],
    dash: ['', '7 4', '2 4'][Math.floor(index / SERIES_COLORS.length) % 3],
  };
}
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
// All findings are descriptive arithmetic on the visible, non-null series.
// A missing value never becomes zero, a trend or a comparison endpoint.
export function comparisonFindings(chart) {
  if (chart.type === 'line') {
    const changes = chart.series.flatMap((serie) => {
      const points = chart.points.filter((point) => finite(point[serie]));
      if (points.length < 2) return [];
      const first = points[0],
        last = points.at(-1);
      return [
        {
          type: 'change',
          serie,
          fromYear: first.periodo,
          toYear: last.periodo,
          from: first[serie],
          to: last[serie],
          delta: last[serie] - first[serie],
        },
      ];
    });
    const latest = [...chart.points]
      .reverse()
      .find((point) => chart.series.filter((serie) => finite(point[serie])).length >= 2);
    const ordered =
      latest &&
      chart.series.filter((serie) => finite(latest[serie])).sort((a, b) => latest[a] - latest[b]);
    const gap = ordered
      ? [
          {
            type: 'gap',
            year: latest.periodo,
            low: ordered[0],
            high: ordered.at(-1),
            delta: latest[ordered.at(-1)] - latest[ordered[0]],
          },
        ]
      : [];
    return [...gap, ...changes].slice(0, 4);
  }
  const points = chart.points.filter((point) => finite(point.valor));
  if (points.length < 2 || new Set(points.map((point) => point.rotulo)).size < 2) return [];
  const ordered = [...points].sort((a, b) => a.valor - b.valor);
  return [
    {
      type: 'spread',
      low: ordered[0].rotulo,
      high: ordered.at(-1).rotulo,
      delta: ordered.at(-1).valor - ordered[0].valor,
    },
  ];
}
export function compactChartValue(value) {
  const n = Number(value);
  if (Math.abs(n) >= 1e9)
    return (n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' bi';
  if (Math.abs(n) >= 1e6)
    return (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
  if (Math.abs(n) >= 1e3)
    return (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
