import { MAP_COLORS, NO_DATA_COLOR, hasIndicatorValue } from './geography.js';
export function researchScale(definition) {
  const { breaks, unit = 'number', colors = MAP_COLORS } = definition;
  const format = (value) =>
    !hasIndicatorValue(value)
      ? 'Sem dados neste recorte'
      : (unit === 'money' ? 'R$ ' : '') +
        Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) +
        (unit === 'percent' ? '%' : unit === 'pp' ? ' p.p.' : '');
  return {
    format,
    color: (value) =>
      !hasIndicatorValue(value)
        ? NO_DATA_COLOR
        : colors[breaks.filter((b) => Number(value) >= b).length],
    legend: colors.map((color, i) => ({
      color,
      label:
        i === 0
          ? '< ' + format(breaks[0])
          : i === breaks.length
            ? '≥ ' + format(breaks.at(-1))
            : format(breaks[i - 1]) + ' a < ' + format(breaks[i]),
    })),
  };
}
