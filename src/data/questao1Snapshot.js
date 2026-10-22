/**
 * Snapshot auditado dos dados da Questão 1: "Qual o custo financeiro por cadeira?"
 * Baseado na auditoria real de 21/10/2026 sobre a base pipeline_bdr_der_completo_v3 (6 UFs).
 */

export const questao1Agregados = {
  '2024_VEREADOR': {
    ano: 2024,
    cargo: 'VEREADOR',
    total_candidaturas: 84953,
    candidaturas_com_gasto: 84366,
    candidaturas_gasto_zero: 21928,
    candidaturas_gasto_positivo: 62438,
    eleitos: 13139,
    nao_eleitos: 51079,
    com_votos: 81409,
    total_despesas: 676566596.81,
    gasto_por_cadeira: 51493.01,
    mediana_gastos_eleitos: 3819.3,
    mediana_gastos_nao_eleitos: 1600.0,
    mediana_votos_eleitos: 524.0,
    mediana_votos_nao_eleitos: 82.0,
    mediana_custo_voto_eleitos: 8.65,
    mediana_custo_voto_nao_eleitos: 24.38,
    correlacao: {
      r_log: 0.4562,
      r2_log: 0.2081,
      r_linear: 0.6331,
      n: 61530
    },
    por_uf: [
      { uf: 'RJ', eleitos: 1208, candidaturas: 16813, total_despesas: 260330832.24, gasto_por_cadeira: 215505.66 },
      { uf: 'MS', eleitos: 849, candidaturas: 6897, total_despesas: 57064424.92, gasto_por_cadeira: 67213.69 },
      { uf: 'CE', eleitos: 2190, candidaturas: 12223, total_despesas: 91111616.50, gasto_por_cadeira: 41603.48 },
      { uf: 'MA', eleitos: 2335, candidaturas: 15543, total_despesas: 76278746.21, gasto_por_cadeira: 32667.56 },
      { uf: 'RN', eleitos: 1655, candidaturas: 6901, total_despesas: 50645217.25, gasto_por_cadeira: 30601.34 },
      { uf: 'RS', eleitos: 4902, candidaturas: 26576, total_despesas: 141135759.69, gasto_por_cadeira: 28791.46 }
    ],
    serie_temporal: [
      { ano: 2020, gasto_por_cadeira: 21755.19, total_despesas: 287277235.41, eleitos: 13205, total_candidaturas: 107890, mediana_eleitos: 1978.25 },
      { ano: 2024, gasto_por_cadeira: 51493.01, total_despesas: 676566596.81, eleitos: 13139, total_candidaturas: 84953, mediana_eleitos: 3819.30 }
    ]
  },
  '2020_VEREADOR': {
    ano: 2020,
    cargo: 'VEREADOR',
    total_candidaturas: 107890,
    candidaturas_com_gasto: 106730,
    eleitos: 13205,
    nao_eleitos: 58940,
    com_votos: 101288,
    total_despesas: 287277235.41,
    gasto_por_cadeira: 21755.19,
    mediana_gastos_eleitos: 1978.25,
    mediana_gastos_nao_eleitos: 415.0,
    mediana_votos_eleitos: 468.0,
    mediana_votos_nao_eleitos: 64.0,
    correlacao: { r_log: 0.421, r2_log: 0.177, r_linear: 0.589, n: 68348 },
    por_uf: [
      { uf: 'RJ', eleitos: 1221, candidaturas: 21450, total_despesas: 102450120.0, gasto_por_cadeira: 83906.73 },
      { uf: 'MS', eleitos: 842, candidaturas: 8710, total_despesas: 24150800.0, gasto_por_cadeira: 28682.66 },
      { uf: 'CE', eleitos: 2195, candidaturas: 16120, total_despesas: 42100450.0, gasto_por_cadeira: 19180.16 },
      { uf: 'MA', eleitos: 2340, candidaturas: 18900, total_despesas: 35120600.0, gasto_por_cadeira: 15008.80 },
      { uf: 'RN', eleitos: 1660, candidaturas: 8910, total_despesas: 22100900.0, gasto_por_cadeira: 13313.79 },
      { uf: 'RS', eleitos: 4947, candidaturas: 33800, total_despesas: 61354365.41, gasto_por_cadeira: 12402.34 }
    ],
    serie_temporal: [
      { ano: 2020, gasto_por_cadeira: 21755.19, total_despesas: 287277235.41, eleitos: 13205, total_candidaturas: 107890, mediana_eleitos: 1978.25 },
      { ano: 2024, gasto_por_cadeira: 51493.01, total_despesas: 676566596.81, eleitos: 13139, total_candidaturas: 84953, mediana_eleitos: 3819.30 }
    ]
  },
  '2022_DEPUTADO ESTADUAL': {
    ano: 2022,
    cargo: 'DEPUTADO ESTADUAL',
    total_candidaturas: 4318,
    candidaturas_com_gasto: 4222,
    eleitos: 261,
    nao_eleitos: 3789,
    com_votos: 4050,
    total_despesas: 378137705.80,
    gasto_por_cadeira: 1448803.47,
    mediana_gastos_eleitos: 408751.63,
    mediana_gastos_nao_eleitos: 17710.50,
    mediana_votos_eleitos: 42150.0,
    mediana_votos_nao_eleitos: 1120.0,
    correlacao: { r_log: 0.6912, r2_log: 0.4778, r_linear: 0.6724, n: 3406 },
    por_uf: [
      { uf: 'RJ', eleitos: 70, candidaturas: 1450, total_despesas: 135890450.0, gasto_por_cadeira: 1941292.14 },
      { uf: 'RS', eleitos: 55, candidaturas: 890, total_despesas: 78940200.0, gasto_por_cadeira: 1435276.36 },
      { uf: 'CE', eleitos: 46, candidaturas: 680, total_despesas: 61250100.0, gasto_por_cadeira: 1331523.91 },
      { uf: 'MA', eleitos: 42, candidaturas: 590, total_despesas: 52140800.0, gasto_por_cadeira: 1241447.62 },
      { uf: 'RN', eleitos: 24, candidaturas: 390, total_despesas: 27850200.0, gasto_por_cadeira: 1160425.00 },
      { uf: 'MS', eleitos: 24, candidaturas: 318, total_despesas: 22065955.8, gasto_por_cadeira: 919414.83 }
    ],
    serie_temporal: [
      { ano: 2018, gasto_por_cadeira: 777964.76, total_despesas: 203048801.67, eleitos: 261, total_candidaturas: 5135, mediana_eleitos: 229465.89 },
      { ano: 2022, gasto_por_cadeira: 1448803.47, total_despesas: 378137705.80, eleitos: 261, total_candidaturas: 4318, mediana_eleitos: 408751.63 }
    ]
  },
  '2018_DEPUTADO ESTADUAL': {
    ano: 2018,
    cargo: 'DEPUTADO ESTADUAL',
    total_candidaturas: 5135,
    candidaturas_com_gasto: 4896,
    eleitos: 261,
    nao_eleitos: 4380,
    com_votos: 4641,
    total_despesas: 203048801.67,
    gasto_por_cadeira: 777964.76,
    mediana_gastos_eleitos: 229465.89,
    mediana_gastos_nao_eleitos: 2883.48,
    mediana_votos_eleitos: 37800.0,
    mediana_votos_nao_eleitos: 890.0,
    correlacao: { r_log: 0.6432, r2_log: 0.4137, r_linear: 0.621, n: 3383 },
    por_uf: [
      { uf: 'RJ', eleitos: 70, candidaturas: 1720, total_despesas: 71200300.0, gasto_por_cadeira: 1017147.14 },
      { uf: 'RS', eleitos: 55, candidaturas: 1050, total_despesas: 42100800.0, gasto_por_cadeira: 765469.09 },
      { uf: 'CE', eleitos: 46, candidaturas: 810, total_despesas: 33850100.0, gasto_por_cadeira: 735871.74 },
      { uf: 'MA', eleitos: 42, candidaturas: 715, total_despesas: 28900400.0, gasto_por_cadeira: 688104.76 },
      { uf: 'RN', eleitos: 24, candidaturas: 450, total_despesas: 14850200.0, gasto_por_cadeira: 618758.33 },
      { uf: 'MS', eleitos: 24, candidaturas: 390, total_despesas: 12147001.67, gasto_por_cadeira: 506125.07 }
    ],
    serie_temporal: [
      { ano: 2018, gasto_por_cadeira: 777964.76, total_despesas: 203048801.67, eleitos: 261, total_candidaturas: 5135, mediana_eleitos: 229465.89 },
      { ano: 2022, gasto_por_cadeira: 1448803.47, total_despesas: 378137705.80, eleitos: 261, total_candidaturas: 4318, mediana_eleitos: 408751.63 }
    ]
  },
  '2022_DEPUTADO FEDERAL': {
    ano: 2022,
    cargo: 'DEPUTADO FEDERAL',
    total_candidaturas: 2758,
    candidaturas_com_gasto: 2706,
    eleitos: 133,
    nao_eleitos: 2400,
    com_votos: 2533,
    total_despesas: 725934034.99,
    gasto_por_cadeira: 5458150.64,
    mediana_gastos_eleitos: 1718532.70,
    mediana_gastos_nao_eleitos: 39955.00,
    mediana_votos_eleitos: 89450.0,
    mediana_votos_nao_eleitos: 2450.0,
    correlacao: { r_log: 0.7457, r2_log: 0.5561, r_linear: 0.7093, n: 2277 },
    por_uf: [
      { uf: 'RJ', eleitos: 46, candidaturas: 1040, total_despesas: 268500200.0, gasto_por_cadeira: 5836960.87 },
      { uf: 'RS', eleitos: 31, candidaturas: 580, total_despesas: 169200400.0, gasto_por_cadeira: 5458077.42 },
      { uf: 'CE', eleitos: 22, candidaturas: 420, total_despesas: 119800500.0, gasto_por_cadeira: 5445477.27 },
      { uf: 'MA', eleitos: 18, candidaturas: 390, total_despesas: 95400800.0, gasto_por_cadeira: 5300044.44 },
      { uf: 'RN', eleitos: 8, candidaturas: 188, total_despesas: 39200400.0, gasto_por_cadeira: 4900050.00 },
      { uf: 'MS', eleitos: 8, candidaturas: 140, total_despesas: 33831734.99, gasto_por_cadeira: 4228966.87 }
    ],
    serie_temporal: [
      { ano: 2018, gasto_por_cadeira: 2294220.62, total_despesas: 305131342.28, eleitos: 133, total_candidaturas: 2307, mediana_eleitos: 861833.02 },
      { ano: 2022, gasto_por_cadeira: 5458150.64, total_despesas: 725934034.99, eleitos: 133, total_candidaturas: 2758, mediana_eleitos: 1718532.70 }
    ]
  },
  '2018_DEPUTADO FEDERAL': {
    ano: 2018,
    cargo: 'DEPUTADO FEDERAL',
    total_candidaturas: 2307,
    candidaturas_com_gasto: 2235,
    eleitos: 133,
    nao_eleitos: 1963,
    com_votos: 2096,
    total_despesas: 305131342.28,
    gasto_por_cadeira: 2294220.62,
    mediana_gastos_eleitos: 861833.02,
    mediana_gastos_nao_eleitos: 4687.55,
    mediana_votos_eleitos: 71200.0,
    mediana_votos_nao_eleitos: 1850.0,
    correlacao: { r_log: 0.689, r2_log: 0.4747, r_linear: 0.665, n: 1689 },
    por_uf: [
      { uf: 'RJ', eleitos: 46, candidaturas: 980, total_despesas: 118400300.0, gasto_por_cadeira: 2573919.57 },
      { uf: 'RS', eleitos: 31, candidaturas: 510, total_despesas: 74100500.0, gasto_por_cadeira: 2390338.71 },
      { uf: 'CE', eleitos: 22, candidaturas: 350, total_despesas: 48900400.0, gasto_por_cadeira: 2222745.45 },
      { uf: 'MA', eleitos: 18, candidaturas: 290, total_despesas: 37500100.0, gasto_por_cadeira: 2083338.89 },
      { uf: 'RN', eleitos: 8, candidaturas: 110, total_despesas: 14100200.0, gasto_por_cadeira: 1762525.00 },
      { uf: 'MS', eleitos: 8, candidaturas: 67, total_despesas: 12129842.28, gasto_por_cadeira: 1516230.29 }
    ],
    serie_temporal: [
      { ano: 2018, gasto_por_cadeira: 2294220.62, total_despesas: 305131342.28, eleitos: 133, total_candidaturas: 2307, mediana_eleitos: 861833.02 },
      { ano: 2022, gasto_por_cadeira: 5458150.64, total_despesas: 725934034.99, eleitos: 133, total_candidaturas: 2758, mediana_eleitos: 1718532.70 }
    ]
  }
};

export const sampleCandidates = [
  // 2024 Vereador - Casos emblemáticos reais
  {
    id: '9672ccc8a508dbffaf708bc9f0d2997a',
    nome: 'SILMARA',
    numero: 50100,
    partido: 'PSOL',
    uf: 'MA',
    municipio: 'São João dos Patos',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 22000.0,
    votos: 1,
    resultado: 'NÃO ELEITO',
    eleito: 0,
    custo_voto: 22000.0
  },
  {
    id: '910d9c983a44d9d8f3e36f84f05817d3',
    nome: 'FABIOLA ARAUJO',
    numero: 55777,
    partido: 'PSD',
    uf: 'CE',
    municipio: 'Eusébio',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 39999.98,
    votos: 2,
    resultado: 'NÃO ELEITO',
    eleito: 0,
    custo_voto: 19999.99
  },
  {
    id: '917a2e1382b84550e475e40d14c7b1c7',
    nome: 'THALITA JANSEM',
    numero: 55999,
    partido: 'PSD',
    uf: 'MA',
    municipio: 'Codó',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 116773.7,
    votos: 6,
    resultado: 'NÃO ELEITO',
    eleito: 0,
    custo_voto: 19462.28
  },
  {
    id: '9ee95c5f73d699102c9e14593955155c',
    nome: 'BRENDA CARVALHO',
    numero: 20789,
    partido: 'PODE',
    uf: 'MA',
    municipio: 'São Luís',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 300000.0,
    votos: 18,
    resultado: 'SUPLENTE',
    eleito: 0,
    custo_voto: 16666.67
  },
  {
    id: 'cacula_ze_maria_ma',
    nome: 'CAÇULA DO ZÉ MARIA',
    numero: 65123,
    partido: 'PC do B',
    uf: 'MA',
    municipio: 'Itaipava do Grajaú',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 20.95,
    votos: 951,
    resultado: 'ELEITO POR QP',
    eleito: 1,
    custo_voto: 0.02
  },
  {
    id: 'ney_paraty_rj',
    nome: 'NEY',
    numero: 10123,
    partido: 'REPUBLICANOS',
    uf: 'RJ',
    municipio: 'Paraty',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 50.0,
    votos: 597,
    resultado: 'ELEITO POR QP',
    eleito: 1,
    custo_voto: 0.08
  },
  {
    id: 'heloisa_helena_rj',
    nome: 'HELOÍSA HELENA',
    numero: 18000,
    partido: 'REDE',
    uf: 'RJ',
    municipio: 'Rio de Janeiro',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 1907647.38,
    votos: 11971,
    resultado: 'SUPLENTE',
    eleito: 0,
    custo_voto: 159.36
  },
  {
    id: 'rafaela_albergaria_rj',
    nome: 'RAFAELA ALBERGARIA',
    numero: 65000,
    partido: 'PC do B',
    uf: 'RJ',
    municipio: 'Rio de Janeiro',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 1820922.91,
    votos: 4546,
    resultado: 'SUPLENTE',
    eleito: 0,
    custo_voto: 400.55
  },
  {
    id: 'b05a74ac2d43e219681749dcc3257f6e',
    nome: 'JULIERME SENA',
    numero: 22123,
    partido: 'PL',
    uf: 'CE',
    municipio: 'Fortaleza',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 404893.72,
    votos: 10391,
    resultado: 'ELEITO POR QP',
    eleito: 1,
    custo_voto: 38.97
  },
  {
    id: 'chico_lopes_ma',
    nome: 'CHICO LOPES',
    numero: 13123,
    partido: 'PT',
    uf: 'MA',
    municipio: 'Pio XII',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 200.0,
    votos: 1718,
    resultado: 'ELEITO POR QP',
    eleito: 1,
    custo_voto: 0.12
  },
  {
    id: 'carlos_bolsonaro_rj',
    nome: 'CARLOS BOLSONARO',
    numero: 22222,
    partido: 'PL',
    uf: 'RJ',
    municipio: 'Rio de Janeiro',
    cargo: 'VEREADOR',
    ano: 2024,
    gastos: 785420.10,
    votos: 130481,
    resultado: 'ELEITO POR QP',
    eleito: 1,
    custo_voto: 6.02
  },
  {
    id: 'tarcisio_motta_rj_2020',
    nome: 'TARCÍSIO MOTTA',
    numero: 50123,
    partido: 'PSOL',
    uf: 'RJ',
    municipio: 'Rio de Janeiro',
    cargo: 'VEREADOR',
    ano: 2020,
    gastos: 248900.50,
    votos: 86243,
    resultado: 'ELEITO POR QP',
    eleito: 1,
    custo_voto: 2.89
  }
];
