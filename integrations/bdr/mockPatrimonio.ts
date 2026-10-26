/**
 * Dados fictícios da análise de patrimônio para prototipagem. Não representam o TSE.
 *
 * Os tipos abaixo são exatamente os que a API devolve:
 *   GET /api/q2/opcoes     -> OpcoesQ2
 *   GET /api/q2/municipios -> DadosMapaQ2   (um valor por município e por UF, para o mapa)
 *   GET /api/q2/patrimonio -> DadosQ2       (cartões, decis e comparativo do recorte)
 * Por isso o modo de exemplo só troca a fonte dos dados em PainelPatrimonio.tsx.
 *
 * Os números são determinísticos (mesmo filtro → mesmo resultado).
 */

export type Situacao = { situacao: "eleito" | "nao_eleito"; candidaturas: number; patrimonio_medio: number; patrimonio_mediano: number };
export type Correlacao = { linear: number | null; log: number | null; candidaturas: number };
export type Decil = { decil: number; patrimonio_min: number; patrimonio_max: number; candidaturas: number; eleitos: number; taxa_sucesso_pct: number };
export type Cobertura = {
  total: number; validos: number; negativos: number;
  /** Com patrimônio válido, mas resultado indefinido (#NULO, 2º TURNO): fora da análise. */
  sem_resultado_definido: number; cobertura_pct: number | null;
};
export type DadosQ2 = {
  ano: number | null; cargo: string | null; uf: string | null; municipio: string | null; ufs_cobertas: string[];
  resumo_situacao: Situacao[]; correlacao: Correlacao; decis: Decil[]; cobertura: Cobertura;
};

export type OpcaoQ2 = { ano: number; cargo: string };
export type OpcoesQ2 = { opcoes: OpcaoQ2[]; anos: number[]; ufs: string[] };

/** Números de um território (município ou UF). `analisadas` = patrimônio válido e resultado definido. */
export type LinhaTerritorio = {
  candidaturas: number; analisadas: number; eleitos: number; taxa_sucesso_pct: number | null;
  patrimonio_mediano: number | null; patrimonio_mediano_eleitos: number | null; patrimonio_mediano_nao_eleitos: number | null;
};
export type LinhaMunicipio = LinhaTerritorio & { id_municipio: string; municipio: string | null; uf: string };
export type LinhaUf = LinhaTerritorio & { uf: string };
export type DadosMapaQ2 = {
  ano: number | null; cargo: string | null; uf: string | null;
  /** false nos cargos estaduais (deputado, senador, governador): só há valor por UF. */
  tem_municipio: boolean; municipios: LinhaMunicipio[]; ufs: LinhaUf[];
};

export const UFS_Q2 = ["CE", "MA", "MS", "RJ", "RN", "RS"];
export const CARGOS_MUNICIPAIS = ["PREFEITO", "VEREADOR"];

export const opcoesMockQ2: OpcoesQ2 = {
  opcoes: [
    ...[2024, 2020].flatMap((ano) => CARGOS_MUNICIPAIS.map((cargo) => ({ ano, cargo }))),
    ...[2022, 2018].flatMap((ano) => ["DEPUTADO ESTADUAL", "DEPUTADO FEDERAL", "SENADOR", "GOVERNADOR"].map((cargo) => ({ ano, cargo }))),
  ].sort((a, b) => b.ano - a.ano),
  anos: [2018, 2020, 2022, 2024],
  ufs: UFS_Q2,
};

/** Ordem de grandeza do patrimônio e do nº de candidaturas por cargo. */
const ESCALA: Record<string, { patrimonio: number; volume: number }> = {
  VEREADOR: { patrimonio: 1, volume: 1 }, PREFEITO: { patrimonio: 3, volume: 0.2 },
  "DEPUTADO ESTADUAL": { patrimonio: 6, volume: 0.17 }, "DEPUTADO FEDERAL": { patrimonio: 12, volume: 0.08 },
  SENADOR: { patrimonio: 20, volume: 0.01 }, GOVERNADOR: { patrimonio: 15, volume: 0.008 },
};
const FATOR_UF: Record<string, number> = { CE: 0.8, MA: 0.6, MS: 1.5, RJ: 1.8, RN: 0.9, RS: 1.4 };

const aleatorio = (semente: number) => (n: number, off = 0) => {
  const x = Math.sin(semente * 12.9898 + n * 78.233 + off * 37.719) * 43758.5453;
  return x - Math.floor(x);
};
const hash = (texto: string) => [...texto].reduce((s, c) => s + c.charCodeAt(0) * 31, 7);

/** Cartões, decis e comparativo do recorte (Brasil ou uma UF). */
export function gerarMockPatrimonio(cargo: string, uf: string, ano: number | null): DadosQ2 {
  const chave = cargo.toUpperCase();
  const { patrimonio: escala, volume } = ESCALA[chave] ?? { patrimonio: 1, volume: 1 };
  const pr = aleatorio(hash(`${chave}|${uf}|${ano ?? ""}`));
  const fatorUf = uf ? 0.18 : 1;

  let borda = 0;
  const decis: Decil[] = Array.from({ length: 10 }, (_, i) => {
    const decil = i + 1;
    const patrimonio_min = borda;
    borda = Math.round(escala * 4000 * 1.55 ** decil * (0.9 + pr(decil, 1) * 0.2));
    const candidaturas = Math.max(8, Math.round((60 + pr(decil, 2) * 50) * volume * 12 * fatorUf));
    const taxaDecil = Math.min(92, Math.max(3, 8 + i * 4.2 + (pr(decil, 3) - 0.5) * 9));
    const eleitos = Math.round((candidaturas * taxaDecil) / 100);
    return { decil, patrimonio_min, patrimonio_max: borda, candidaturas, eleitos, taxa_sucesso_pct: (100 * eleitos) / candidaturas };
  });
  const eleitos = decis.reduce((s, d) => s + d.eleitos, 0);
  const total = decis.reduce((s, d) => s + d.candidaturas, 0);
  const medEleitos = (decis[6].patrimonio_min + decis[6].patrimonio_max) / 2;
  const medNao = (decis[3].patrimonio_min + decis[3].patrimonio_max) / 2;
  const semResultado = Math.round(total * (0.015 + pr(20) * 0.02));
  const validos = total + semResultado;
  const geral = Math.round(validos / (0.74 + pr(21) * 0.2));
  return {
    ano, cargo: chave, uf: uf || null, municipio: null, ufs_cobertas: UFS_Q2,
    resumo_situacao: [
      { situacao: "eleito", candidaturas: eleitos, patrimonio_mediano: medEleitos, patrimonio_medio: medEleitos * (1.5 + pr(22) * 0.5) },
      { situacao: "nao_eleito", candidaturas: total - eleitos, patrimonio_mediano: medNao, patrimonio_medio: medNao * (1.4 + pr(23) * 0.4) },
    ],
    correlacao: { linear: 0.14 + pr(24) * 0.16, log: 0.2 + pr(25) * 0.16, candidaturas: total },
    decis,
    cobertura: { total: geral, validos, negativos: 0, sem_resultado_definido: semResultado, cobertura_pct: (100 * validos) / geral },
  };
}

const taxa = (eleitos: number, analisadas: number) => (analisadas ? (100 * eleitos) / analisadas : null);

/** Um valor por município (cargos municipais) e por UF, ligados ao catálogo de municípios do mapa. */
export function gerarMockMapaQ2(municipiosPorUf: Record<string, { id: string; nome: string }[]>, ano: number, cargo: string): DadosMapaQ2 {
  const chave = cargo.toUpperCase();
  const { patrimonio: escala, volume } = ESCALA[chave] ?? { patrimonio: 1, volume: 1 };
  const municipal = CARGOS_MUNICIPAIS.includes(chave);
  const municipios: LinhaMunicipio[] = [];
  const ufs: LinhaUf[] = [];

  for (const uf of UFS_Q2) {
    const base = escala * 18000 * FATOR_UF[uf];
    if (!municipal) {
      const pr = aleatorio(hash(`${chave}|${uf}|${ano}`));
      const analisadas = Math.max(10, Math.round(60 + pr(1) * 800 * volume));
      const eleitos = Math.max(1, Math.round(analisadas * (0.08 + pr(2) * 0.1)));
      const eleit = base * (1.6 + pr(3) * 0.6), nao = base * (0.8 + pr(4) * 0.4);
      ufs.push({ uf, candidaturas: Math.round(analisadas * 1.15), analisadas, eleitos, taxa_sucesso_pct: taxa(eleitos, analisadas),
        patrimonio_mediano: nao * 1.05, patrimonio_mediano_eleitos: eleit, patrimonio_mediano_nao_eleitos: nao });
      continue;
    }
    for (const m of municipiosPorUf[uf] ?? []) {
      const pr = aleatorio(hash(`${chave}|${m.id}|${ano}`));
      const n = chave === "VEREADOR" ? 8 + Math.floor(pr(1) * 38) : 2 + Math.floor(pr(1) * 3);
      const analisadas = Math.max(1, Math.round(n * (0.78 + pr(2) * 0.2)));
      const eleitos = Math.min(analisadas, chave === "VEREADOR" ? Math.max(1, Math.round(analisadas * (0.25 + pr(3) * 0.15))) : 1);
      const rico = base * (0.35 + pr(4) * 1.5);
      const eleit = rico * (1.2 + pr(5) * 1.4), nao = analisadas > eleitos ? rico * (0.7 + pr(6) * 0.5) : null;
      municipios.push({ id_municipio: m.id, municipio: m.nome.toUpperCase(), uf, candidaturas: n, analisadas, eleitos, taxa_sucesso_pct: taxa(eleitos, analisadas),
        patrimonio_mediano: nao == null ? eleit : (eleit * eleitos + nao * (analisadas - eleitos)) / analisadas,
        patrimonio_mediano_eleitos: eleit, patrimonio_mediano_nao_eleitos: nao });
    }
    const dela = municipios.filter((l) => l.uf === uf);
    if (!dela.length) continue;
    const soma = (f: (l: LinhaMunicipio) => number) => dela.reduce((s, l) => s + f(l), 0);
    const media = (f: (l: LinhaMunicipio) => number | null) => {
      const itens = dela.filter((l) => f(l) != null);
      return itens.length ? itens.reduce((s, l) => s + (f(l) as number) * l.analisadas, 0) / itens.reduce((s, l) => s + l.analisadas, 0) : null;
    };
    const analisadas = soma((l) => l.analisadas), eleitos = soma((l) => l.eleitos);
    ufs.push({ uf, candidaturas: soma((l) => l.candidaturas), analisadas, eleitos, taxa_sucesso_pct: taxa(eleitos, analisadas),
      patrimonio_mediano: media((l) => l.patrimonio_mediano), patrimonio_mediano_eleitos: media((l) => l.patrimonio_mediano_eleitos),
      patrimonio_mediano_nao_eleitos: media((l) => l.patrimonio_mediano_nao_eleitos) });
  }
  return { ano, cargo: chave, uf: null, tem_municipio: municipios.length > 0, municipios, ufs };
}
