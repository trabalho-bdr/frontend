export const emptyCatalogFilters = {
  q: '',
  ano: '',
  uf: '',
  cargo: '',
  municipio: '',
  partido: '',
  partido_historico: '',
  resultado: '',
  escolaridade: '',
  genero: '',
  raca: '',
  ocupacao: '',
  idade_min: '',
  idade_max: '',
  gasto_min: '',
  gasto_max: '',
  patrimonio_min: '',
  patrimonio_max: '',
  recorrencia: '',
};
export const municipal = (cargo) => ['VEREADOR', 'PREFEITO'].includes(cargo);
export const isComparable = (filters) =>
  !!(
    filters.ano &&
    filters.cargo &&
    filters.uf &&
    (!municipal(filters.cargo) || filters.municipio)
  );
export const canOrderVotes = (filters) =>
  isComparable(filters) &&
  ['VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'SENADOR'].includes(filters.cargo);
export function catalogQuery(values = {}) {
  return new URLSearchParams(
    Object.entries(values).filter(([, value]) => value !== '' && value != null),
  ).toString();
}
export function restoreCatalog(context) {
  let saved = null;
  try {
    saved = JSON.parse(context.catalogoEstado || 'null');
  } catch {}
  if (saved?.filters && typeof saved.filters === 'object')
    return {
      filters: Object.fromEntries(
        Object.keys(emptyCatalogFilters).map((key) => [
          key,
          typeof saved.filters[key] === 'string' || typeof saved.filters[key] === 'number'
            ? String(saved.filters[key])
            : '',
        ]),
      ),
      order: ['nome', 'recentes', 'antigas', 'votos', 'gastos'].includes(saved.order)
        ? saved.order
        : 'recentes',
      page: Math.max(0, Math.min(83333, Math.floor(Number(saved.page) || 0))),
    };
  return {
    filters: {
      ...emptyCatalogFilters,
      ...Object.fromEntries(
        Object.keys(emptyCatalogFilters)
          .filter((key) => context['catalogo_' + key] != null)
          .map((key) => [key, context['catalogo_' + key]]),
      ),
      ano: context.catalogo_ano ?? context.ano ?? '',
      uf: context.catalogo_uf ?? context.uf ?? '',
      cargo: context.catalogo_cargo ?? context.cargo ?? '',
      municipio: context.catalogo_municipio ?? context.municipioId ?? '',
      partido: context.catalogo_partido ?? context.partido ?? '',
    },
    order: 'recentes',
    page: 0,
  };
}
export const displayNumber = (value) =>
  value == null
    ? 'Não informado'
    : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export const displayMoney = (value) =>
  value == null
    ? 'Não informado'
    : Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2,
      });
export function candidateContext(row) {
  return {
    etapa: 'perfil',
    pessoaId: row.id_candidato || '',
    candidaturaId: row.id,
    ano: row.ano,
    cargo: row.cargo,
    uf: row.uf,
    partido: row.partido || '',
    municipioId: municipal(row.cargo) ? row.municipio_id || row.id_municipio || '' : '',
    municipioNome: municipal(row.cargo) ? row.municipio || '' : '',
  };
}
