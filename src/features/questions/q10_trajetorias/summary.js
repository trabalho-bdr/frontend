import { displayNumber as num, displayMoney as money } from '../../../catalog/logic.js';
export function describeResult(data) {
  const rows = data.rows || [],
    s = data.summary;
  const returns = rows.find((r) => r.grupo.startsWith('Retorno')),
    single = rows.find((r) => r.grupo.startsWith('Uma eleição'));
  return `Entre ${num(s?.pessoas)} pessoas com identidade consistente, ${num(single?.valor || 0)}% têm uma eleição observada e ${num(returns?.valor || 0)}% apresentam retorno após intervalo maior que quatro anos. A cobertura é limitada ao acervo.`;
}
