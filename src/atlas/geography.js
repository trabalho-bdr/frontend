import { geoArea } from 'd3-geo';

export const COVERAGE = ['CE', 'MA', 'MS', 'RJ', 'RN', 'RS'];
export const indicatorSettings = {
  lideranca_mudou: {
    label: 'LIDERANÇA PARTIDÁRIA',
    breaks: [0.5],
    colors: ['#176B50', '#EDBF42'],
    labels: ['Manteve a sigla líder', 'Mudou a sigla líder'],
    context: 'Votos nominais + legenda · eleições do mesmo cargo',
  },
  abstencao_2024: {
    label: 'ABSTENÇÃO (%)',
    breaks: [15, 20, 25, 30],
    context: '2024 · Participação eleitoral municipal · Sem recorte por cargo',
  },
  pib_per_capita: {
    label: 'PIB POR HABITANTE (R$)',
    breaks: [20000, 40000, 60000, 80000],
    context: 'Referência 2022 no acervo · Indicador municipal · Sem recorte de cargo',
  },
  populacao: {
    label: 'POPULAÇÃO',
    breaks: [25000, 100000, 500000, 1000000],
    context: 'Referência 2022 no acervo · Indicador municipal · Sem recorte de cargo',
  },
};
// A sequential ink scale, separate from the decorative green/yellow identity.
// Fixed breaks allow the same value to keep its colour across UFs and searches.
export const MAP_COLORS = ['#dcecf1', '#a9cedd', '#6da6bd', '#357490', '#153f5b'];
export const NO_DATA_COLOR = '#d5d2c9';
export function hasIndicatorValue(value) {
  return (
    (typeof value === 'number' || typeof value === 'string') &&
    String(value).trim() !== '' &&
    Number.isFinite(Number(value))
  );
}
export function indicatorClass(value, indicator) {
  if (!hasIndicatorValue(value)) return -1;
  return indicatorSettings[indicator].breaks.filter((boundary) => Number(value) >= boundary).length;
}
export function formatIndicator(value, indicator) {
  if (!hasIndicatorValue(value)) return 'Sem dados neste recorte';
  if (indicator === 'lideranca_mudou')
    return indicatorSettings[indicator].labels[Number(value) >= 0.5 ? 1 : 0];
  const number = Number(value).toLocaleString('pt-BR', {
    maximumFractionDigits: indicator === 'idhm' ? 3 : indicator === 'populacao' ? 0 : 2,
  });
  return indicator === 'pib_per_capita'
    ? `R$ ${number}`
    : number + (indicator === 'abstencao_2024' ? '%' : '');
}
export function indicatorLegend(indicator) {
  const { breaks } = indicatorSettings[indicator];
  return (indicatorSettings[indicator].colors || MAP_COLORS).map((color, index) => {
    const lower = index === 0 ? null : breaks[index - 1],
      upper = breaks[index] ?? null;
    const label =
      lower == null
        ? `< ${formatIndicator(upper, indicator)}`
        : upper == null
          ? `≥ ${formatIndicator(lower, indicator)}`
          : `${formatIndicator(lower, indicator)} a < ${formatIndicator(upper, indicator)}`;
    return { color, lower, upper, label: indicatorSettings[indicator].labels?.[index] || label };
  });
}
export function mapColor(value, indicator) {
  const index = indicatorClass(value, indicator);
  return index < 0 ? NO_DATA_COLOR : (indicatorSettings[indicator].colors || MAP_COLORS)[index];
}
// RFC 7946 and d3-geo use opposite exterior ring winding conventions.
// Normalize a copy so Brazilian polygons never render as the rest of the globe.
export function prepareGeography(collection) {
  if (collection?.type !== 'FeatureCollection' || !collection.features?.length)
    throw new Error('Malha inválida');
  return {
    ...collection,
    features: collection.features.map((feature) => {
      if (geoArea(feature) <= 2 * Math.PI) return feature;
      const geometry = feature.geometry;
      const reversePolygon = (polygon) => polygon.map((ring) => [...ring].reverse());
      return {
        ...feature,
        geometry: {
          ...geometry,
          coordinates:
            geometry.type === 'MultiPolygon'
              ? geometry.coordinates.map(reversePolygon)
              : reversePolygon(geometry.coordinates),
        },
      };
    }),
  };
}
export function municipalityId(feature) {
  const p = feature.properties || {};
  return String(
    p.codarea || p.CD_MUN || p.CD_GEOCMU || p.cod_ibge || p.id_municipio || feature.id || '',
  );
}
