/** Read-only clients. Offline points are real, explicitly partial records. */
import { request } from './client.js';

export async function fetchQuestao1Overview({
  ano = 2024,
  cargo = 'VEREADOR',
  uf = '',
  municipioId = '',
} = {}) {
  const scope = { ano, cargo, uf, municipio_id: municipioId };
  try {
    return {
      ...(await request('/questao1/overview?' + new URLSearchParams(scope))),
      source: 'live',
    };
  } catch {
    return {
      source: 'unavailable',
      rows: [],
      data: {},
      insights: [],
      serie_temporal: [],
      por_uf: [],
      pontos: [],
      total: 0,
      medianas: {},
      correlacao: {},
      por_partido: [],
      comparacao_cargos: [],
      histograma_eleitos: [],
      pontos_dispersao: [],
    };
  }
}
export async function fetchQuestao1Eleitos({
  ano = 2024,
  cargo = 'VEREADOR',
  uf = '',
  municipioId = '',
  partido = '',
  perfil = '',
  grupo = '',
} = {}) {
  const scope = { ano, cargo, uf, municipio_id: municipioId, partido, perfil, grupo, limit: 72 };
  try {
    return {
      ...(await request('/questao1/eleitos?' + new URLSearchParams(scope))),
      source: 'live',
    };
  } catch {
    return {
      source: 'unavailable',
      rows: [],
      data: {},
      insights: [],
      serie_temporal: [],
      por_uf: [],
      pontos: [],
      total: 0,
      medianas: {},
      correlacao: {},
      por_partido: [],
      comparacao_cargos: [],
      histograma_eleitos: [],
      pontos_dispersao: [],
    };
  }
}
export async function fetchQuestao1Explorar(params = {}, options = {}) {
  const scope = {
    ano: 2024,
    cargo: 'VEREADOR',
    uf: '',
    municipio_id: '',
    partido: '',
    visao: 'estado',
    indicador: 'agregado',
    perfil: 'gasto',
    ...params,
  };
  try {
    return await request('/questao1/explorar?' + new URLSearchParams(scope), {
      timeout: 30000,
      ...options,
    });
  } catch {
    return {
      source: 'unavailable',
      rows: [],
      data: {},
      insights: [],
      serie_temporal: [],
      por_uf: [],
      pontos: [],
      total: 0,
      medianas: {},
      correlacao: {},
      por_partido: [],
      comparacao_cargos: [],
      histograma_eleitos: [],
      pontos_dispersao: [],
    };
  }
}
export async function fetchQuestao1Partidos({ ano = 2024, cargo = 'VEREADOR', uf = '' } = {}) {
  try {
    return (
      (await request('/questao1/partidos?' + new URLSearchParams({ ano, cargo, uf }))).partidos ||
      []
    );
  } catch {
    return [];
  }
}
export async function fetchQuestao1Dispersao(params = {}) {
  const {
    ano = 2024,
    cargo = 'VEREADOR',
    uf = '',
    municipioId = '',
    partido = '',
    maxPontos = 900,
  } = params;
  try {
    return {
      ...(await request(
        '/questao1/dispersao?' +
          new URLSearchParams({
            ano,
            cargo,
            uf,
            municipio_id: municipioId,
            partido,
            max_pontos: maxPontos,
          }),
      )),
      source: 'live',
    };
  } catch {
    return {
      source: 'unavailable',
      rows: [],
      data: {},
      insights: [],
      serie_temporal: [],
      por_uf: [],
      pontos: [],
      total: 0,
      medianas: {},
      correlacao: {},
      por_partido: [],
      comparacao_cargos: [],
      histograma_eleitos: [],
      pontos_dispersao: [],
    };
  }
}
export async function fetchQuestao1Ranking(params = {}) {
  const {
    ano = 2024,
    cargo = 'VEREADOR',
    uf = '',
    municipioId = '',
    partido = '',
    filtroResultado = 'todos',
    ordem = 'custo_voto',
    limit = 12,
    offset = 0,
  } = params;
  try {
    return {
      ...(await request(
        '/questao1/ranking?' +
          new URLSearchParams({
            ano,
            cargo,
            uf,
            municipio_id: municipioId,
            partido,
            filtro_resultado: filtroResultado,
            ordem,
            limit,
            offset,
          }),
      )),
      source: 'live',
    };
  } catch {
    return { source: 'unavailable', rows: [], total: 0, limit, offset };
  }
}
export async function fetchQuestao1Dossie({ ano = 2024, cargo = 'VEREADOR', uf = '' } = {}) {
  try {
    return {
      ...(await request('/questao1/dossie?' + new URLSearchParams({ ano, cargo, uf }))),
      source: 'live',
    };
  } catch {
    return {
      source: 'unavailable',
      rows: [],
      data: {},
      insights: [],
      serie_temporal: [],
      por_uf: [],
      pontos: [],
      total: 0,
      medianas: {},
      correlacao: {},
      por_partido: [],
      comparacao_cargos: [],
      histograma_eleitos: [],
      pontos_dispersao: [],
    };
  }
}
