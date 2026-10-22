import test from 'node:test';
import assert from 'node:assert/strict';
import { juventudeSnapshot } from '../src/data/juventudeSnapshot.js';

test('Overview: faixas etárias e distinção entre participação e taxa de eleição', () => {
  const ov = juventudeSnapshot.overview['2024_VEREADOR'];
  assert.ok(ov, 'Overview de 2024 Vereador deve existir no snapshot');
  assert.equal(ov.totais.total_candidaturas, 84953, 'Total de candidaturas de 2024 para Vereador deve ser 84.953');
  assert.equal(ov.totais.validas, 84943, 'Total de candidaturas com idade válida deve ser 84.943');
  assert.equal(ov.totais.sem_idade, 10, 'Registros sem idade válida devem ser 10');
  assert.equal(ov.totais.total_eleitos, 13139, 'Total de eleitos deve ser 13.139');

  const faixas = Object.fromEntries(ov.faixas.map((f) => [f.faixa, f]));
  const jovem = faixas['18 a 29 anos'];
  assert.ok(jovem, 'Faixa 18 a 29 anos deve existir');
  assert.equal(jovem.candidaturas, 5796);
  assert.equal(jovem.eleitos, 851);
  assert.equal(jovem.definidos, 5563);

  // Participação entre candidaturas: 5796 / 84943 * 100 = 6.82%
  assert.equal(jovem.pct_candidaturas, 6.82);
  // Participação entre eleitos: 851 / 13139 * 100 = 6.48%
  assert.equal(jovem.pct_eleitos, 6.48);
  // Taxa de eleição: 851 / 5563 * 100 = 15.30%
  assert.equal(jovem.taxa_eleicao, 15.30);

  // Rigor metodológico: participação entre eleitos != taxa de eleição
  assert.notEqual(
    jovem.pct_eleitos,
    jovem.taxa_eleicao,
    'Participação entre eleitos (6,48%) NÃO é equivalente à taxa de eleição (15,30%)'
  );
});

test('Partidos: proporções somam 100% e taxas mantêm denominadores explícitos', () => {
  const ptData = juventudeSnapshot.partidos['2024_VEREADOR'];
  assert.ok(ptData && ptData.partidos?.length > 0, 'Partidos de 2024 Vereador devem estar presentes');

  for (const p of ptData.partidos.slice(0, 10)) {
    const somaPct = (p.pct_jovens || 0) + (p.pct_adultos || 0) + (p.pct_maduros || 0) + (p.pct_idosos || 0);
    assert.ok(
      Math.abs(somaPct - 100) < 0.2,
      `Soma das frações etárias do partido ${p.sigla} deve ser aproximadamente 100% (obtido: ${somaPct})`
    );

    if (p.jovens_definidos > 0) {
      const taxaCalculada = Number(((p.jovens_eleitos / p.jovens_definidos) * 100).toFixed(2));
      assert.equal(
        p.taxa_eleicao_jovens,
        taxaCalculada,
        `Taxa de eleição jovem de ${p.sigla} deve corresponder a jovens_eleitos / jovens_definidos`
      );
    }
  }
});

test('Municípios: média ponderada estadual calculada a partir dos totais', () => {
  const munData = juventudeSnapshot.municipios['2024'];
  assert.ok(munData && munData.municipios?.length > 0, 'Dados municipais de 2024 devem existir');

  const totJovens = munData.municipios.reduce((acc, m) => acc + (m.jovens || 0), 0);
  const totValidas = munData.municipios.reduce((acc, m) => acc + (m.validas || 0), 0);
  const mediaCalculada = Number(((totJovens / totValidas) * 100).toFixed(2));

  assert.equal(
    munData.media_ponderada_pct_jovens,
    mediaCalculada,
    'Média do conjunto deve ser ponderada pelos totais, não média simples de percentuais'
  );

  // Amostra reduzida não deve ser descartada nem zerada artificialmente
  const pequenos = munData.municipios.filter((m) => m.total_candidaturas < 25);
  assert.ok(pequenos.length > 0, 'Existem municípios com amostra reduzida');
  assert.ok(
    pequenos.every((m) => m.pct_jovens != null && m.pct_jovens >= 0),
    'Municípios pequenos devem preservar seus percentuais calculados com sinalização'
  );
});

test('Evolução temporal: variações em pontos percentuais sem misturar eleições gerais e municipais', () => {
  const evVereador = juventudeSnapshot.evolucao['VEREADOR'];
  assert.deepEqual(evVereador.anos_comparados, [2020, 2024], 'Vereador compara apenas 2020 e 2024');

  const diffCand = evVereador.variacao_pontos_percentuais.pct_candidaturas_jovens;
  assert.equal(diffCand, -2.14, 'Variação de candidaturas jovens 2020->2024 deve ser -2,14 p.p.');

  const diffTaxa = evVereador.variacao_pontos_percentuais.taxa_eleicao_jovens;
  assert.equal(diffTaxa, 4.77, 'Variação da taxa de eleição jovem 2020->2024 deve ser +4,77 p.p.');

  const evDepEstadual = juventudeSnapshot.evolucao['DEPUTADO ESTADUAL'];
  assert.deepEqual(evDepEstadual.anos_comparados, [2018, 2022], 'Deputado Estadual compara apenas 2018 e 2022');
});

test('Metodologia do Eleitorado: status pendente documentado com rigor', () => {
  const met = juventudeSnapshot.metodologiaEleitoradoPendente;
  assert.equal(met.status, 'pendente_dados_complementares');
  assert.ok(met.avisoMetodologico.includes('NÃO representa'));
  assert.ok(met.camposNecessarios.length >= 3);
});
