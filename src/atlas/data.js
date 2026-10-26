import { getMunicipios } from '../data/client.js';
import { states } from '../data/catalog.js';
import { hasIndicatorValue } from './geography.js';

// 1,236 municipalities in the six existing meshes, below the endpoint's 1,500
// row limit. Never send the list's text search: it must not empty the map.
export async function loadAtlasMunicipios(uf, load = getMunicipios) {
  const rows = await load({ uf, limit: 1500 });
  if (!Array.isArray(rows)) throw new Error('Resposta municipal inválida');
  const eligible = rows.filter(
    (row) => states.some((state) => state.uf === row.uf) && (!uf || row.uf === uf),
  );
  return [...new Map(eligible.map((row) => [String(row.id), row])).values()];
}
export function atlasCoverage(rows, indicator, uf) {
  const total = new Set(rows.filter((row) => !uf || row.uf === uf).map((row) => String(row.id)))
    .size;
  const unique = new Map(
    rows.filter((row) => !uf || row.uf === uf).map((row) => [String(row.id), row]),
  );
  const loaded = unique.size;
  const withValue = [...unique.values()].filter((row) => hasIndicatorValue(row[indicator])).length;
  return {
    total,
    loaded,
    unloaded: Math.max(0, total - loaded),
    withValue,
    withoutValue: Math.max(0, total - withValue),
  };
}
export function filterAtlasRows(rows, text, indicator, order) {
  const normalize = (value) =>
    String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  const query = normalize(text).trim();
  return rows
    .filter((row) => !query || normalize(row.nome).includes(query))
    .sort((a, b) => {
      const x = a[indicator],
        y = b[indicator];
      if (!hasIndicatorValue(x)) return hasIndicatorValue(y) ? 1 : 0;
      if (!hasIndicatorValue(y)) return -1;
      return (Number(x) - Number(y)) * (order === 'asc' ? 1 : -1);
    });
}

export function territorialFindings(rows, indicator) {
  const values = rows.filter((row) => hasIndicatorValue(row[indicator]));
  if (!values.length) return null;
  const ordered = [...values].sort(
    (a, b) =>
      Number(a[indicator]) - Number(b[indicator]) || String(a.id).localeCompare(String(b.id)),
  );
  return {
    minimum: ordered[0],
    maximum: ordered.at(-1),
    range: Number(ordered.at(-1)[indicator]) - Number(ordered[0][indicator]),
    count: ordered.length,
  };
}
