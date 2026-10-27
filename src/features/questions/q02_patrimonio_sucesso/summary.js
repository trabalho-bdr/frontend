import { displayNumber as num } from '../../../catalog/logic.js';
import { comRotulos } from './labels.js';

// Versão própria de describeRateContrast (shared/summaries.js) que usa a
// faixa de patrimônio do grupo como rótulo, em vez de "Decil N" ou
// "Nº quartil" — mesma lógica de seleção dos extremos do contraste.
export function describeResult(data) {
  const { rows } = comRotulos(data);
  const valid = rows.filter((row) => row.valor != null);
  if (valid.length < 2)
    return 'Há apenas um grupo com taxa conhecida; não há contraste suficiente neste recorte.';
  const lo = valid[0],
    hi = valid.at(-1);
  return `${lo.rotulo}: ${num(lo.valor)}% de eleição. ${hi.rotulo}: ${num(hi.valor)}%. A comparação é descritiva.`;
}
