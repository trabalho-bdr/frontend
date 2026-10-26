import test from 'node:test';
import assert from 'node:assert/strict';
import {
  comparisonQuery,
  currentComparison,
  formatPercent,
  formatPoints,
  biggestChanges,
  modalityColour,
} from '../src/components/exhibition/publicityComparison.js';

const scope = { cargo: 'VEREADOR', uf: '', municipioId: '', criterio: 'sugeridas' };
const person = {
  id_candidato: 'p1',
  id_candidatura: 'c24',
  uf: 'CE',
  id_municipio: '1',
  partido: 'PB',
};

test('candidate comparison follows identity and territory rather than party/candidacy id', () => {
  const query = new URLSearchParams(
    comparisonQuery({ scope, mode: 'candidato', person, before: 2020, after: 2024 }),
  );
  assert.equal(query.get('id_candidato'), 'p1');
  assert.equal(query.get('uf'), 'CE');
  assert.equal(query.get('id_municipio'), '1');
  assert.equal(query.get('ano_antes'), '2020');
  assert.equal(query.get('ano_depois'), '2024');
  assert.equal(query.has('id_partido'), false);
  assert.equal(query.has('id_candidatura'), false);
});

test('party filters preserve the same territory and invalid candidate pairs are not requested', () => {
  const query = new URLSearchParams(
    comparisonQuery({
      scope: { ...scope, uf: 'CE', municipioId: '1' },
      mode: 'partido',
      party: 'a',
      before: 2020,
      after: 2024,
    }),
  );
  assert.equal(query.get('id_partido'), 'a');
  assert.equal(query.get('id_municipio'), '1');
  assert.equal(
    comparisonQuery({
      scope,
      mode: 'candidato',
      person: { ...person, id_municipio: null },
      before: 2020,
      after: 2024,
    }),
    null,
  );
  assert.equal(
    comparisonQuery({ scope, mode: 'candidato', person, before: 2024, after: 2024 }),
    null,
  );
});

test('small shares, true zero and missing percentages remain distinct', () => {
  assert.equal(formatPercent(0.0001), '<0,1%');
  assert.equal(formatPercent(0), '0%');
  assert.equal(formatPercent(null), '—');
  assert.equal(formatPercent(NaN), '—');
  assert.equal(formatPoints(0.0001), '+<0,1 p.p.');
});

test('stale results disappear immediately when any comparison filter changes', () => {
  const key = comparisonQuery({ scope, mode: 'candidato', person, before: 2020, after: 2024 });
  const state = { key, data: { entidade: 'old' } };
  assert.equal(currentComparison(state, key), state);
  for (const next of [key + '&criterio=explicitas', key + '&uf=RJ', key + '&id_candidato=p2', null])
    assert.equal(currentComparison(state, next), null);
});

test('largest changes use percentage point differences and colours stay constant', () => {
  const rows = [
    { grupo: 'A', delta_pp: 1 },
    { grupo: 'B', delta_pp: -20 },
    { grupo: 'C', delta_pp: null },
    { grupo: 'D', delta_pp: 10 },
  ];
  assert.deepEqual(
    biggestChanges(rows).map((r) => r.grupo),
    ['B', 'D'],
  );
  assert.equal(modalityColour('Impressos'), modalityColour('Impressos'));
  assert.equal(rows.length, 4);
});
