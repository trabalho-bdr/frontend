/** Transformações puras: usadas pelo gráfico e pelos testes. */
export function comparisonMetrics(kind) {
  const definitions = {
    legenda: [['valor', 'Percentual de legenda']],
    abstencao: [['valor', 'Taxa de abstenção']],
    cadeiras: [
      ['valor', 'Gasto por eleito'],
      ['gasto_total', 'Despesas totais'],
    ],
    escolaridade: [
      ['valor', 'Taxa de eleitos'],
      ['candidaturas', 'Nº de candidaturas'],
    ],
    propaganda: [
      ['valor', 'Despesa declarada'],
      ['lancamentos', 'Nº de lançamentos'],
    ],
    patrimonio: [
      ['valor', 'Taxa de eleição'],
      ['mediana', 'Patrimônio mediano'],
    ],
    fichas: [
      ['votos', 'Votos'],
      ['gastos', 'Despesas'],
      ['patrimonio', 'Patrimônio'],
    ],
    municipios: [
      ['abstencao_2024', 'Abstenção 2024'],
      ['idhm', 'IDHM registrado'],
      ['pib_per_capita', 'PIB por habitante'],
      ['populacao', 'População'],
    ],
  };
  return (definitions[kind] || definitions.legenda).map(([key, label]) => ({ key, label }));
}
export function isComparableCandidates(candidates = []) {
  if (candidates.length < 2) return true;
  return candidates.every(
    (c) =>
      c.ano === candidates[0].ano && c.cargo === candidates[0].cargo && c.uf === candidates[0].uf,
  );
}
export function formatComparisonValue(value, metric, kind) {
  if (value == null || value === '') return 'Sem registro';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Sem registro';
  const money =
    kind === 'cadeiras' ||
    (kind === 'propaganda' && metric === 'valor') ||
    (kind === 'patrimonio' && metric === 'mediana') ||
    (kind === 'fichas' && ['gastos', 'patrimonio'].includes(metric)) ||
    (kind === 'municipios' && metric === 'pib_per_capita');
  if (money)
    return n.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    });
  if (
    (['legenda', 'abstencao', 'escolaridade', 'patrimonio'].includes(kind) && metric === 'valor') ||
    (kind === 'municipios' && metric === 'abstencao_2024')
  )
    return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
export function buildComparisonChart(kind, rows = [], metric = 'valor', expectedYears = null) {
  const raw = rows || [];
  if (['legenda', 'abstencao', 'cadeiras', 'propaganda'].includes(kind)) {
    const years = [
      ...new Set([
        ...(expectedYears || []),
        ...raw.map((r) => Number(r.ano)).filter(Number.isFinite),
      ]),
    ].sort((a, b) => a - b);
    const series = [...new Set(raw.map((r) => String(r.serie)))].sort();
    const points = years.map((y) => {
      const result = { periodo: String(y) };
      for (const s of series) {
        const record = raw.find((r) => Number(r.ano) === y && String(r.serie) === s);
        result[s] = record?.[metric] == null ? null : Number(record[metric]);
      }
      return result;
    });
    return { type: 'line', points, series, raw };
  }
  const valueKey = ['fichas', 'municipios'].includes(kind) ? 'valor' : metric;
  const points = raw
    .map((r) => ({
      rotulo: String(kind === 'patrimonio' ? 'Quartil ' + r.quartil : r.serie || '—'),
      valor: r[valueKey] == null ? null : Number(r[valueKey]),
    }))
    .filter((r) => r.rotulo);
  return { type: kind === 'escolaridade' ? 'bar-horizontal' : 'bar', points, series: [], raw };
}
