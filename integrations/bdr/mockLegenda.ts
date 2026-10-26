/** Cenário fictício para prototipar gráficos. Não representa dados do TSE. */
export const opcoesMockLegenda = [
  { ano: 2018, cargo: "Deputado Federal" },
  { ano: 2022, cargo: "Deputado Federal" },
  { ano: 2020, cargo: "Vereador" },
  { ano: 2024, cargo: "Vereador" },
];

/** Dados determinísticos ligados aos códigos IBGE do catálogo, para exercitar filtros e mapa. */
export function gerarLinhasMockLegenda(municipios: { id: string; nome: string }[], ano: number, cargo: string) {
  const partidos = ["PL", "PT", "MDB", "PP", "UNIÃO", "PSD", "PSB"];
  return municipios.flatMap((municipio) => partidos.map((partido, indice) => {
    const semente = Number(municipio.id.slice(-5)) + indice * 997 + ano * 13 + (cargo === "Vereador" ? 271 : 0);
    const votosLegenda = 80 + (semente * 37 % 2900);
    const votosNominais = votosLegenda * (3 + semente % 5) + (semente % 719);
    return { id_municipio: municipio.id, municipio: municipio.nome, id_partido: partido, partido, votos_legenda: votosLegenda, votos_nominais: votosNominais };
  }));
}

export const mockLegenda = {
  cargo: "Deputado Federal",
  historico: [
    { ano: 2010, votosLegenda: 93000 },
    { ano: 2014, votosLegenda: 107000 },
    { ano: 2018, votosLegenda: 101000 },
    { ano: 2022, votosLegenda: 129000 },
  ],
  partidos: [
    { nome: "Partido A", legenda: 24800, nominais: 91000 },
    { nome: "Partido B", legenda: 21900, nominais: 103000 },
    { nome: "Partido C", legenda: 17500, nominais: 84000 },
    { nome: "Partido D", legenda: 14300, nominais: 72000 },
    { nome: "Partido E", legenda: 9900, nominais: 65000 },
  ],
  municipios: [
    { nome: "Município A", percentual: 27.4 },
    { nome: "Município B", percentual: 23.1 },
    { nome: "Município C", percentual: 19.8 },
    { nome: "Município D", percentual: 16.6 },
    { nome: "Município E", percentual: 12.3 },
  ],
} as const;
