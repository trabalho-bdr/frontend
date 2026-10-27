const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

export function electionOutcome(row) {
  const status = normalize(row.situacao || row.resultado);
  if (/^ELEITO(?:$|[ _])/.test(status)) return 'elected';
  if (['NAO_ELEITO', 'NAO ELEITO', 'SUPLENTE'].includes(status)) return 'not-elected';
  return 'unknown';
}

export function electoralHistory(rows = []) {
  return rows
    .filter((row) => row.ano != null && String(row.ano).trim() && Number.isFinite(Number(row.ano)))
    .map((row) => ({
      ...row,
      ano: Number(row.ano),
      cargo: row.cargo || 'Cargo não informado',
      outcome: electionOutcome(row),
    }))
    .sort((a, b) => a.ano - b.ano || String(a.id).localeCompare(String(b.id)));
}

export function officeChanges(history) {
  return history.flatMap((row, index) => {
    const previous = history[index - 1];
    return previous &&
      previous.cargo !== row.cargo &&
      previous.cargo !== 'Cargo não informado' &&
      row.cargo !== 'Cargo não informado'
      ? [{ from: previous.cargo, to: row.cargo, fromYear: previous.ano, year: row.ano }]
      : [];
  });
}
