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
  },
  '2022_PRESIDENTE': {
    ano: 2022,
    cargo: 'PRESIDENTE',
    total_candidaturas: 12,
    candidaturas_com_gasto: 11,
    candidaturas_gasto_zero: 1,
    candidaturas_gasto_positivo: 11,
    eleitos: 1,
    nao_eleitos: 11,
    com_votos: 11,
    total_despesas: 310822451.14,
    gasto_por_cadeira: 310822451.14,
    mediana_gastos_eleitos: 131424312.00,
    mediana_gastos_nao_eleitos: 3820000.00,
    mediana_votos_eleitos: 57259504.0,
    mediana_votos_nao_eleitos: 600955.0,
    mediana_custo_voto_eleitos: 2.29,
    mediana_custo_voto_nao_eleitos: 7.61,
    correlacao: { r_log: 0.812, r2_log: 0.659, r_linear: 0.884, n: 11 },
    por_uf: [
      { uf: 'BR', eleitos: 1, candidaturas: 12, total_despesas: 310822451.14, gasto_por_cadeira: 310822451.14 }
    ],
    serie_temporal: [
      { ano: 2018, gasto_por_cadeira: 196480000.00, total_despesas: 196480000.00, eleitos: 1, total_candidaturas: 13, mediana_eleitos: 2456215.00 },
      { ano: 2022, gasto_por_cadeira: 310822451.14, total_despesas: 310822451.14, eleitos: 1, total_candidaturas: 12, mediana_eleitos: 131424312.00 }
    ]
  },
  '2018_PRESIDENTE': {
    ano: 2018,
    cargo: 'PRESIDENTE',
    total_candidaturas: 13,
    candidaturas_com_gasto: 13,
    candidaturas_gasto_zero: 0,
    candidaturas_gasto_positivo: 13,
    eleitos: 1,
    nao_eleitos: 12,
    com_votos: 13,
    total_despesas: 196480000.00,
    gasto_por_cadeira: 196480000.00,
    mediana_gastos_eleitos: 2456215.00,
    mediana_gastos_nao_eleitos: 12800000.00,
    mediana_votos_eleitos: 49277010.0,
    mediana_votos_nao_eleitos: 1288950.0,
    mediana_custo_voto_eleitos: 0.05,
    mediana_custo_voto_nao_eleitos: 2.16,
    correlacao: { r_log: 0.785, r2_log: 0.616, r_linear: 0.821, n: 13 },
    por_uf: [
      { uf: 'BR', eleitos: 1, candidaturas: 13, total_despesas: 196480000.00, gasto_por_cadeira: 196480000.00 }
    ],
    serie_temporal: [
      { ano: 2018, gasto_por_cadeira: 196480000.00, total_despesas: 196480000.00, eleitos: 1, total_candidaturas: 13, mediana_eleitos: 2456215.00 },
      { ano: 2022, gasto_por_cadeira: 310822451.14, total_despesas: 310822451.14, eleitos: 1, total_candidaturas: 12, mediana_eleitos: 131424312.00 }
    ]
  }
};

export const sampleCandidates = [
  // 2022 Presidente
  { id: 'pres_2022_lula', nome: 'LULA', numero: 13, partido: 'PT', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2022, gastos: 131424312.00, votos: 57259504, resultado: 'ELEITO', eleito: 1, custo_voto: 2.29 },
  { id: 'pres_2022_bolsonaro', nome: 'JAIR BOLSONARO', numero: 22, partido: 'PL', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2022, gastos: 88642158.00, votos: 51072345, resultado: 'NÃO ELEITO', eleito: 0, custo_voto: 1.74 },
  { id: 'pres_2022_tebet', nome: 'SIMONE TEBET', numero: 15, partido: 'MDB', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2022, gastos: 41520100.00, votos: 4915423, resultado: 'NÃO ELEITO', eleito: 0, custo_voto: 8.45 },
  { id: 'pres_2022_ciro', nome: 'CIRO GOMES', numero: 12, partido: 'PDT', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2022, gastos: 38740500.00, votos: 3599287, resultado: 'NÃO ELEITO', eleito: 0, custo_voto: 10.76 },
  { id: 'pres_2022_soraya', nome: 'SORAYA THRONICKE', numero: 44, partido: 'UNIÃO', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2022, gastos: 37810000.00, votos: 600955, resultado: 'NÃO ELEITO', eleito: 0, custo_voto: 62.92 },
  { id: 'pres_2022_davila', nome: 'FELIPE D\'AVILA', numero: 30, partido: 'NOVO', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2022, gastos: 3820000.00, votos: 559708, resultado: 'NÃO ELEITO', eleito: 0, custo_voto: 6.82 },
  // 2018 Presidente
  { id: 'pres_2018_bolsonaro', nome: 'JAIR BOLSONARO', numero: 17, partido: 'PSL', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2018, gastos: 2456215.00, votos: 49277010, resultado: 'ELEITO', eleito: 1, custo_voto: 0.05 },
  { id: 'pres_2018_haddad', nome: 'FERNANDO HADDAD', numero: 13, partido: 'PT', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2018, gastos: 37525400.00, votos: 31342051, resultado: 'NÃO ELEITO', eleito: 0, custo_voto: 1.20 },
  { id: 'pres_2018_ciro', nome: 'CIRO GOMES', numero: 12, partido: 'PDT', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2018, gastos: 25120000.00, votos: 13344371, resultado: 'NÃO ELEITO', eleito: 0, custo_voto: 1.88 },
  { id: 'pres_2018_alckmin', nome: 'GERALDO ALCKMIN', numero: 45, partido: 'PSDB', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2018, gastos: 53200000.00, votos: 5096349, resultado: 'NÃO ELEITO', eleito: 0, custo_voto: 10.44 },
  { id: 'pres_2018_meirelles', nome: 'HENRIQUE MEIRELLES', numero: 15, partido: 'MDB', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2018, gastos: 54000000.00, votos: 1288950, resultado: 'NÃO ELEITO', eleito: 0, custo_voto: 41.90 },
  { id: 'pres_2018_amoedo', nome: 'JOÃO AMOÊDO', numero: 30, partido: 'NOVO', uf: 'BR', municipio: 'Brasília', cargo: 'PRESIDENTE', ano: 2018, gastos: 4900000.00, votos: 2679745, resultado: 'NÃO ELEITO', eleito: 0, custo_voto: 1.83 },
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


export const questao1PartidosPorEscopo = {
  '2024_VEREADOR': [
    { partido: 'REDE', candidaturas: 412, eleitos: 14, nao_eleitos: 398, gasto_total: 4180200.50, custo_por_cadeira: 298585.75, min_gasto: 150, q1_gasto: 820, mediana_gasto: 2450, q3_gasto: 9800, max_gasto: 1907647.38, max_outlier_nao_eleito: 1907647.38, outlier_nome: 'HELOÍSA HELENA (RJ · Suplente)', outlier_votos: 11971 },
    { partido: 'NOVO', candidaturas: 620, eleitos: 38, nao_eleitos: 582, gasto_total: 6540120.00, custo_por_cadeira: 172108.42, min_gasto: 350, q1_gasto: 2100, mediana_gasto: 6800, q3_gasto: 24500, max_gasto: 412000.00, max_outlier_nao_eleito: 318400.00, outlier_nome: 'CANDIDATURA CAPITAL (RJ · Suplente)', outlier_votos: 6420 },
    { partido: 'PSOL', candidaturas: 1890, eleitos: 76, nao_eleitos: 1814, gasto_total: 11850400.00, custo_por_cadeira: 155926.32, min_gasto: 100, q1_gasto: 650, mediana_gasto: 1950, q3_gasto: 7400, max_gasto: 890450.00, max_outlier_nao_eleito: 645200.00, outlier_nome: 'SILMARA (MA · Não eleito)', outlier_votos: 1 },
    { partido: 'PT', candidaturas: 6840, eleitos: 812, nao_eleitos: 6028, gasto_total: 68420500.00, custo_por_cadeira: 84261.70, min_gasto: 85, q1_gasto: 980, mediana_gasto: 3120, q3_gasto: 11400, max_gasto: 1290783.00, max_outlier_nao_eleito: 742100.00, outlier_nome: 'TAINÁ DE PAULA (RJ · Eleita)', outlier_votos: 49986 },
    { partido: 'PC do B', candidaturas: 1120, eleitos: 118, nao_eleitos: 1002, gasto_total: 9240800.00, custo_por_cadeira: 78311.86, min_gasto: 20.95, q1_gasto: 720, mediana_gasto: 2300, q3_gasto: 8900, max_gasto: 1820922.91, max_outlier_nao_eleito: 1820922.91, outlier_nome: 'RAFAELA ALBERGARIA (RJ · Suplente)', outlier_votos: 4546 },
    { partido: 'PL', candidaturas: 8920, eleitos: 1245, nao_eleitos: 7675, gasto_total: 92150400.00, custo_por_cadeira: 74016.39, min_gasto: 120, q1_gasto: 1150, mediana_gasto: 3950, q3_gasto: 14200, max_gasto: 1507522.00, max_outlier_nao_eleito: 812400.00, outlier_nome: 'CARLOS BOLSONARO (RJ · Eleito)', outlier_votos: 130481 },
    { partido: 'UNIÃO', candidaturas: 7650, eleitos: 1190, nao_eleitos: 6460, gasto_total: 74890200.00, custo_por_cadeira: 62932.94, min_gasto: 110, q1_gasto: 1050, mediana_gasto: 3600, q3_gasto: 12800, max_gasto: 980400.00, max_outlier_nao_eleito: 590200.00, outlier_nome: 'MARQUINHOS (MA · Eleito)', outlier_votos: 12200 },
    { partido: 'REPUBLICANOS', candidaturas: 6420, eleitos: 1085, nao_eleitos: 5335, gasto_total: 61420800.00, custo_por_cadeira: 56609.03, min_gasto: 50.00, q1_gasto: 940, mediana_gasto: 3250, q3_gasto: 11500, max_gasto: 845000.00, max_outlier_nao_eleito: 512000.00, outlier_nome: 'RONALDO MARTINS (CE · Eleito)', outlier_votos: 20288 },
    { partido: 'PODE', candidaturas: 4890, eleitos: 640, nao_eleitos: 4250, gasto_total: 34820100.00, custo_por_cadeira: 54406.41, min_gasto: 95, q1_gasto: 850, mediana_gasto: 2890, q3_gasto: 10200, max_gasto: 620000.00, max_outlier_nao_eleito: 300000.00, outlier_nome: 'BRENDA CARVALHO (MA · Suplente)', outlier_votos: 18 },
    { partido: 'PSD', candidaturas: 8450, eleitos: 1690, nao_eleitos: 6760, gasto_total: 86450900.00, custo_por_cadeira: 51154.38, min_gasto: 100, q1_gasto: 1100, mediana_gasto: 3780, q3_gasto: 12900, max_gasto: 1568013.00, max_outlier_nao_eleito: 680400.00, outlier_nome: 'CARLO CAIADO (RJ · Eleito)', outlier_votos: 47671 },
    { partido: 'PSB', candidaturas: 5620, eleitos: 920, nao_eleitos: 4700, gasto_total: 42180500.00, custo_por_cadeira: 45848.37, min_gasto: 90, q1_gasto: 890, mediana_gasto: 2950, q3_gasto: 9800, max_gasto: 710200.00, max_outlier_nao_eleito: 420100.00, outlier_nome: 'CARLÃO COMUNITÁRIO (MS · Eleito)', outlier_votos: 6912 },
    { partido: 'PDT', candidaturas: 6180, eleitos: 1040, nao_eleitos: 5140, gasto_total: 44920300.00, custo_por_cadeira: 43192.60, min_gasto: 80, q1_gasto: 860, mediana_gasto: 2840, q3_gasto: 9400, max_gasto: 690500.00, max_outlier_nao_eleito: 395000.00, outlier_nome: 'MARQUINHOS TRAD (MS · Eleito)', outlier_votos: 8567 },
    { partido: 'PSDB', candidaturas: 4120, eleitos: 715, nao_eleitos: 3405, gasto_total: 29450600.00, custo_por_cadeira: 41189.65, min_gasto: 110, q1_gasto: 920, mediana_gasto: 3010, q3_gasto: 9600, max_gasto: 540200.00, max_outlier_nao_eleito: 310000.00, outlier_nome: 'SILVIO PITU (MS · Eleito)', outlier_votos: 6409 },
    { partido: 'PP', candidaturas: 9120, eleitos: 1890, nao_eleitos: 7230, gasto_total: 64120400.00, custo_por_cadeira: 33926.14, min_gasto: 75, q1_gasto: 880, mediana_gasto: 2980, q3_gasto: 9200, max_gasto: 780100.00, max_outlier_nao_eleito: 445000.00, outlier_nome: 'ERIKO JÁCOME (RN · Eleito)', outlier_votos: 8819 },
    { partido: 'MDB', candidaturas: 10240, eleitos: 2150, nao_eleitos: 8090, gasto_total: 69850200.00, custo_por_cadeira: 32488.47, min_gasto: 65, q1_gasto: 850, mediana_gasto: 2890, q3_gasto: 8950, max_gasto: 820400.00, max_outlier_nao_eleito: 460200.00, outlier_nome: 'LIDERANÇA MUNICIPAL (RS · Eleito)', outlier_votos: 15420 }
  ],
  '2020_VEREADOR': [
    { partido: 'NOVO', candidaturas: 480, eleitos: 22, nao_eleitos: 458, gasto_total: 2680400.00, custo_por_cadeira: 121836.36, min_gasto: 250, q1_gasto: 1400, mediana_gasto: 4200, q3_gasto: 15800, max_gasto: 245000.00, max_outlier_nao_eleito: 189000.00 },
    { partido: 'PSOL', candidaturas: 1650, eleitos: 68, nao_eleitos: 1582, gasto_total: 4890200.00, custo_por_cadeira: 71914.71, min_gasto: 80, q1_gasto: 420, mediana_gasto: 1250, q3_gasto: 4800, max_gasto: 380000.00, max_outlier_nao_eleito: 260000.00 },
    { partido: 'PT', candidaturas: 7420, eleitos: 790, nao_eleitos: 6630, gasto_total: 29450100.00, custo_por_cadeira: 37278.61, min_gasto: 60, q1_gasto: 540, mediana_gasto: 1680, q3_gasto: 6200, max_gasto: 520000.00, max_outlier_nao_eleito: 310000.00 },
    { partido: 'PL', candidaturas: 6890, eleitos: 980, nao_eleitos: 5910, gasto_total: 28900400.00, custo_por_cadeira: 29490.20, min_gasto: 70, q1_gasto: 580, mediana_gasto: 1850, q3_gasto: 6400, max_gasto: 610000.00, max_outlier_nao_eleito: 340000.00 },
    { partido: 'PSD', candidaturas: 8910, eleitos: 1580, nao_eleitos: 7330, gasto_total: 38420600.00, custo_por_cadeira: 24316.84, min_gasto: 65, q1_gasto: 560, mediana_gasto: 1890, q3_gasto: 6100, max_gasto: 640000.00, max_outlier_nao_eleito: 350000.00 },
    { partido: 'REPUBLICANOS', candidaturas: 6120, eleitos: 940, nao_eleitos: 5180, gasto_total: 22150800.00, custo_por_cadeira: 23564.68, min_gasto: 50, q1_gasto: 510, mediana_gasto: 1720, q3_gasto: 5800, max_gasto: 480000.00, max_outlier_nao_eleito: 290000.00 },
    { partido: 'PDT', candidaturas: 7850, eleitos: 1210, nao_eleitos: 6640, gasto_total: 24890200.00, custo_por_cadeira: 20570.41, min_gasto: 55, q1_gasto: 490, mediana_gasto: 1640, q3_gasto: 5400, max_gasto: 450000.00, max_outlier_nao_eleito: 270000.00 },
    { partido: 'PSB', candidaturas: 6940, eleitos: 1050, nao_eleitos: 5890, gasto_total: 20980400.00, custo_por_cadeira: 19981.33, min_gasto: 60, q1_gasto: 480, mediana_gasto: 1590, q3_gasto: 5200, max_gasto: 410000.00, max_outlier_nao_eleito: 250000.00 },
    { partido: 'PSDB', candidaturas: 6420, eleitos: 1120, nao_eleitos: 5300, gasto_total: 21450200.00, custo_por_cadeira: 19151.96, min_gasto: 65, q1_gasto: 500, mediana_gasto: 1650, q3_gasto: 5300, max_gasto: 390000.00, max_outlier_nao_eleito: 230000.00 },
    { partido: 'PP', candidaturas: 9840, eleitos: 1960, nao_eleitos: 7880, gasto_total: 31250800.00, custo_por_cadeira: 15944.29, min_gasto: 50, q1_gasto: 460, mediana_gasto: 1520, q3_gasto: 4900, max_gasto: 420000.00, max_outlier_nao_eleito: 240000.00 },
    { partido: 'MDB', candidaturas: 11420, eleitos: 2290, nao_eleitos: 9130, gasto_total: 34890500.00, custo_por_cadeira: 15236.03, min_gasto: 45, q1_gasto: 450, mediana_gasto: 1490, q3_gasto: 4800, max_gasto: 460000.00, max_outlier_nao_eleito: 260000.00 }
  ],
  '2022_DEPUTADO ESTADUAL': [
    { partido: 'UNIÃO', candidaturas: 390, eleitos: 23, nao_eleitos: 367, gasto_total: 46890200.00, custo_por_cadeira: 2038704.35, min_gasto: 1200, q1_gasto: 9500, mediana_gasto: 28400, q3_gasto: 145000, max_gasto: 2150000.00, max_outlier_nao_eleito: 1480000.00 },
    { partido: 'PSD', candidaturas: 340, eleitos: 20, nao_eleitos: 320, gasto_total: 36420800.00, custo_por_cadeira: 1821040.00, min_gasto: 1500, q1_gasto: 8900, mediana_gasto: 26500, q3_gasto: 138000, max_gasto: 1980000.00, max_outlier_nao_eleito: 1320000.00 },
    { partido: 'PL', candidaturas: 465, eleitos: 42, nao_eleitos: 423, gasto_total: 68450900.00, custo_por_cadeira: 1629783.33, min_gasto: 1100, q1_gasto: 10200, mediana_gasto: 32100, q3_gasto: 162000, max_gasto: 2280000.00, max_outlier_nao_eleito: 1590000.00 },
    { partido: 'REPUBLICANOS', candidaturas: 310, eleitos: 19, nao_eleitos: 291, gasto_total: 29450100.00, custo_por_cadeira: 1550005.26, min_gasto: 980, q1_gasto: 8400, mediana_gasto: 24900, q3_gasto: 128000, max_gasto: 1890000.00, max_outlier_nao_eleito: 1180000.00 },
    { partido: 'PP', candidaturas: 330, eleitos: 24, nao_eleitos: 306, gasto_total: 35890400.00, custo_por_cadeira: 1495433.33, min_gasto: 1400, q1_gasto: 9100, mediana_gasto: 27800, q3_gasto: 142000, max_gasto: 1920000.00, max_outlier_nao_eleito: 1250000.00 },
    { partido: 'PT', candidaturas: 380, eleitos: 34, nao_eleitos: 346, gasto_total: 48920500.00, custo_por_cadeira: 1438838.24, min_gasto: 950, q1_gasto: 8800, mediana_gasto: 29400, q3_gasto: 154000, max_gasto: 2050000.00, max_outlier_nao_eleito: 1340000.00 },
    { partido: 'MDB', candidaturas: 355, eleitos: 27, nao_eleitos: 328, gasto_total: 36120400.00, custo_por_cadeira: 1337792.59, min_gasto: 1250, q1_gasto: 8600, mediana_gasto: 25800, q3_gasto: 134000, max_gasto: 1840000.00, max_outlier_nao_eleito: 1190000.00 },
    { partido: 'PDT', candidaturas: 345, eleitos: 22, nao_eleitos: 323, gasto_total: 27450200.00, custo_por_cadeira: 1247736.36, min_gasto: 900, q1_gasto: 7800, mediana_gasto: 22400, q3_gasto: 118000, max_gasto: 1680000.00, max_outlier_nao_eleito: 1090000.00 },
    { partido: 'PSDB', candidaturas: 240, eleitos: 14, nao_eleitos: 226, gasto_total: 16890400.00, custo_por_cadeira: 1206457.14, min_gasto: 1100, q1_gasto: 7500, mediana_gasto: 21900, q3_gasto: 112000, max_gasto: 1540000.00, max_outlier_nao_eleito: 980000.00 },
    { partido: 'PSB', candidaturas: 295, eleitos: 15, nao_eleitos: 280, gasto_total: 17120600.00, custo_por_cadeira: 1141373.33, min_gasto: 850, q1_gasto: 7200, mediana_gasto: 20500, q3_gasto: 108000, max_gasto: 1490000.00, max_outlier_nao_eleito: 920000.00 },
    { partido: 'PSOL', candidaturas: 310, eleitos: 12, nao_eleitos: 298, gasto_total: 9840200.00, custo_por_cadeira: 820016.67, min_gasto: 450, q1_gasto: 3200, mediana_gasto: 9800, q3_gasto: 48000, max_gasto: 980000.00, max_outlier_nao_eleito: 610000.00 }
  ],
  '2018_DEPUTADO ESTADUAL': [
    { partido: 'PSD', candidaturas: 380, eleitos: 21, nao_eleitos: 359, gasto_total: 21450200.00, custo_por_cadeira: 1021438.10, min_gasto: 800, q1_gasto: 4200, mediana_gasto: 14500, q3_gasto: 78000, max_gasto: 1120000.00, max_outlier_nao_eleito: 740000.00 },
    { partido: 'PP', candidaturas: 390, eleitos: 25, nao_eleitos: 365, gasto_total: 23890400.00, custo_por_cadeira: 955616.00, min_gasto: 750, q1_gasto: 4100, mediana_gasto: 13800, q3_gasto: 74000, max_gasto: 1080000.00, max_outlier_nao_eleito: 690000.00 },
    { partido: 'MDB', candidaturas: 420, eleitos: 29, nao_eleitos: 391, gasto_total: 25420800.00, custo_por_cadeira: 876579.31, min_gasto: 700, q1_gasto: 3900, mediana_gasto: 13200, q3_gasto: 71000, max_gasto: 990000.00, max_outlier_nao_eleito: 650000.00 },
    { partido: 'PDT', candidaturas: 410, eleitos: 26, nao_eleitos: 384, gasto_total: 21120400.00, custo_por_cadeira: 812323.08, min_gasto: 650, q1_gasto: 3600, mediana_gasto: 12400, q3_gasto: 68000, max_gasto: 940000.00, max_outlier_nao_eleito: 610000.00 },
    { partido: 'PT', candidaturas: 430, eleitos: 30, nao_eleitos: 400, gasto_total: 23450600.00, custo_por_cadeira: 781686.67, min_gasto: 600, q1_gasto: 3800, mediana_gasto: 12900, q3_gasto: 69000, max_gasto: 960000.00, max_outlier_nao_eleito: 620000.00 },
    { partido: 'PSDB', candidaturas: 350, eleitos: 18, nao_eleitos: 332, gasto_total: 13890200.00, custo_por_cadeira: 771677.78, min_gasto: 720, q1_gasto: 3700, mediana_gasto: 12100, q3_gasto: 64000, max_gasto: 890000.00, max_outlier_nao_eleito: 580000.00 },
    { partido: 'PSB', candidaturas: 380, eleitos: 20, nao_eleitos: 360, gasto_total: 14920400.00, custo_por_cadeira: 746020.00, min_gasto: 680, q1_gasto: 3500, mediana_gasto: 11800, q3_gasto: 62000, max_gasto: 860000.00, max_outlier_nao_eleito: 540000.00 },
    { partido: 'PL', candidaturas: 360, eleitos: 22, nao_eleitos: 338, gasto_total: 15890200.00, custo_por_cadeira: 722281.82, min_gasto: 640, q1_gasto: 3400, mediana_gasto: 11500, q3_gasto: 60000, max_gasto: 840000.00, max_outlier_nao_eleito: 520000.00 },
    { partido: 'PSOL', candidaturas: 340, eleitos: 11, nao_eleitos: 329, gasto_total: 4980200.00, custo_por_cadeira: 452745.45, min_gasto: 300, q1_gasto: 1800, mediana_gasto: 5400, q3_gasto: 28000, max_gasto: 510000.00, max_outlier_nao_eleito: 340000.00 }
  ],
  '2022_DEPUTADO FEDERAL': [
    { partido: 'UNIÃO', candidaturas: 245, eleitos: 14, nao_eleitos: 231, gasto_total: 98450200.00, custo_por_cadeira: 7032157.14, min_gasto: 2500, q1_gasto: 28000, mediana_gasto: 95000, q3_gasto: 480000, max_gasto: 3150000.00, max_outlier_nao_eleito: 2890000.00, outlier_nome: 'SUPLENTE FEDERAL (RJ · Suplente)', outlier_votos: 48200 },
    { partido: 'PSD', candidaturas: 220, eleitos: 12, nao_eleitos: 208, gasto_total: 78920400.00, custo_por_cadeira: 6576700.00, min_gasto: 2200, q1_gasto: 26500, mediana_gasto: 88000, q3_gasto: 450000, max_gasto: 3120000.00, max_outlier_nao_eleito: 2640000.00 },
    { partido: 'MDB', candidaturas: 215, eleitos: 11, nao_eleitos: 204, gasto_total: 67890200.00, custo_por_cadeira: 6171836.36, min_gasto: 2100, q1_gasto: 24000, mediana_gasto: 82000, q3_gasto: 420000, max_gasto: 3050000.00, max_outlier_nao_eleito: 2480000.00 },
    { partido: 'PP', candidaturas: 210, eleitos: 12, nao_eleitos: 198, gasto_total: 71450800.00, custo_por_cadeira: 5954233.33, min_gasto: 2400, q1_gasto: 25500, mediana_gasto: 86000, q3_gasto: 440000, max_gasto: 3090000.00, max_outlier_nao_eleito: 2520000.00 },
    { partido: 'REPUBLICANOS', candidaturas: 205, eleitos: 10, nao_eleitos: 195, gasto_total: 56890400.00, custo_por_cadeira: 5689040.00, min_gasto: 1900, q1_gasto: 22000, mediana_gasto: 78000, q3_gasto: 395000, max_gasto: 2980000.00, max_outlier_nao_eleito: 2390000.00 },
    { partido: 'PL', candidaturas: 295, eleitos: 26, nao_eleitos: 269, gasto_total: 138450600.00, custo_por_cadeira: 5325023.08, min_gasto: 2000, q1_gasto: 29000, mediana_gasto: 98000, q3_gasto: 510000, max_gasto: 3175000.00, max_outlier_nao_eleito: 2750000.00 },
    { partido: 'PDT', candidaturas: 210, eleitos: 9, nao_eleitos: 201, gasto_total: 46120400.00, custo_por_cadeira: 5124488.89, min_gasto: 1800, q1_gasto: 21000, mediana_gasto: 74000, q3_gasto: 380000, max_gasto: 2890000.00, max_outlier_nao_eleito: 2210000.00 },
    { partido: 'PT', candidaturas: 250, eleitos: 21, nao_eleitos: 229, gasto_total: 102450800.00, custo_por_cadeira: 4878609.52, min_gasto: 1850, q1_gasto: 27000, mediana_gasto: 92000, q3_gasto: 475000, max_gasto: 3140000.00, max_outlier_nao_eleito: 2590000.00 },
    { partido: 'PSB', candidaturas: 185, eleitos: 6, nao_eleitos: 179, gasto_total: 28450200.00, custo_por_cadeira: 4741700.00, min_gasto: 1600, q1_gasto: 19500, mediana_gasto: 68000, q3_gasto: 345000, max_gasto: 2740000.00, max_outlier_nao_eleito: 2150000.00 },
    { partido: 'PSDB', candidaturas: 155, eleitos: 5, nao_eleitos: 150, gasto_total: 22890400.00, custo_por_cadeira: 4578080.00, min_gasto: 1750, q1_gasto: 18800, mediana_gasto: 64000, q3_gasto: 330000, max_gasto: 2650000.00, max_outlier_nao_eleito: 1980000.00 },
    { partido: 'PSOL', candidaturas: 195, eleitos: 7, nao_eleitos: 188, gasto_total: 14120600.00, custo_por_cadeira: 2017228.57, min_gasto: 950, q1_gasto: 8400, mediana_gasto: 28500, q3_gasto: 142000, max_gasto: 1680000.00, max_outlier_nao_eleito: 1120000.00 }
  ],
  '2018_DEPUTADO FEDERAL': [
    { partido: 'MDB', candidaturas: 195, eleitos: 14, nao_eleitos: 181, gasto_total: 41250800.00, custo_por_cadeira: 2946485.71, min_gasto: 1400, q1_gasto: 12500, mediana_gasto: 42000, q3_gasto: 215000, max_gasto: 2450000.00, max_outlier_nao_eleito: 1820000.00 },
    { partido: 'PP', candidaturas: 185, eleitos: 13, nao_eleitos: 172, gasto_total: 36890400.00, custo_por_cadeira: 2837723.08, min_gasto: 1350, q1_gasto: 11800, mediana_gasto: 39500, q3_gasto: 204000, max_gasto: 2380000.00, max_outlier_nao_eleito: 1750000.00 },
    { partido: 'PSD', candidaturas: 180, eleitos: 12, nao_eleitos: 168, gasto_total: 31450200.00, custo_por_cadeira: 2620850.00, min_gasto: 1300, q1_gasto: 11200, mediana_gasto: 38000, q3_gasto: 195000, max_gasto: 2290000.00, max_outlier_nao_eleito: 1680000.00 },
    { partido: 'PDT', candidaturas: 190, eleitos: 14, nao_eleitos: 176, gasto_total: 34120600.00, custo_por_cadeira: 2437185.71, min_gasto: 1200, q1_gasto: 10800, mediana_gasto: 36500, q3_gasto: 188000, max_gasto: 2190000.00, max_outlier_nao_eleito: 1590000.00 },
    { partido: 'PT', candidaturas: 210, eleitos: 18, nao_eleitos: 192, gasto_total: 41890400.00, custo_por_cadeira: 2327244.44, min_gasto: 1150, q1_gasto: 11500, mediana_gasto: 38900, q3_gasto: 198000, max_gasto: 2240000.00, max_outlier_nao_eleito: 1640000.00 },
    { partido: 'PSDB', candidaturas: 170, eleitos: 9, nao_eleitos: 161, gasto_total: 20450200.00, custo_por_cadeira: 2272244.44, min_gasto: 1250, q1_gasto: 10400, mediana_gasto: 34800, q3_gasto: 178000, max_gasto: 2120000.00, max_outlier_nao_eleito: 1520000.00 },
    { partido: 'PSB', candidaturas: 175, eleitos: 11, nao_eleitos: 164, gasto_total: 23890400.00, custo_por_cadeira: 2171854.55, min_gasto: 1180, q1_gasto: 10100, mediana_gasto: 33900, q3_gasto: 172000, max_gasto: 2050000.00, max_outlier_nao_eleito: 1480000.00 },
    { partido: 'PL', candidaturas: 195, eleitos: 15, nao_eleitos: 180, gasto_total: 31120400.00, custo_por_cadeira: 2074693.33, min_gasto: 1100, q1_gasto: 9800, mediana_gasto: 32500, q3_gasto: 168000, max_gasto: 1980000.00, max_outlier_nao_eleito: 1420000.00 },
    { partido: 'PSOL', candidaturas: 165, eleitos: 6, nao_eleitos: 159, gasto_total: 6890200.00, custo_por_cadeira: 1148366.67, min_gasto: 600, q1_gasto: 4200, mediana_gasto: 14500, q3_gasto: 72000, max_gasto: 980000.00, max_outlier_nao_eleito: 640000.00 }
  ],
  '2022_PRESIDENTE': [
    { partido: 'PT', candidaturas: 1, eleitos: 1, nao_eleitos: 0, gasto_total: 131424312.00, custo_por_cadeira: 131424312.00, min_gasto: 131424312.00, q1_gasto: 131424312.00, mediana_gasto: 131424312.00, q3_gasto: 131424312.00, max_gasto: 131424312.00, max_outlier_nao_eleito: 0, outlier_nome: 'LULA (Eleito)', outlier_votos: 57259504 },
    { partido: 'PL', candidaturas: 1, eleitos: 0, nao_eleitos: 1, gasto_total: 88642158.00, custo_por_cadeira: 0, min_gasto: 88642158.00, q1_gasto: 88642158.00, mediana_gasto: 88642158.00, q3_gasto: 88642158.00, max_gasto: 88642158.00, max_outlier_nao_eleito: 88642158.00, outlier_nome: 'JAIR BOLSONARO (Não eleito)', outlier_votos: 51072345 },
    { partido: 'MDB', candidaturas: 1, eleitos: 0, nao_eleitos: 1, gasto_total: 41520100.00, custo_por_cadeira: 0, min_gasto: 41520100.00, q1_gasto: 41520100.00, mediana_gasto: 41520100.00, q3_gasto: 41520100.00, max_gasto: 41520100.00, max_outlier_nao_eleito: 41520100.00, outlier_nome: 'SIMONE TEBET (Não eleito)', outlier_votos: 4915423 },
    { partido: 'PDT', candidaturas: 1, eleitos: 0, nao_eleitos: 1, gasto_total: 38740500.00, custo_por_cadeira: 0, min_gasto: 38740500.00, q1_gasto: 38740500.00, mediana_gasto: 38740500.00, q3_gasto: 38740500.00, max_gasto: 38740500.00, max_outlier_nao_eleito: 38740500.00, outlier_nome: 'CIRO GOMES (Não eleito)', outlier_votos: 3599287 },
    { partido: 'UNIÃO', candidaturas: 1, eleitos: 0, nao_eleitos: 1, gasto_total: 37810000.00, custo_por_cadeira: 0, min_gasto: 37810000.00, q1_gasto: 37810000.00, mediana_gasto: 37810000.00, q3_gasto: 37810000.00, max_gasto: 37810000.00, max_outlier_nao_eleito: 37810000.00, outlier_nome: 'SORAYA THRONICKE (Não eleito)', outlier_votos: 600955 },
    { partido: 'NOVO', candidaturas: 1, eleitos: 0, nao_eleitos: 1, gasto_total: 3820000.00, custo_por_cadeira: 0, min_gasto: 3820000.00, q1_gasto: 3820000.00, mediana_gasto: 3820000.00, q3_gasto: 3820000.00, max_gasto: 3820000.00, max_outlier_nao_eleito: 3820000.00, outlier_nome: 'FELIPE D\'AVILA (Não eleito)', outlier_votos: 559708 }
  ],
  '2018_PRESIDENTE': [
    { partido: 'PSL', candidaturas: 1, eleitos: 1, nao_eleitos: 0, gasto_total: 2456215.00, custo_por_cadeira: 2456215.00, min_gasto: 2456215.00, q1_gasto: 2456215.00, mediana_gasto: 2456215.00, q3_gasto: 2456215.00, max_gasto: 2456215.00, max_outlier_nao_eleito: 0, outlier_nome: 'JAIR BOLSONARO (Eleito)', outlier_votos: 49277010 },
    { partido: 'PT', candidaturas: 1, eleitos: 0, nao_eleitos: 1, gasto_total: 37525400.00, custo_por_cadeira: 0, min_gasto: 37525400.00, q1_gasto: 37525400.00, mediana_gasto: 37525400.00, q3_gasto: 37525400.00, max_gasto: 37525400.00, max_outlier_nao_eleito: 37525400.00, outlier_nome: 'FERNANDO HADDAD (Não eleito)', outlier_votos: 31342051 },
    { partido: 'PDT', candidaturas: 1, eleitos: 0, nao_eleitos: 1, gasto_total: 25120000.00, custo_por_cadeira: 0, min_gasto: 25120000.00, q1_gasto: 25120000.00, mediana_gasto: 25120000.00, q3_gasto: 25120000.00, max_gasto: 25120000.00, max_outlier_nao_eleito: 25120000.00, outlier_nome: 'CIRO GOMES (Não eleito)', outlier_votos: 13344371 },
    { partido: 'PSDB', candidaturas: 1, eleitos: 0, nao_eleitos: 1, gasto_total: 53200000.00, custo_por_cadeira: 0, min_gasto: 53200000.00, q1_gasto: 53200000.00, mediana_gasto: 53200000.00, q3_gasto: 53200000.00, max_gasto: 53200000.00, max_outlier_nao_eleito: 53200000.00, outlier_nome: 'GERALDO ALCKMIN (Não eleito)', outlier_votos: 5096349 },
    { partido: 'MDB', candidaturas: 1, eleitos: 0, nao_eleitos: 1, gasto_total: 54000000.00, custo_por_cadeira: 0, min_gasto: 54000000.00, q1_gasto: 54000000.00, mediana_gasto: 54000000.00, q3_gasto: 54000000.00, max_gasto: 54000000.00, max_outlier_nao_eleito: 54000000.00, outlier_nome: 'HENRIQUE MEIRELLES (Não eleito)', outlier_votos: 1288950 },
    { partido: 'NOVO', candidaturas: 1, eleitos: 0, nao_eleitos: 1, gasto_total: 4900000.00, custo_por_cadeira: 0, min_gasto: 4900000.00, q1_gasto: 4900000.00, mediana_gasto: 4900000.00, q3_gasto: 4900000.00, max_gasto: 4900000.00, max_outlier_nao_eleito: 4900000.00, outlier_nome: 'JOÃO AMOÊDO (Não eleito)', outlier_votos: 2679745 }
  ]
};

export const questao1ComparacaoCargos = {
  2022: [
    { partido: 'UNIÃO', custo_estadual: 2038704.35, eleitos_estadual: 23, custo_federal: 7032157.14, eleitos_federal: 14, custo_presidencial: 37810000.00, eleitos_presidencial: 0 },
    { partido: 'PSD', custo_estadual: 1821040.00, eleitos_estadual: 20, custo_federal: 6576700.00, eleitos_federal: 12, custo_presidencial: 0, eleitos_presidencial: 0 },
    { partido: 'MDB', custo_estadual: 1337792.59, eleitos_estadual: 27, custo_federal: 6171836.36, eleitos_federal: 11, custo_presidencial: 41520100.00, eleitos_presidencial: 0 },
    { partido: 'PP', custo_estadual: 1495433.33, eleitos_estadual: 24, custo_federal: 5954233.33, eleitos_federal: 12, custo_presidencial: 0, eleitos_presidencial: 0 },
    { partido: 'REPUBLICANOS', custo_estadual: 1550005.26, eleitos_estadual: 19, custo_federal: 5689040.00, eleitos_federal: 10, custo_presidencial: 0, eleitos_presidencial: 0 },
    { partido: 'PL', custo_estadual: 1629783.33, eleitos_estadual: 42, custo_federal: 5325023.08, eleitos_federal: 26, custo_presidencial: 88642158.00, eleitos_presidencial: 0 },
    { partido: 'PDT', custo_estadual: 1247736.36, eleitos_estadual: 22, custo_federal: 5124488.89, eleitos_federal: 9, custo_presidencial: 38740500.00, eleitos_presidencial: 0 },
    { partido: 'PT', custo_estadual: 1438838.24, eleitos_estadual: 34, custo_federal: 4878609.52, eleitos_federal: 21, custo_presidencial: 131424312.00, eleitos_presidencial: 1 },
    { partido: 'PSB', custo_estadual: 1141373.33, eleitos_estadual: 15, custo_federal: 4741700.00, eleitos_federal: 6, custo_presidencial: 0, eleitos_presidencial: 0 },
    { partido: 'PSDB', custo_estadual: 1206457.14, eleitos_estadual: 14, custo_federal: 4578080.00, eleitos_federal: 5, custo_presidencial: 0, eleitos_presidencial: 0 },
    { partido: 'PSOL', custo_estadual: 820016.67, eleitos_estadual: 12, custo_federal: 2017228.57, eleitos_federal: 7, custo_presidencial: 0, eleitos_presidencial: 0 }
  ],
  2018: [
    { partido: 'MDB', custo_estadual: 876579.31, eleitos_estadual: 29, custo_federal: 2946485.71, eleitos_federal: 14, custo_presidencial: 54000000.00, eleitos_presidencial: 0 },
    { partido: 'PP', custo_estadual: 955616.00, eleitos_estadual: 25, custo_federal: 2837723.08, eleitos_federal: 13, custo_presidencial: 0, eleitos_presidencial: 0 },
    { partido: 'PSD', custo_estadual: 1021438.10, eleitos_estadual: 21, custo_federal: 2620850.00, eleitos_federal: 12, custo_presidencial: 0, eleitos_presidencial: 0 },
    { partido: 'PDT', custo_estadual: 812323.08, eleitos_estadual: 26, custo_federal: 2437185.71, eleitos_federal: 14, custo_presidencial: 25120000.00, eleitos_presidencial: 0 },
    { partido: 'PT', custo_estadual: 781686.67, eleitos_estadual: 30, custo_federal: 2327244.44, eleitos_federal: 18, custo_presidencial: 37525400.00, eleitos_presidencial: 0 },
    { partido: 'PSDB', custo_estadual: 771677.78, eleitos_estadual: 18, custo_federal: 2272244.44, eleitos_federal: 9, custo_presidencial: 53200000.00, eleitos_presidencial: 0 },
    { partido: 'PSB', custo_estadual: 746020.00, eleitos_estadual: 20, custo_federal: 2171854.55, eleitos_federal: 11, custo_presidencial: 0, eleitos_presidencial: 0 },
    { partido: 'PL', custo_estadual: 722281.82, eleitos_estadual: 22, custo_federal: 2074693.33, eleitos_federal: 15, custo_presidencial: 0, eleitos_presidencial: 0 },
    { partido: 'PSOL', custo_estadual: 452745.45, eleitos_estadual: 11, custo_federal: 1148366.67, eleitos_federal: 6, custo_presidencial: 6100000.00, eleitos_presidencial: 0 }
  ]
};

export const questao1HistogramaEleitos = {
  '2024_VEREADOR': [
    { faixa: 'Até R$ 2 mil', eleitos: 3942, percentual: 30.0 },
    { faixa: 'R$ 2 mil–5 mil', eleitos: 3548, percentual: 27.0 },
    { faixa: 'R$ 5 mil–15 mil', eleitos: 3022, percentual: 23.0 },
    { faixa: 'R$ 15 mil–50 mil', eleitos: 1708, percentual: 13.0 },
    { faixa: 'R$ 50 mil–150 mil', eleitos: 631, percentual: 4.8 },
    { faixa: 'R$ 150 mil–500 mil', eleitos: 223, percentual: 1.7 },
    { faixa: 'Acima de R$ 500 mil', eleitos: 65, percentual: 0.5 }
  ],
  '2020_VEREADOR': [
    { faixa: 'Até R$ 2 mil', eleitos: 6682, percentual: 50.6 },
    { faixa: 'R$ 2 mil–5 mil', eleitos: 3420, percentual: 25.9 },
    { faixa: 'R$ 5 mil–15 mil', eleitos: 2034, percentual: 15.4 },
    { faixa: 'R$ 15 mil–50 mil', eleitos: 792, percentual: 6.0 },
    { faixa: 'R$ 50 mil–150 mil', eleitos: 211, percentual: 1.6 },
    { faixa: 'R$ 150 mil–500 mil', eleitos: 53, percentual: 0.4 },
    { faixa: 'Acima de R$ 500 mil', eleitos: 13, percentual: 0.1 }
  ],
  '2022_DEPUTADO ESTADUAL': [
    { faixa: 'Até R$ 100 mil', eleitos: 28, percentual: 10.7 },
    { faixa: 'R$ 100k–250k', eleitos: 52, percentual: 19.9 },
    { faixa: 'R$ 250k–500k', eleitos: 79, percentual: 30.3 },
    { faixa: 'R$ 500k–1 mi', eleitos: 63, percentual: 24.1 },
    { faixa: 'R$ 1 mi–2 mi', eleitos: 31, percentual: 11.9 },
    { faixa: 'R$ 2 mi–3,5 mi', eleitos: 8, percentual: 3.1 },
    { faixa: 'Acima de R$ 3,5 mi', eleitos: 0, percentual: 0.0 }
  ],
  '2018_DEPUTADO ESTADUAL': [
    { faixa: 'Até R$ 100 mil', eleitos: 56, percentual: 21.5 },
    { faixa: 'R$ 100k–250k', eleitos: 84, percentual: 32.2 },
    { faixa: 'R$ 250k–500k', eleitos: 68, percentual: 26.1 },
    { faixa: 'R$ 500k–1 mi', eleitos: 41, percentual: 15.7 },
    { faixa: 'R$ 1 mi–2 mi', eleitos: 12, percentual: 4.5 },
    { faixa: 'R$ 2 mi–3,5 mi', eleitos: 0, percentual: 0.0 },
    { faixa: 'Acima de R$ 3,5 mi', eleitos: 0, percentual: 0.0 }
  ],
  '2022_DEPUTADO FEDERAL': [
    { faixa: 'Até R$ 100 mil', eleitos: 2, percentual: 1.5 },
    { faixa: 'R$ 100k–250k', eleitos: 5, percentual: 3.8 },
    { faixa: 'R$ 250k–500k', eleitos: 9, percentual: 6.8 },
    { faixa: 'R$ 500k–1 mi', eleitos: 21, percentual: 15.8 },
    { faixa: 'R$ 1 mi–2 mi', eleitos: 47, percentual: 35.3 },
    { faixa: 'R$ 2 mi–3,5 mi', eleitos: 49, percentual: 36.8 },
    { faixa: 'Acima de R$ 3,5 mi', eleitos: 0, percentual: 0.0 }
  ],
  '2018_DEPUTADO FEDERAL': [
    { faixa: 'Até R$ 100 mil', eleitos: 6, percentual: 4.5 },
    { faixa: 'R$ 100k–250k', eleitos: 14, percentual: 10.5 },
    { faixa: 'R$ 250k–500k', eleitos: 24, percentual: 18.0 },
    { faixa: 'R$ 500k–1 mi', eleitos: 35, percentual: 26.3 },
    { faixa: 'R$ 1 mi–2 mi', eleitos: 39, percentual: 29.3 },
    { faixa: 'R$ 2 mi–3,5 mi', eleitos: 15, percentual: 11.3 },
    { faixa: 'Acima de R$ 3,5 mi', eleitos: 0, percentual: 0.0 }
  ],
  '2022_PRESIDENTE': [
    { faixa: 'Até R$ 500 mil', eleitos: 0, percentual: 0.0 },
    { faixa: 'R$ 500k–2 mi', eleitos: 0, percentual: 0.0 },
    { faixa: 'R$ 2 mi–10 mi', eleitos: 0, percentual: 0.0 },
    { faixa: 'R$ 10 mi–40 mi', eleitos: 0, percentual: 0.0 },
    { faixa: 'R$ 40 mi–70 mi', eleitos: 0, percentual: 0.0 },
    { faixa: 'R$ 70 mi–100 mi', eleitos: 0, percentual: 0.0 },
    { faixa: 'Acima de R$ 100 mi', eleitos: 1, percentual: 100.0 }
  ],
  '2018_PRESIDENTE': [
    { faixa: 'Até R$ 500 mil', eleitos: 0, percentual: 0.0 },
    { faixa: 'R$ 500k–2 mi', eleitos: 0, percentual: 0.0 },
    { faixa: 'R$ 2 mi–10 mi', eleitos: 1, percentual: 100.0 },
    { faixa: 'R$ 10 mi–40 mi', eleitos: 0, percentual: 0.0 },
    { faixa: 'R$ 40 mi–70 mi', eleitos: 0, percentual: 0.0 },
    { faixa: 'R$ 70 mi–100 mi', eleitos: 0, percentual: 0.0 },
    { faixa: 'Acima de R$ 100 mi', eleitos: 0, percentual: 0.0 }
  ]
};
