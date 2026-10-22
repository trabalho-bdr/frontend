import test from 'node:test';
import assert from 'node:assert/strict';
import { questao1Agregados, sampleCandidates } from '../src/data/questao1Snapshot.js';
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

test('ranking ordena por custo_voto com votos estritamente positivos', async () => {
  const res = await fetchQuestao1Ranking({
    ano: 2024,
    cargo: 'VEREADOR',
    ordem: 'custo_voto',
    filtroResultado: 'todos',
    limit: 5
  });

  assert.ok(res.rows.length > 0);
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

test('ranking ordena por maior despesa total', async () => {
  const res = await fetchQuestao1Ranking({
    ano: 2024,
    cargo: 'VEREADOR',
    ordem: 'gastos',
    filtroResultado: 'todos',
    limit: 5
  });

  assert.ok(res.rows.length > 0);
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

test('dispersão retorna pontos com medianas e estatística de correlação', async () => {
  const res = await fetchQuestao1Dispersao({
    ano: 2024,
    cargo: 'VEREADOR'
  });

  assert.ok(res.pontos.length > 0);
  assert.ok(res.medianas.gastos > 0);
  assert.ok(res.medianas.votos > 0);
  assert.ok(res.correlacao.r_log != null);
  assert.ok(res.correlacao.aviso_causalidade.includes('NÃO'));
});
