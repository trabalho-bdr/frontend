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
// Frase em linguagem simples para o coeficiente de Pearson, no lugar de
// mostrar Pearson e Spearman como números crus (estatística complexa para
// o público geral deste acervo).
export function describeCorrelation(pearson) {
  if (pearson == null || !Number.isFinite(pearson)) return null;
  const abs = Math.abs(pearson);
  const forca =
    abs < 0.1
      ? 'quase nenhuma relação perceptível entre os dois indicadores'
      : abs < 0.3
        ? 'uma relação fraca entre os dois indicadores'
        : abs < 0.5
          ? 'uma relação moderada entre os dois indicadores'
          : abs < 0.7
            ? 'uma relação forte entre os dois indicadores'
            : 'uma relação muito forte entre os dois indicadores';
  if (abs < 0.1) return `Os municípios mostram ${forca}.`;
  const direcao =
    pearson > 0
      ? 'nos municípios onde um indicador é maior, o outro também tende a ser maior'
      : 'nos municípios onde um indicador é maior, o outro tende a ser menor';
  return `Os municípios mostram ${forca}: ${direcao}.`;
}
// Reta de tendência (mínimos quadrados) sobre pares {x, y} válidos — uma
// pista visual de direção que substitui o coeficiente bruto no gráfico.
export function linearTrend(points) {
  const valid = (points || []).filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y));
  if (valid.length < 3) return null;
  const n = valid.length;
  const meanX = valid.reduce((a, p) => a + p.x, 0) / n;
  const meanY = valid.reduce((a, p) => a + p.y, 0) / n;
  const den = valid.reduce((a, p) => a + (p.x - meanX) ** 2, 0);
  if (den === 0) return null;
  const num = valid.reduce((a, p) => a + (p.x - meanX) * (p.y - meanY), 0);
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  const xs = valid.map((p) => p.x);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  return {
    slope,
    intercept,
    from: { x: minX, y: slope * minX + intercept },
    to: { x: maxX, y: slope * maxX + intercept },
  };
}
// Municípios cujo valor em `key` foge muito do restante (regra de Tukey:
// fora de 1.5× a distância interquartil), para identificar o ponto que
// "estica" o gráfico em vez de deixá-lo anônimo e sem explicação.
export function detectOutliers(points, key) {
  const valid = (points || []).filter((p) => Number.isFinite(p?.[key]));
  if (valid.length < 5) return [];
  const sorted = [...valid].sort((a, b) => a[key] - b[key]);
  const quartile = (q) => {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined
      ? sorted[base][key] + rest * (sorted[base + 1][key] - sorted[base][key])
      : sorted[base][key];
  };
  const q1 = quartile(0.25),
    q3 = quartile(0.75),
    iqr = q3 - q1;
  if (iqr === 0) return [];
  const low = q1 - 1.5 * iqr,
    high = q3 + 1.5 * iqr;
  return valid.filter((p) => p[key] < low || p[key] > high);
}
// Grupo de patrimônio com a maior taxa de eleição num conjunto de linhas da
// pergunta 2 (decis/quartis + zero declarado). Usado só para uma frase de
// apoio no painel de comparação — não é um gráfico.
// Compara o primeiro e o último grupo de uma série ordenada (ex.: "Sem
// fundos públicos" vs. "Mais de 75% público"), ignorando grupos que não são
// pontos da escala principal (como "Origem incompleta"). Generaliza, para
// qualquer gráfico de barras por grupo, a mesma lógica de extremos usada em
// patrimônio (q02_patrimonio_sucesso/labels.js), que é específica daquele
// formato de dados (decis/quartis).
export function rateExtremes(rows, excludedGroups = []) {
  const valid = (rows || []).filter((r) => r.valor != null && !excludedGroups.includes(r.grupo));
  if (valid.length < 2) return null;
  const lo = valid[0],
    hi = valid[valid.length - 1];
  if (lo.valor === 0 && hi.valor === 0) return { lo, hi, percentual: 0 };
  if (lo.valor === 0 || hi.valor === 0) return { lo, hi, percentual: null, semBase: true };
  const percentual =
    hi.valor >= lo.valor ? 100 * (hi.valor / lo.valor - 1) : -100 * (lo.valor / hi.valor - 1);
  return { lo, hi, percentual };
}
// Taxa "encolhida" para a média geral: soma k candidaturas imaginárias à
// taxa média a cada grupo, antes de calcular a taxa. Grupos com poucas
// candidaturas de verdade (n pequeno comparado a k) ficam quase na média;
// grupos com muitas (n grande comparado a k) quase não mudam. É a mesma
// ideia usada em recomendação e esporte para não deixar amostras pequenas
// parecerem artificialmente ótimas ou péssimas.
export function shrinkRate(eleitos, definidos, mediaGeralPct, k = 30) {
  if (eleitos == null || definidos == null || mediaGeralPct == null) return null;
  const mediaGeralFrac = mediaGeralPct / 100;
  return (100 * (eleitos + k * mediaGeralFrac)) / (definidos + k);
}
export function mostElectedGroup(rows) {
  const valid = (rows || []).filter((r) => r.valor != null);
  if (!valid.length) return null;
  return [...valid].sort((a, b) => b.valor - a.valor)[0];
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
    // Sem o zero declarado: ele é ausência de patrimônio, não "o mais pobre".
    const positivos = rows
      .filter((r) => r.faixa !== 0 && r.valor != null)
      .sort((a, b) => a.mediana - b.mediana);
    const maisPobre = positivos[0],
      maisRico = positivos[positivos.length - 1];
    const diferenca =
      !maisPobre || !maisRico || maisPobre.valor == null || maisRico.valor == null
        ? null
        : maisPobre.valor === 0 && maisRico.valor === 0
          ? 0
          : maisPobre.valor === 0
            ? null
            : maisRico.valor >= maisPobre.valor
              ? 100 * (maisRico.valor / maisPobre.valor - 1)
              : -100 * (maisPobre.valor / maisRico.valor - 1);
    return [
      {
        key: 'taxa_mais_pobre',
        label: 'Taxa de eleição — grupo mais pobre (sem zero declarado)',
        value: maisPobre?.valor ?? null,
        unit: 'percent',
      },
      {
        key: 'taxa_mais_rico',
        label: 'Taxa de eleição — grupo mais rico',
        value: maisRico?.valor ?? null,
        unit: 'percent',
      },
      {
        key: 'diferenca_extremos',
        label: 'Diferença de chance (rico sobre pobre)',
        value: diferenca,
        unit: 'percent',
      },
      {
        key: 'patrimonio_mediano_rico',
        label: 'Patrimônio mediano — grupo mais rico',
        value: maisRico?.mediana ?? null,
        unit: 'money',
      },
      {
        key: 'patrimonio_mediano_pobre',
        label: 'Patrimônio mediano — grupo mais pobre',
        value: maisPobre?.mediana ?? null,
        unit: 'money',
      },
      n('conhecidos', 'Candidaturas com patrimônio conhecido'),
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
    const diferenca =
      row?.valor != null && row?.referencia != null ? row.valor - row.referencia : null;
    return [
      {
        key: 'candidatos_superior',
        label: 'Candidaturas com superior completo',
        value: row?.valor ?? null,
        unit: 'percent',
      },
      {
        key: 'eleitorado_superior',
        label: 'Eleitorado com superior completo',
        value: row?.referencia ?? null,
        unit: 'percent',
      },
      {
        key: 'diferenca_superior',
        label: 'Diferença — candidaturas menos eleitorado (p.p.)',
        value: diferenca,
        unit: 'number',
      },
      n('n', 'Municípios comparados'),
      n('candidatos_conhecidos', 'Candidaturas com escolaridade conhecida'),
      n('eleitores_conhecidos', 'Eleitorado com escolaridade conhecida'),
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
    const semPublico = rows.find((r) => r.grupo === 'Sem fundos públicos');
    const maisPublico = rows.find((r) => r.grupo === 'Mais de 75% público');
    return [
      {
        key: 'publico',
        label: 'Parcela pública nas receitas (fundo especial/partidário)',
        value: s.nao_classificado ? null : ratio(s.publico, total),
        unit: 'percent',
      },
      {
        key: 'privado',
        label: 'Parcela de outros recursos declarados nas receitas',
        value: s.nao_classificado ? null : ratio(s.privado, total),
        unit: 'percent',
      },
      {
        key: 'taxa_sem_publico',
        label: 'Taxa de eleição — sem fundos públicos',
        value: semPublico?.valor ?? null,
        unit: 'percent',
      },
      {
        key: 'taxa_mais_publico',
        label: 'Taxa de eleição — mais de 75% de fundos públicos',
        value: maisPublico?.valor ?? null,
        unit: 'percent',
      },
      {
        key: 'vinculo',
        label: 'Candidaturas vinculadas à prestação final',
        value: ratio(s.com_receita_final, s.candidaturas),
        unit: 'percent',
      },
      n('com_receita_positiva', 'Candidaturas com receita financeira positiva'),
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
// Um tom por grau de instrução, do menos ao mais escolarizado — mesma ordem
// usada em SCHOOLS (server/questions/shared/scope.py). A cor cinza (sem
// informação) continua reservada para quando o dado não existe na fonte.
export const SCHOOL_LEVELS = [
  ['ANALFABETO', 'Analfabeto', '#a63c30'],
  ['LEEESCREVE', 'Lê e escreve', '#c97a4a'],
  ['FUNDAMENTALINCOMPLETO', 'Fundamental incompleto', '#ddb643'],
  ['FUNDAMENTALCOMPLETO', 'Fundamental completo', '#b5a43a'],
  ['MEDIOINCOMPLETO', 'Médio incompleto', '#6b8f3f'],
  ['MEDIOCOMPLETO', 'Médio completo', '#245b4d'],
  ['SUPERIORINCOMPLETO', 'Superior incompleto', '#2f6b8f'],
  ['SUPERIORCOMPLETO', 'Superior completo', '#173e78'],
];
export const SCHOOL_UNKNOWN_COLOR = '#929b9c';
const SCHOOL_COLOR_BY_KEY = Object.fromEntries(SCHOOL_LEVELS.map(([key, , color]) => [key, color]));
// Mesma normalização do backend (facet_key/facet_sql): maiúsculas, sem
// acento, só letras/números, e sem o prefixo "ENSINO" de fundamental/médio.
function normalizeSchoolKey(value) {
  const upper = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!upper) return null;
  return upper.startsWith('ENSINO') ? upper.slice(6) : upper;
}
export function schoolColor(value) {
  if (!value || String(value).startsWith('#')) return SCHOOL_UNKNOWN_COLOR;
  const key = normalizeSchoolKey(value);
  return (key && SCHOOL_COLOR_BY_KEY[key]) || SCHOOL_UNKNOWN_COLOR;
}
// Faixas de participação de fundos públicos nas receitas — mesmas
// categorias do gráfico principal da pergunta 8 ("faixa_publico", calculada
// no servidor), com as cores pedidas (vermelho, amarelo, verde, azul, roxo
// no lugar de branco); "Origem incompleta" e ausência de dado caem no cinza
// já usado para "sem informação" nos outros modos de cor.
export const PUBLIC_FUNDING_LEVELS = [
  ['Sem fundos públicos', '#c0392b'],
  ['Até 25% público', '#e8b923'],
  ['25% a 50% público', '#3a9d5d'],
  ['50% a 75% público', '#2f6fa8'],
  ['Mais de 75% público', '#8e44ad'],
];
export const PUBLIC_FUNDING_UNKNOWN_COLOR = '#929b9c';
const PUBLIC_FUNDING_COLOR_BY_GROUP = Object.fromEntries(PUBLIC_FUNDING_LEVELS);
export function publicFundingColor(grupo) {
  return PUBLIC_FUNDING_COLOR_BY_GROUP[grupo] || PUBLIC_FUNDING_UNKNOWN_COLOR;
}
function isValidAmount(value) {
  return (
    value != null &&
    String(value).trim() !== '' &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0
  );
}
export function seatInk(person, mode, colors) {
  if (mode === 'partido') return colors[person.partido] || '#7d898a';
  if (mode === 'escolaridade') return schoolColor(person.escolaridade);
  if (mode === 'fundos_publicos') return publicFundingColor(person.faixa_publico);
  const value = mode === 'patrimonio' ? person.patrimonio : person.gastos ?? person.patrimonio;
  return !isValidAmount(value)
    ? '#929b9c'
    : Number(value) === 0
      ? '#245b4d'
      : value <= 10000
        ? '#ddb643'
        : value <= 100000
          ? '#173e78'
          : '#a63c30';
}
