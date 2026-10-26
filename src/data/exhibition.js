import { request } from './client.js';
export const themes = [
  {
    id: 'dinheiro',
    title: 'Dinheiro e poder',
    description: 'Gastos, patrimônio, financiamento e propaganda.',
    page: 'campanhas',
    places: [['campanhas', 'Dinheiro e poder']],
  },
  {
    id: 'voto',
    title: 'Votos e representação',
    description: 'Nomes, siglas e a conquista de uma cadeira.',
    page: 'plenario',
    places: [
      ['plenario', 'Plenário'],
      ['partidos', 'Mural dos Partidos'],
    ],
  },
  {
    id: 'mapa',
    title: 'Territórios e eleições',
    description: 'Abstenção, municípios e diferenças territoriais.',
    page: 'atlas',
    places: [
      ['atlas', 'Atlas'],
      ['descobertas', 'Rankings do acervo'],
    ],
  },
  {
    id: 'pessoas',
    title: 'Pessoas e trajetórias',
    description: 'Escolaridade, eleitorado e trajetórias.',
    page: 'arquivo',
    places: [['arquivo', 'Fichário']],
  },
];
export const questionDestinations = {
  1: ['campanhas', 'custo'],
  2: ['campanhas', 'patrimonio'],
  3: ['atlas', 'territorio'],
  4: ['arquivo', 'escolaridade'],
  5: ['partidos', 'legenda'],
  6: ['arquivo', 'juventude'],
  7: ['atlas', 'lideranca'],
  8: ['campanhas', 'financiamento'],
  9: ['campanhas', 'publicidade'],
  10: ['arquivo', 'trajetorias'],
};
export function savedEvidence(kind, params = {}) {
  return null;
}
export async function loadEvidence(kind, params = {}, options = {}) {
  return request('/exposicao/' + kind + '?' + new URLSearchParams(params), options);
}
export const fmt = (n, d = 2) =>
  n == null ? 'Não informado' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d });
export const brl = (n) =>
  n == null
    ? 'Não informado'
    : Number(n).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      });
export function correlation(rows, x, y) {
  const valid = rows.filter((r) => Number.isFinite(r[x]) && Number.isFinite(r[y]));
  if (valid.length < 3) return null;
  const mx = valid.reduce((s, r) => s + r[x], 0) / valid.length,
    my = valid.reduce((s, r) => s + r[y], 0) / valid.length;
  const a = valid.reduce((s, r) => s + (r[x] - mx) * (r[y] - my), 0),
    b = Math.sqrt(
      valid.reduce((s, r) => s + (r[x] - mx) ** 2, 0) *
        valid.reduce((s, r) => s + (r[y] - my) ** 2, 0),
    );
  return b ? a / b : null;
}
export function transitions(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = JSON.stringify([r.origem, r.destino]);
    map.set(key, { origem: r.origem, destino: r.destino, total: (map.get(key)?.total || 0) + 1 });
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
export function csvDownload(rows, name) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]),
    cell = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  const csv =
    '\uFEFF' +
    [keys, ...rows.map((r) => keys.map((k) => r[k]))]
      .map((r) => r.map(cell).join(';'))
      .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
