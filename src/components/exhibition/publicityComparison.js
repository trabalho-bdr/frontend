import { isMunicipalOffice } from './publicityScope.js';

export const formatPercent = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  if (value > 0 && value < 0.1) return '<0,1%';
  if (value < 0 && value > -0.1) return '>−0,1%';
  return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
};
export const formatPoints = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  if (value !== 0 && Math.abs(value) < 0.1) return `${value > 0 ? '+' : '−'}<0,1 p.p.`;
  return `${value > 0 ? '+' : ''}${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`;
};
export const formatMoney = (value) =>
  value == null
    ? '—'
    : Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

// Stable colours depend only on the existing group label, never on its rank/year.
const colours = [
  '#174a8b',
  '#bc512a',
  '#176b50',
  '#8c467d',
  '#a46c0c',
  '#507886',
  '#6b6154',
  '#883d3d',
];
export function modalityColour(label) {
  const hash = [...label].reduce(
    (value, character) => (value * 31 + character.codePointAt(0)) >>> 0,
    0,
  );
  return colours[hash % colours.length];
}

export function comparisonQuery({ scope, mode, party, person, before, after }) {
  if (!before || !after || before >= after || (mode === 'partido' ? !party : !person?.id_candidato))
    return null;
  const municipal = isMunicipalOffice(scope.cargo);
  const uf = scope.uf || (mode === 'candidato' ? person?.uf : '');
  const town = municipal
    ? scope.municipioId || (mode === 'candidato' ? person?.id_municipio : '')
    : '';
  if (mode === 'candidato' && (!uf || (municipal && !town))) return null;
  const query = new URLSearchParams({
    cargo: scope.cargo,
    criterio: scope.criterio || 'sugeridas',
    ano_antes: String(before),
    ano_depois: String(after),
    [mode === 'partido' ? 'id_partido' : 'id_candidato']:
      mode === 'partido' ? party : person.id_candidato,
  });
  if (uf) query.set('uf', uf);
  if (town) query.set('id_municipio', String(town));
  return query.toString();
}

export function biggestChanges(rows) {
  return rows
    .filter((row) => row.delta_pp != null && row.delta_pp !== 0)
    .sort((a, b) => Math.abs(b.delta_pp) - Math.abs(a.delta_pp) || a.grupo.localeCompare(b.grupo))
    .slice(0, 2);
}

// The key also hides a previous result immediately, before React runs cleanup.
export function currentComparison(state, key) {
  return key && state?.key === key ? state : null;
}
