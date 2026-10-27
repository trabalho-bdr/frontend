// Rótulos e leitura de faixa compartilhados entre o gráfico principal, o
// card informativo e o painel de comparação de recortes. O número de grupos
// (decis ou quartis) é decidido pelo servidor conforme o tamanho da
// amostra; o front-end só lê o que veio em `data.bins` — e tem aqui um
// retrocesso caso falte esse campo.
export function inferBins(rows) {
  const maiorFaixa = (rows || []).reduce((m, r) => Math.max(m, r.faixa ?? 0), 0);
  return maiorFaixa >= 5 ? 10 : 4;
}

// Formato compacto para eixos e cartões ("R$ 20 mil", "R$ 1,2 mi"); evita
// que valores em reais por extenso estourem a legenda do eixo x.
export function compactMoney(value) {
  if (value == null || !Number.isFinite(value)) return 'Não informado';
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return (
      'R$ ' + (value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'
    );
  if (abs >= 1_000)
    return 'R$ ' + (value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil';
  return 'R$ ' + value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

// Rótulo de cada grupo: a faixa de patrimônio que ele cobre, não o número
// do decil/quartil — "R$ 20 mil – R$ 65 mil" em vez de "Decil 3".
export function rotuloFaixa(row) {
  if (row.faixa === 0) return 'Zero declarado';
  return `${compactMoney(row.minimo)} – ${compactMoney(row.maximo)}`;
}

export function comRotulos(data) {
  const bins = data?.bins || inferBins(data?.rows);
  const rows = (data?.rows || [])
    .filter((r) => r.mediana != null && r.valor != null)
    .map((r) => ({ ...r, rotulo: rotuloFaixa(r) }));
  return { rows, bins };
}

// Grupo mais rico e mais pobre, sempre desconsiderando o zero declarado —
// zero não é "o patrimônio mais baixo", é a ausência de patrimônio positivo.
export function extremosSemZero(rows) {
  const positivos = [...rows].filter((r) => r.faixa !== 0).sort((a, b) => a.mediana - b.mediana);
  return { maisPobre: positivos[0], maisRico: positivos[positivos.length - 1] };
}

// Diferença de chance entre os extremos, já apontando qual lado é favorecido
// — evita uma porcentagem solta sem dizer se é o rico ou o pobre que leva vantagem.
export function diferencaExtremos(maisPobre, maisRico) {
  if (!maisPobre || !maisRico || maisPobre.valor == null || maisRico.valor == null) return null;
  if (maisPobre.valor === 0 && maisRico.valor === 0) return { percentual: 0, favorecido: null };
  if (maisPobre.valor === 0) return { percentual: null, favorecido: 'rico', semBase: true };
  if (maisRico.valor >= maisPobre.valor) {
    return { percentual: 100 * (maisRico.valor / maisPobre.valor - 1), favorecido: 'rico' };
  }
  return { percentual: 100 * (maisPobre.valor / maisRico.valor - 1), favorecido: 'pobre' };
}
