// Regras de recorte da Q9: parâmetros das consultas, compatibilidade de cargos e municípios.
const norm = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

export const MUNICIPAL_OFFICES = ['VEREADOR', 'PREFEITO', 'VICE-PREFEITO'];
export const GENERAL_OFFICES = [
  'DEPUTADO ESTADUAL',
  'DEPUTADO FEDERAL',
  'SENADOR',
  'GOVERNADOR',
  'VICE-GOVERNADOR',
];

export const ALL_OFFICES = [
  { value: 'VEREADOR', label: 'Vereador', grupo: 'Eleições Municipais' },
  { value: 'PREFEITO', label: 'Prefeito', grupo: 'Eleições Municipais' },
  { value: 'DEPUTADO FEDERAL', label: 'Deputado Federal', grupo: 'Eleições Gerais' },
  { value: 'DEPUTADO ESTADUAL', label: 'Deputado Estadual', grupo: 'Eleições Gerais' },
  { value: 'SENADOR', label: 'Senador', grupo: 'Eleições Gerais' },
  { value: 'GOVERNADOR', label: 'Governador', grupo: 'Eleições Gerais' },
  { value: 'VICE-PREFEITO', label: 'Vice-Prefeito', grupo: 'Eleições Municipais' },
  { value: 'VICE-GOVERNADOR', label: 'Vice-Governador', grupo: 'Eleições Gerais' },
];

export const OFFICES_BY_YEAR = {
  2018: ['DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'SENADOR', 'GOVERNADOR'],
  2020: ['VEREADOR', 'PREFEITO', 'VICE-PREFEITO'],
  2022: ['DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'SENADOR', 'GOVERNADOR', 'VICE-GOVERNADOR'],
  2024: ['VEREADOR', 'PREFEITO', 'VICE-PREFEITO'],
};

export function isMunicipalOffice(cargo) {
  return MUNICIPAL_OFFICES.includes(norm(cargo));
}

export function compatibleYearsForOffice(cargo) {
  return isMunicipalOffice(cargo) ? [2024, 2020] : [2022, 2018];
}

export function getCompatibleYear(cargo, currentYear) {
  const years = compatibleYearsForOffice(cargo);
  return years.includes(Number(currentYear)) ? Number(currentYear) : years[0];
}

/** Uma candidatura (id_candidatura) só vale para o ano, cargo, UF e município em que foi disputada. */
export function candidateMatchesScope(candidate, scope) {
  if (!candidate) return false;
  const matchAno = Number(candidate.ano) === Number(scope.ano);
  const matchCargo = norm(candidate.cargo) === norm(scope.cargo);
  const matchUf = !scope.uf || norm(candidate.uf) === norm(scope.uf);
  const matchMun =
    !scope.municipioId ||
    !candidate.id_municipio ||
    String(candidate.id_municipio) === String(scope.municipioId);
  return matchAno && matchCargo && matchUf && matchMun;
}

/** Consulta principal: a candidatura ou município escolhido delimita nuvem, indicadores e distribuição. */
export function buildDespesasQuery(scope, candidate) {
  const query = new URLSearchParams({
    ano: String(scope.ano),
    cargo: scope.cargo,
    criterio: scope.criterio || 'sugeridas',
  });
  if (scope.uf) query.set('uf', scope.uf);
  if (scope.municipioId) query.set('id_municipio', String(scope.municipioId));
  if (candidate?.id_candidatura != null && candidate.id_candidatura !== '')
    query.set('id_candidatura', String(candidate.id_candidatura));
  return query;
}

/** Pesquisa de candidaturas: respeita o mesmo ano, cargo, UF e município dos filtros. */
export function buildCandidatosQuery(scope, busca = '') {
  const query = new URLSearchParams({
    ano: String(scope.ano),
    cargo: scope.cargo,
    busca: String(busca).trim(),
  });
  if (scope.uf) query.set('uf', scope.uf);
  if (scope.municipioId) query.set('id_municipio', String(scope.municipioId));
  return query;
}

export function candidatePlace(candidate) {
  return [candidate?.municipio, candidate?.uf].filter(Boolean).join(' / ');
}

export function candidateLabel(candidate) {
  return [candidate?.nome, candidate?.partido || 'sem partido', candidatePlace(candidate)]
    .filter(Boolean)
    .join(' · ');
}
