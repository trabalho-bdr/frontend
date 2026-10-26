import { catalogRangeError } from '../data/filterScope.js';
import { isComparable, canOrderVotes } from './logic.js';
export function peopleSearchError(filters) {
  return (
    catalogRangeError(filters) ||
    (/^\d+$/.test(filters.q.trim()) && !isComparable(filters)
      ? 'Para buscar um número eleitoral, selecione ano, cargo, estado e município nas eleições municipais.'
      : '')
  );
}
export function peopleSearchOrder(order, filters) {
  return (order === 'votos' && !canOrderVotes(filters)) ||
    (order === 'gastos' && !isComparable(filters))
    ? 'recentes'
    : order;
}
