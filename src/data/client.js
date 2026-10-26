import { overview as base, analyses, states } from './catalog.js';
const API_TIMEOUT = 15000;

export async function request(path, { signal, timeout = API_TIMEOUT } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  else signal?.addEventListener('abort', cancel, { once: true });
  try {
    const r = await fetch('/api' + path, { signal: controller.signal });
    if (!r.ok) throw new Error('API ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
    signal?.removeEventListener('abort', cancel);
  }
}

export async function getHealth() {
  try {
    return await request('/health');
  } catch {
    return { connected: false, mode: 'unavailable' };
  }
}
export async function getDiagnostico() {
  try {
    return await request('/diagnostico');
  } catch {
    return null;
  }
}

export async function getOverview() {
  try {
    const live = await request('/overview');
    return { ...live.values, mode: 'live', database: 'pipeline_bdr_der_completo_v4' };
  } catch {
    return { mode: 'unavailable' };
  }
}

export async function getAnalysis(id) {
  try {
    return await request('/analysis/' + id);
  } catch {
    return null;
  }
}
export async function getCandidates(params = {}) {
  const q = new URLSearchParams(params);
  return request('/candidates?' + q.toString());
}
export async function getCandidateExpenses(id, params = {}) {
  const q = new URLSearchParams(params);
  return request('/candidate-expenses/' + encodeURIComponent(id) + '?' + q.toString());
}
export async function getMunicipios(params = {}) {
  const q = new URLSearchParams(params);
  return request('/municipios?' + q.toString());
}
export { analyses, states };

export async function getDescobertas(params = {}) {
  const q = new URLSearchParams(params);
  return request('/descobertas?' + q.toString());
}
export async function getAdesivaria(params = {}, options = {}) {
  const q = new URLSearchParams(params);
  return request('/adesivaria?' + q.toString(), { timeout: 25000, ...options });
}
export async function getAdesivariaCandidate(id, params = {}, options = {}) {
  return request(
    '/adesivaria/candidatura/' + encodeURIComponent(id) + '?' + new URLSearchParams(params),
    { timeout: 25000, ...options },
  );
}
export async function getLegendaInvestigacao(params = {}, options = {}) {
  return request('/legenda-investigacao/serie?' + new URLSearchParams(params), options);
}

/** Série comparativa: SQL pré-definido, somente leitura e parâmetros na API. */
export async function getComparison(kind, params = {}) {
  const allowed = ['legenda', 'abstencao', 'cadeiras', 'escolaridade', 'propaganda', 'patrimonio'];
  if (!allowed.includes(kind)) throw new Error('Comparador desconhecido');
  const q = new URLSearchParams(params);
  return request(`/comparacoes/${kind}?${q.toString()}`);
}

export async function getQ3Municipios(uf, ano) {
  try {
    return await request(`/q3/${encodeURIComponent(uf)}/${encodeURIComponent(ano)}`);
  } catch (err) {
    return null;
  }
}

export async function getAnosQ3() {
  try {
    const res = await request('/anos');
    return res.anos || [2024, 2022];
  } catch {
    return [2024, 2022];
  }
}

export async function getQ2Opcoes() {
  try {
    return await request('/q2/opcoes');
  } catch {
    return { opcoes: [], anos: [], cargos: [], ufs: [], partidos: [], source: 'unavailable' };
  }
}

export async function getQ2Municipios(params = {}) {
  const scope = { ano: 2024, cargo: 'VEREADOR', uf: '', ...params };
  try {
    return { ...(await request('/q2/municipios?' + new URLSearchParams(scope))), source: 'live' };
  } catch {
    return { source: 'unavailable', rows: [], municipios: [] };
  }
}

export async function getQ2Patrimonio(params = {}) {
  const scope = { ano: 2024, cargo: 'VEREADOR', uf: '', municipio: '', ...params };
  try {
    return { ...(await request('/q2/patrimonio?' + new URLSearchParams(scope))), source: 'live' };
  } catch {
    return { source: 'unavailable', rows: [], quartis: [], cobertura: {} };
  }
}

// Camada central de Indicadores
export async function getIndicadorResultado(params = {}) {
  const q = new URLSearchParams(params);
  return request('/indicadores/resultado?' + q.toString());
}
export async function getIndicadorGastos(params = {}) {
  const q = new URLSearchParams(params);
  return request('/indicadores/gastos?' + q.toString());
}
export async function getIndicadorPatrimonio(params = {}) {
  const q = new URLSearchParams(params);
  return request('/indicadores/patrimonio?' + q.toString());
}
export async function getIndicadorLegenda(params = {}) {
  const q = new URLSearchParams(params);
  return request('/indicadores/legenda?' + q.toString());
}
export async function getIndicadorTransicoes(params = {}) {
  const q = new URLSearchParams(params);
  return request('/indicadores/transicoes?' + q.toString());
}
export async function getIndicadorTerritorio(params = {}) {
  const q = new URLSearchParams(params);
  return request('/indicadores/territorio?' + q.toString());
}
export async function getIndicadorEscolaridade(params = {}) {
  const q = new URLSearchParams(params);
  return request('/indicadores/escolaridade?' + q.toString());
}
export async function getIndicadorJuventude(params = {}) {
  const q = new URLSearchParams(params);
  return request('/indicadores/juventude?' + q.toString());
}
export async function getIndicadorTrajetorias() {
  return request('/indicadores/trajetorias');
}
export async function getIndicadorPropaganda() {
  return request('/indicadores/propaganda');
}
export async function getIndicadorReceitas() {
  return request('/indicadores/receitas');
}

export async function getPeople(params = {}) {
  const { search = '', resultado = '', ...rest } = params;
  const values = {
    ...rest,
    q: params.q || search,
    resultado: resultado === 'NÃO ELEITO' ? 'NAO_ELEITO' : resultado,
  };
  const query = new URLSearchParams(
    Object.entries(values).filter(([, value]) => value !== '' && value != null),
  );
  return request('/catalogo/pessoas?' + query, { timeout: 45000 });
}
