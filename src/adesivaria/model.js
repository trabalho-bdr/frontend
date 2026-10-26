const sampleCandidates = [];
const sampleExpenses = {};
const municipiosAmostra = [];

export const MATERIALS = {
  todos: 'Conjunto classificado',
  adesivos: 'Adesivos',
  santinhos: 'Santinhos',
  bandeiras: 'Bandeiras',
};
export const PAGE_SIZE = 12;
export const normalized = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
export const known = (value) =>
  (typeof value === 'number' || typeof value === 'string') &&
  String(value).trim() !== '' &&
  Number.isFinite(Number(value));
export const num = (value) =>
  known(value)
    ? Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
    : 'Não informado';
export const money = (value) =>
  known(value)
    ? Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2,
      })
    : 'Não informado';
export const ratio = (value, max) =>
  known(value) && Number(max) > 0
    ? Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100))
    : 0;
export const sumKnown = (values) => {
  const valid = values.filter(known);
  return valid.length ? valid.reduce((sum, value) => sum + Number(value), 0) : null;
};
export const municipalOffice = (office) => ['VEREADOR', 'PREFEITO'].includes(office);
export const candidateScope = (c) =>
  `${c.ano} · ${c.cargo} · ${municipalOffice(c.cargo) ? `${c.municipio || 'Município não informado'} / ` : ''}${c.uf} · 1º turno`;
export function classify(description) {
  const text = normalized(description).trim();
  if (
    /(^|[^A-Z])(INSTALACAO|RETIRADA|REMOCAO|DISTRIBUICAO|COLAGEM|ADESIVAGEM|LOCACAO|MAO DE OBRA|BANNERS?|PANFLETOS?|FOLHETOS?|CARTAZ(ES)?|FAIXAS?|OUTDOORS?|CAMISETAS?|BRINDES?|BANDEIROLAS?|CRACHAS?|COLINHAS?)([^A-Z]|$)/.test(
      text,
    )
  )
    return null;
  const nouns = [
    /(^|[^A-Z])ADESIV[OA]S?([^A-Z]|$)/,
    /(^|[^A-Z])SANTINH[OA]S?([^A-Z]|$)/,
    /(^|[^A-Z])BANDEIRAS?([^A-Z]|$)/,
  ];
  if (nouns.filter((pattern) => pattern.test(text)).length > 1) return null;
  const prefix = '^(?:(?:AQUISICAO|COMPRA|CONFECCAO|IMPRESSAO|FORNECIMENTO|PRODUCAO)(?: DE)?\\s+)?';
  const patterns = [
    ['Adesivos', 'ADESIV(?:O|OS|A|AS)'],
    ['Santinhos', 'SANTINH(?:O|OS|A|AS)'],
    ['Bandeiras', 'BANDEIRAS?'],
  ];
  return (
    patterns.find(([, pattern]) => new RegExp(prefix + pattern + '(?:[^A-Z]|$)').test(text))?.[0] ||
    null
  );
}
export const offlineCandidates = sampleCandidates.map((row) => ({
  ...row,
  municipio_id: municipiosAmostra.find(
    (town) => town.uf === row.uf && normalized(town.nome) === normalized(row.municipio),
  )?.id,
}));
export const offlineTowns = municipiosAmostra.filter((town) =>
  offlineCandidates.some((row) => row.municipio_id === town.id),
);
export function filterCandidates(rows, scope) {
  return rows.filter(
    (row) =>
      Number(row.ano) === Number(scope.ano) &&
      row.cargo === scope.cargo &&
      (!scope.uf || row.uf === scope.uf) &&
      (!scope.partido || normalized(row.partido) === normalized(scope.partido)) &&
      (!scope.municipio || row.municipio_id === scope.municipio),
  );
}
const compareText = (a, b) => (String(a) === String(b) ? 0 : String(a) < String(b) ? -1 : 1);
export function ordered(rows, key) {
  return [...rows]
    .filter((row) => known(row[key]))
    .sort(
      (a, b) =>
        Number(b[key]) - Number(a[key]) || compareText(a.nome, b.nome) || compareText(a.id, b.id),
    );
}
function groupsFor(entries) {
  return ['Adesivos', 'Santinhos', 'Bandeiras'].flatMap((tipo) => {
    const list = entries.filter((row) => row.tipo === tipo);
    return list.length
      ? [
          {
            tipo,
            registros: list.length,
            valores_informados: list.filter((row) => known(row.valor)).length,
            valor: sumKnown(list.map((row) => row.valor)),
            candidaturas: new Set(list.map((row) => row.candidate_id)).size,
          },
        ]
      : [];
  });
}
export function offlineData(
  scope,
  { offset = 0, offset_votos = 0, offset_categorias = 0, limit = PAGE_SIZE } = {},
) {
  const candidates = filterCandidates(offlineCandidates, scope);
  const raw = candidates.flatMap((c) =>
    (sampleExpenses[c.id] || []).map((row) => ({
      ...row,
      candidate_id: c.id,
      tipo: classify(row.categoria),
    })),
  );
  const selected = raw.filter(
    (row) => row.tipo && (scope.material === 'todos' || row.tipo === MATERIALS[scope.material]),
  );
  const enriched = candidates.map((c) => {
    const entries = selected.filter((row) => row.candidate_id === c.id);
    return {
      ...c,
      gastos_classificados: sumKnown(entries.map((row) => row.valor)),
      lancamentos: entries.length,
      valores_informados: entries.filter((row) => known(row.valor)).length,
    };
  });
  const expenses = ordered(enriched, 'gastos_classificados'),
    votes = ordered(enriched, 'votos');
  const expenseRanks = new Map(expenses.map((row, index) => [row.id, index + 1])),
    voteRanks = new Map(votes.map((row, index) => [row.id, index + 1]));
  const rank = (row) => ({
    ...row,
    posicao_gastos: expenseRanks.get(row.id) ?? null,
    posicao_votos: voteRanks.get(row.id) ?? null,
  });
  const parties = [...new Set(enriched.map((c) => c.partido || 'Não informado'))]
    .flatMap((partido) => {
      const rows = enriched.filter((c) => (c.partido || 'Não informado') === partido),
        included = rows.filter((c) => c.lancamentos > 0);
      return included.length
        ? [
            {
              partido,
              candidaturas_recorte: rows.length,
              candidaturas: included.length,
              valores_informados: included.filter((c) => known(c.gastos_classificados)).length,
              lancamentos: included.reduce((sum, c) => sum + c.lancamentos, 0),
              valor: sumKnown(included.map((c) => c.gastos_classificados)),
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        (known(b.valor) ? Number(b.valor) : -Infinity) -
          (known(a.valor) ? Number(a.valor) : -Infinity) || compareText(a.partido, b.partido),
    );
  const categories = [...new Set(selected.map((row) => row.categoria))]
    .map((categoria) => {
      const entries = selected.filter((row) => row.categoria === categoria);
      return {
        categoria,
        tipo: entries[0].tipo,
        registros: entries.length,
        valores_informados: entries.filter((row) => known(row.valor)).length,
        valor: sumKnown(entries.map((row) => row.valor)),
        candidaturas: new Set(entries.map((row) => row.candidate_id)).size,
      };
    })
    .sort(
      (a, b) =>
        (known(b.valor) ? Number(b.valor) : -Infinity) -
          (known(a.valor) ? Number(a.valor) : -Infinity) || compareText(a.categoria, b.categoria),
    );
  return {
    scope,
    source: 'amostra',
    partial: true,
    stats: {
      candidaturas: candidates.length,
      candidaturas_material: enriched.filter((c) => c.lancamentos > 0).length,
      candidaturas_valor: expenses.length,
      candidaturas_votos: votes.length,
      maior_votacao: votes[0]?.votos ?? null,
      lider_votos_id: votes[0]?.id ?? null,
      lider_votos_nome: votes[0]?.nome ?? null,
      lancamentos: selected.length,
      valores_informados: selected.filter((row) => known(row.valor)).length,
      valor: sumKnown(selected.map((row) => row.valor)),
      lancamentos_recorte: raw.length,
      lancamentos_classificados: raw.filter((row) => row.tipo).length,
      lancamentos_nao_classificados: raw.filter((row) => !row.tipo).length,
      candidaturas_classificadas: new Set(
        raw.filter((row) => row.tipo).map((row) => row.candidate_id),
      ).size,
      categorias: categories.length,
      resultados_conflitantes: 0,
    },
    groups: groupsFor(raw),
    podium: expenses.slice(0, 3).map(rank),
    candidates: expenses.slice(offset, offset + limit).map(rank),
    votes: votes.slice(offset_votos, offset_votos + limit).map(rank),
    parties,
    categories: categories.slice(offset_categorias, offset_categorias + 25),
    limit,
    offset,
    offset_votos,
    offset_categorias,
  };
}
export function offlineDetail(id, scope, offset = 0) {
  const all = offlineData(scope, { limit: 24 }),
    c = filterCandidates(offlineCandidates, scope).find((row) => row.id === id);
  if (!c) return null;
  const raw = (sampleExpenses[id] || []).map((row) => ({
    ...row,
    candidate_id: id,
    tipo: classify(row.categoria),
  }));
  const selected = raw.filter(
    (row) => row.tipo && (scope.material === 'todos' || row.tipo === MATERIALS[scope.material]),
  );
  const candidate = {
    ...c,
    gastos_classificados: sumKnown(selected.map((row) => row.valor)),
    lancamentos: selected.length,
    posicao_gastos: all.candidates.find((row) => row.id === id)?.posicao_gastos ?? null,
    posicao_votos: all.votes.find((row) => row.id === id)?.posicao_votos ?? null,
  };
  return {
    candidate,
    groups: groupsFor(raw),
    entries: [...selected]
      .sort(
        (a, b) =>
          (known(b.valor) ? Number(b.valor) : -Infinity) -
          (known(a.valor) ? Number(a.valor) : -Infinity),
      )
      .slice(offset, offset + 10),
    total: selected.length,
    limit: 10,
    offset,
    partial: true,
    source: 'amostra',
  };
}
