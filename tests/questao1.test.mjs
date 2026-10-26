import test from 'node:test';
import assert from 'node:assert/strict';
import { questao1Agregados, sampleCandidates } from './fixtures/legacy/questao1Snapshot.js';
import { fetchQuestao1Overview, fetchQuestao1Ranking, fetchQuestao1Dispersao } from '../src/data/questao1Client.js';

test('agregados de 2024 para Vereador possuem valores nominais e divisão exata', () => {
  const ver2024 = questao1Agregados['2024_VEREADOR'];
  assert.ok(ver2024);
  assert.equal(ver2024.eleitos, 13139);
  assert.equal(ver2024.gasto_por_cadeira, 51493.01);
  assert.equal(ver2024.total_candidaturas, 84953);

  // A divisão deve bater com despesas / eleitos
  const calculo = Number((ver2024.total_despesas / ver2024.eleitos).toFixed(2));
  assert.equal(calculo, 51493.01);
});

test('série temporal preserva anos compatíveis sem misturar cargos', () => {
  const ver = questao1Agregados['2024_VEREADOR'];
  assert.deepEqual(ver.serie_temporal.map(s => s.ano), [2020, 2024]);

  const depFed = questao1Agregados['2022_DEPUTADO FEDERAL'];
  assert.deepEqual(depFed.serie_temporal.map(s => s.ano), [2018, 2022]);
});

test('ranking indisponível não apresenta candidaturas arquivadas por custo_voto', async () => {
  const res = await fetchQuestao1Ranking({
    ano: 2024,
    cargo: 'VEREADOR',
    ordem: 'custo_voto',
    filtroResultado: 'todos',
    limit: 5
  });

  assert.equal(res.source,'unavailable');assert.deepEqual(res.rows,[]);
  // Todos os itens ordenados por custo_voto devem ter votos > 0
  for (const row of res.rows) {
    if (row.custo_voto != null) {
      assert.ok(row.votos > 0, 'Votos nominais devem ser maiores que zero para custo por voto');
      assert.ok(row.gastos > 0, 'Gastos devem ser maiores que zero');
    }
  }

  // Verifica ordem decrescente
  for (let i = 0; i < res.rows.length - 1; i++) {
    const cur = res.rows[i].custo_voto || 0;
    const prox = res.rows[i + 1].custo_voto || 0;
    assert.ok(cur >= prox, `Ordem decrescente violada: ${cur} < ${prox}`);
  }
});

test('ranking indisponível não apresenta despesas arquivadas', async () => {
  const res = await fetchQuestao1Ranking({
    ano: 2024,
    cargo: 'VEREADOR',
    ordem: 'gastos',
    filtroResultado: 'todos',
    limit: 5
  });

  assert.equal(res.source,'unavailable');assert.deepEqual(res.rows,[]);
  for (let i = 0; i < res.rows.length - 1; i++) {
    const cur = res.rows[i].gastos || 0;
    const prox = res.rows[i + 1].gastos || 0;
    assert.ok(cur >= prox, `Ordem de gastos decrescente violada: ${cur} < ${prox}`);
  }
});

test('filtro de eleitos não inclui não eleitos nem suplentes', async () => {
  const res = await fetchQuestao1Ranking({
    ano: 2024,
    cargo: 'VEREADOR',
    filtroResultado: 'eleitos',
    limit: 10
  });

  for (const row of res.rows) {
    assert.equal(row.eleito, 1);
  }
});

test('dispersão indisponível não inventa pontos ou estatística', async () => {
  const res = await fetchQuestao1Dispersao({
    ano: 2024,
    cargo: 'VEREADOR'
  });

  assert.equal(res.source,'unavailable');assert.deepEqual(res.pontos,[]);assert.deepEqual(res.correlacao,{});
});

import { readFileSync } from 'node:fs';
import { fetchQuestao1Dossie } from '../src/data/questao1Client.js';

test('dossiê sem conexão não inventa distribuições nem transforma amostras em outros cargos', async () => {
  const res = await fetchQuestao1Dossie({ ano: 2024, cargo: 'VEREADOR' });
  assert.equal(res.source,'unavailable');
  assert.deepEqual(res.por_partido,[]);
  assert.deepEqual(res.histograma_eleitos,[]);
  assert.deepEqual(res.pontos_dispersao,[]);
  const federal=await fetchQuestao1Dispersao({ano:2022,cargo:'DEPUTADO FEDERAL'});
  assert.deepEqual(federal.pontos,[]);
  const municipal=await fetchQuestao1Overview({ano:2024,cargo:'VEREADOR',municipioId:'2304400'});
  assert.equal(municipal.source,'unavailable');
});

