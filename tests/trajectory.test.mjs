import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  electionOutcome,
  electoralHistory,
  officeChanges,
} from '../src/features/questions/q10_trajetorias/trajectory.js';
import { catalogQuery } from '../src/catalog/logic.js';

test('símbolos distinguem eleição, suplência, derrota e resultado desconhecido', () => {
  for (const resultado of ['ELEITO', 'ELEITO POR QP', 'ELEITO POR MÉDIA']) {
    assert.equal(electionOutcome({ resultado }), 'elected');
  }
  for (const resultado of ['NÃO ELEITO', 'NAO_ELEITO', 'SUPLENTE']) {
    assert.equal(electionOutcome({ resultado }), 'not-elected');
  }
  for (const resultado of [null, '', 'INDEFINIDO', 'SEM INFORMAÇÃO', '2º TURNO']) {
    assert.equal(electionOutcome({ resultado }), 'unknown');
  }
  assert.equal(electionOutcome({ situacao: 'ELEITO', resultado: null }), 'elected');
  assert.equal(electionOutcome({ situacao: 'INDEFINIDO', resultado: 'ELEITO' }), 'unknown');
});

test('histórico mantém anos observados e identifica mudanças sem confundir partido com cargo', () => {
  const input = [
    { id: 'c', ano: 2024, cargo: 'PREFEITO', partido: 'B', situacao: 'ELEITO' },
    { id: 'a', ano: '2016', cargo: 'VEREADOR', partido: 'A', situacao: 'SUPLENTE' },
    { id: 'b', ano: 2020, cargo: 'VEREADOR', partido: 'B', situacao: 'ELEITO' },
    { id: 'd', ano: null, cargo: 'PREFEITO' },
  ];
  const history = electoralHistory(input);
  assert.deepEqual(
    history.map((row) => row.ano),
    [2016, 2020, 2024],
  );
  assert.deepEqual(officeChanges(history), [
    { from: 'VEREADOR', to: 'PREFEITO', fromYear: 2020, year: 2024 },
  ]);
  assert.equal(input[0].id, 'c');
  assert.deepEqual(electoralHistory([]), []);
});

test('cargo ausente não cria mudança e duas candidaturas no mesmo ano são preservadas', () => {
  const history = electoralHistory([
    { id: 'b', ano: 2020, cargo: 'PREFEITO' },
    { id: 'a', ano: 2020, cargo: null },
    { id: 'c', ano: 2024, cargo: 'PREFEITO' },
  ]);
  assert.equal(history.length, 3);
  assert.deepEqual(officeChanges(history), []);
});

test('busca longitudinal omite ano vazio e preserva nome acentuado e recorte', () => {
  const params = new URLSearchParams(
    catalogQuery({
      q: 'João Silva',
      ano: '',
      cargo: 'PREFEITO',
      uf: 'MA',
      municipio: '',
      limit: 8,
      offset: 0,
    }),
  );
  assert.equal(params.has('ano'), false);
  assert.equal(params.get('q'), 'João Silva');
  assert.equal(params.get('cargo'), 'PREFEITO');
  assert.equal(params.get('uf'), 'MA');
});
