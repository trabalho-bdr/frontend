import { displayNumber as num } from '../../../catalog/logic.js';

export function describeRateContrast(data) {
  const valid = (data.rows || []).filter(
    (row) => row.valor != null && row.grupo !== 'Origem incompleta',
  );
  if (valid.length < 2)
    return 'Há apenas um grupo com taxa conhecida; não há contraste suficiente neste recorte.';
  const lo = valid[0],
    hi = valid.at(-1);
  return `${lo.grupo}: ${num(lo.valor)}% de eleição. ${hi.grupo}: ${num(hi.valor)}%. A comparação é descritiva.`;
}

export function describeMunicipalCorrelation(data) {
  const summary = data.summary;
  return summary?.pearson != null
    ? `Entre ${num(summary.n)} municípios com os dois valores, a correlação linear é ${num(summary.pearson)}. Isso descreve o território, sem revelar o voto individual.`
    : 'Escolha um partido ou um recorte com pares completos para comparar os indicadores.';
}
