import { displayNumber as num, displayMoney as money } from '../../../catalog/logic.js';
export function describeResult(data) {
  const rows = data.rows || [],
    s = data.summary;
  return `${num(s?.['Mesma organização'])} municípios mantiveram a organização líder; ${num(s?.['Fusão/incorporação'])} transições envolvem fusões ou incorporações no par encerrado no ano selecionado.`;
}
