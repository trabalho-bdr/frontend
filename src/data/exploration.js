export const normalizeSearch = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function findEvidence(rows, query) {
  const term = normalizeSearch(query.trim());
  return !term
    ? rows
    : rows.filter((row) =>
        normalizeSearch(
          Object.values(row)
            .filter((v) => v != null && typeof v !== 'object')
            .join(' '),
        ).includes(term),
      );
}
export function ratio(a, b) {
  return a != null && b > 0 ? (100 * a) / b : null;
}
export function comparisonMetrics(question, data) {
  if (!data?.summary || ['em_validacao', 'fonte_pendente'].includes(data.status)) return [];
  const s = data.summary,
    rows = data.rows || [],
    n = (key, label, unit = 'number') => ({ key, label, value: s[key] ?? null, unit });
  if (question === 1)
    return [
      n('valor', 'Despesa nominal de todos por eleito', 'money'),
      n('mediana', 'Mediana dos eleitos', 'money'),
      n('candidaturas', 'Candidaturas'),
    ];
  if (question === 2) {
    const eligible = rows.filter((r) => r.valor != null),
      first = eligible[0],
      last = eligible.at(-1);
    return [
      {
        key: 'primeira',
        label: 'Taxa no primeiro grupo publicado',
        value: first?.valor ?? null,
        unit: 'percent',
      },
      {
        key: 'ultima',
        label: 'Taxa no último grupo publicado',
        value: last?.valor ?? null,
        unit: 'percent',
      },
      n('conhecidos', 'Patrimônio conhecido'),
    ];
  }
  if ([3, 6].includes(question))
    return [
      n('pearson', 'Correlação linear', 'coefficient'),
      n('spearman', 'Correlação por postos', 'coefficient'),
      n('n', 'Municípios com pares completos'),
    ];
  if (question === 4) {
    const row = rows.find((r) => r.grupo === 'Superior completo');
    return [
      {
        key: 'candidatos',
        label: 'Candidaturas com superior completo',
        value: row?.valor ?? null,
        unit: 'percent',
      },
      {
        key: 'eleitores',
        label: 'Eleitorado com superior completo',
        value: row?.referencia ?? null,
        unit: 'percent',
      },
      n('n', 'Municípios com pares completos'),
    ];
  }
  if (question === 5) {
    const row = rows.find((r) => Number(r.ano) === Number(data.scope?.ano));
    return [
      {
        key: 'legenda',
        label: 'Voto de legenda no ano selecionado',
        value: row?.valor ?? null,
        unit: 'percent',
      },
      {
        key: 'total',
        label: 'Votos no ano selecionado',
        value: row?.total ?? null,
        unit: 'number',
      },
    ];
  }
  if (question === 7) {
    const total = Object.values(s).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    return [
      {
        key: 'estavel',
        label: 'Mesma organização líder',
        value: ratio(s['Mesma organização'], total),
        unit: 'percent',
      },
      { key: 'municipios', label: 'Municípios comparáveis', value: total || null, unit: 'number' },
    ];
  }
  if (question === 8) {
    const total =
      s.publico == null || s.privado == null
        ? null
        : s.publico + s.privado + (s.nao_classificado || 0);
    return [
      {
        key: 'publico',
        label: 'Parcela pública nas receitas vinculadas',
        value: s.nao_classificado ? null : ratio(s.publico, total),
        unit: 'percent',
      },
      {
        key: 'vinculo',
        label: 'Candidaturas vinculadas à prestação final',
        value: ratio(s.com_receita_final, s.candidaturas),
        unit: 'percent',
      },
      n('com_receita_positiva', 'Receita financeira positiva'),
    ];
  }
  if (question === 10) {
    const row = rows.find((r) => r.grupo.startsWith('Retorno'));
    return [
      n('pessoas', 'Pessoas observadas'),
      {
        key: 'retornos',
        label: 'Retorno após intervalo maior que quatro anos',
        value: s.pessoas > 0 ? (row?.valor ?? 0) : null,
        unit: 'percent',
      },
      n('mais_de_um_cargo', 'Mais de um cargo observado'),
    ];
  }
  return [];
}
export function seatInk(person, mode, colors) {
  if (mode === 'partido') return colors[person.partido] || '#7d898a';
  if (mode === 'escolaridade') {
    const value = person.escolaridade;
    if (!value || value.startsWith('#') || /NÃO|NAO|SEM INFORMA/i.test(value)) return '#929b9c';
    return value.includes('SUPERIOR COMPLETO') ? '#173e78' : '#245b4d';
  }
  const value = mode === 'patrimonio' ? person.patrimonio : person.gastos;
  return value == null ||
    String(value).trim() === '' ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0
    ? '#929b9c'
    : Number(value) === 0
      ? '#245b4d'
      : value <= 10000
        ? '#ddb643'
        : value <= 100000
          ? '#173e78'
          : '#a63c30';
}
