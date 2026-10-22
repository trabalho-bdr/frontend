/**
 * Cliente HTTP parametrizado para os endpoints da Questão 1.
 * Fornece fallback resiliente para snapshot auditado quando em modo offline ou em caso de erro.
 */
import { questao1Agregados, sampleCandidates } from './questao1Snapshot.js';

const API_BASE = '/api/questao1';

export async function fetchQuestao1Overview({ ano = 2024, cargo = 'VEREADOR', uf = '', municipioId = '' } = {}) {
  const params = new URLSearchParams({
    ano: String(ano),
    cargo,
    uf: uf || '',
    municipio_id: municipioId || ''
  });

  try {
    const res = await fetch(`${API_BASE}/overview?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return { ...data, source: 'live' };
  } catch {
    // Fallback gracioso para snapshot auditado
    const key = `${ano}_${cargo}`;
    const base = questao1Agregados[key] || questao1Agregados['2024_VEREADOR'];

    // Se houver UF filtrada, ajusta os valores aproximados do snapshot
    let totalDespesas = base.total_despesas;
    let eleitos = base.eleitos;
    let gastoCadeira = base.gasto_por_cadeira;
    let totalCandidaturas = base.total_candidaturas;

    if (uf && base.por_uf) {
      const ufData = base.por_uf.find(u => u.uf === uf);
      if (ufData) {
        totalDespesas = ufData.total_despesas;
        eleitos = ufData.eleitos;
        gastoCadeira = ufData.gasto_por_cadeira;
        totalCandidaturas = ufData.candidaturas;
      }
    }

    return {
      ano,
      cargo,
      uf,
      municipio_id: municipioId,
      source: 'snapshot',
      data: {
        ...base,
        total_despesas: totalDespesas,
        eleitos,
        gasto_por_cadeira: gastoCadeira,
        total_candidaturas: totalCandidaturas
      },
      serie_temporal: base.serie_temporal || [],
      por_uf: base.por_uf || [],
      insights: [
        {
          tipo: 'eleito_mais_economico',
          titulo: 'Menor despesa por voto entre eleitos',
          destaque: 'R$ 0,02',
          candidato: 'CAÇULA DO ZÉ MARIA (PC do B · Itaipava do Grajaú/MA)',
          detalhe: 'Declarou R$ 20,95 e recebeu 951 votos em 2024.',
          criterio: 'Candidatura eleita com votos > 0 e despesas informadas > 0.',
          limitacao: 'Prestação de contas oficial nominal.'
        },
        {
          tipo: 'maior_gasto_nao_eleito',
          titulo: 'Maior despesa entre não eleitos',
          destaque: 'R$ 1.907.647,38',
          candidato: 'HELOÍSA HELENA (REDE · Rio de Janeiro/RJ)',
          detalhe: 'Recebeu 11.971 votos (SUPLENTE), com despesa por voto de R$ 159,36.',
          criterio: 'Candidatura não eleita ou suplente com maior gasto declarado.',
          limitacao: 'Orçamento alto amplia presença, mas mandato depende de quociente partidário.'
        },
        {
          tipo: 'razao_medianas',
          titulo: 'Disparidade entre eleitos e não eleitos',
          destaque: '2,4× maior',
          candidato: 'Mediana das candidaturas eleitas',
          detalhe: 'A mediana dos eleitos foi R$ 3.819,30, contra R$ 1.600,00 dos não eleitos.',
          criterio: 'Razão entre medianas de despesas declaradas.',
          limitacao: 'Diferença estatística descritiva, sem relação de causalidade direta.'
        }
      ],
      metadados: {
        formula: 'Soma das despesas declaradas no recorte ÷ Candidaturas eleitas no mesmo recorte',
        explicacao: 'Dividimos todas as despesas declaradas no recorte pela quantidade de candidaturas eleitas. O resultado representa uma média agregada de gasto por cadeira, não o gasto individual de cada eleito.',
        aviso_maquete: 'As 72 cadeiras do modelo 3D constituem uma maquete cenográfica e simbólica para visualização e exploração; a contagem real de eleitos do recorte é informada numericamente no painel.',
        unidade: 'R$ (Valores nominais declarados ao TSE)',
        cobertura: '6 UFs auditadas (CE, MA, MS, RJ, RN, RS)'
      }
    };
  }
}

export async function fetchQuestao1Ranking({
  ano = 2024,
  cargo = 'VEREADOR',
  uf = '',
  municipioId = '',
  partido = '',
  filtroResultado = 'todos',
  ordem = 'custo_voto',
  limit = 12,
  offset = 0
} = {}) {
  const params = new URLSearchParams({
    ano: String(ano),
    cargo,
    uf: uf || '',
    municipio_id: municipioId || '',
    partido: partido || '',
    filtro_resultado: filtroResultado,
    ordem,
    limit: String(limit),
    offset: String(offset)
  });

  try {
    const res = await fetch(`${API_BASE}/ranking?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return { ...data, source: 'live' };
  } catch {
    // Fallback para amostra filtrada localmente
    let filtered = [...sampleCandidates];
    if (ano) filtered = filtered.filter(c => c.ano === ano);
    if (cargo) filtered = filtered.filter(c => c.cargo === cargo);
    if (uf) filtered = filtered.filter(c => c.uf === uf);
    if (partido) filtered = filtered.filter(c => c.partido.toUpperCase() === partido.toUpperCase());

    if (filtroResultado === 'eleitos') {
      filtered = filtered.filter(c => c.eleito === 1);
    } else if (filtroResultado === 'nao_eleitos') {
      filtered = filtered.filter(c => c.eleito === 0);
    }

    if (ordem === 'custo_voto') {
      filtered.sort((a, b) => (b.custo_voto || 0) - (a.custo_voto || 0));
    } else if (ordem === 'gastos') {
      filtered.sort((a, b) => (b.gastos || 0) - (a.gastos || 0));
    } else if (ordem === 'votos') {
      filtered.sort((a, b) => (b.votos || 0) - (a.votos || 0));
    }

    const total = filtered.length;
    const rows = filtered.slice(offset, offset + limit);

    return {
      rows,
      total,
      limit,
      offset,
      ordem,
      filtro_resultado: filtroResultado,
      source: 'snapshot',
      criterio_ordenacao: 'Amostra arquivada ordenada por ' + ordem
    };
  }
}

export async function fetchQuestao1Dispersao({
  ano = 2024,
  cargo = 'VEREADOR',
  uf = '',
  municipioId = '',
  partido = '',
  maxPontos = 900
} = {}) {
  const params = new URLSearchParams({
    ano: String(ano),
    cargo,
    uf: uf || '',
    municipio_id: municipioId || '',
    partido: partido || '',
    max_pontos: String(maxPontos)
  });

  try {
    const res = await fetch(`${API_BASE}/dispersao?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return { ...data, source: 'live' };
  } catch {
    // Fallback sintético baseado na distribuição auditada
    const key = `${ano}_${cargo}`;
    const base = questao1Agregados[key] || questao1Agregados['2024_VEREADOR'];

    // Gerar pontos representativos com a amostra real
    const pontos = sampleCandidates.map(c => ({
      ...c,
      custo_voto: c.votos > 0 ? Number((c.gastos / c.votos).toFixed(2)) : null
    }));

    return {
      pontos,
      total_exibido: pontos.length,
      total_universo: base.total_candidaturas,
      total_validos: base.correlacao?.n || base.total_candidaturas,
      excluidos_zero_ou_nulo: base.candidaturas_gasto_zero || 0,
      amostrado: true,
      max_pontos: maxPontos,
      source: 'snapshot',
      medianas: {
        gastos: base.mediana_gastos_eleitos || 2500,
        votos: base.mediana_votos_eleitos || 200
      },
      correlacao: {
        r_log: base.correlacao?.r_log || 0.45,
        r2_log: base.correlacao?.r2_log || 0.20,
        r_linear: base.correlacao?.r_linear || 0.63,
        n: base.correlacao?.n || 61530,
        metodo: 'Coeficiente de Pearson calculado nas escalas log10(despesas) × log10(votos) para candidaturas com valores positivos.',
        aviso_causalidade: 'A associação estatística indica correlação na base analisada, NÃO relação causal de compra de votos ou garantia de vitória.'
      }
    };
  }
}
