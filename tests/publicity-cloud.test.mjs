import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_PAPER,
  CLOUD_STOPS,
  colorForRatio,
  layoutCloud,
  rankCategories,
  selectCloudWords,
} from '../src/components/exhibition/publicityCloud.js';
import {
  ALL_OFFICES,
  buildCandidatosQuery,
  buildDespesasQuery,
  candidateMatchesScope,
  compatibleYearsForOffice,
  getCompatibleYear,
} from '../src/components/exhibition/publicityScope.js';

const measure = (text, size) => text.length * size * 0.58;
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const row = (categoria, valor, grupo = 'Grupo') => ({ grupo, categoria, valor });
const many = Array.from({ length: 26 }, (_, i) =>
  row(
    i % 5 === 0
      ? `Publicidade e marketing sem modalidade definida número ${i}`
      : i % 3 === 0
        ? 'Impulsionamento'
        : `Categoria ${i}`,
    1000000 / (i + 1) ** 1.6,
  ),
);

test('a nuvem ordena por valor e exclui apenas valores que a escala não comporta', () => {
  const input = [
    row('B', 10),
    row('A', 10),
    row('Saldo', -5),
    row('Zero', 0),
    row('Nulo', null),
    row('C', 99),
  ];
  const copy = structuredClone(input);
  assert.deepEqual(
    rankCategories(input).map((r) => r.categoria),
    ['C', 'A', 'B'],
  );
  assert.deepEqual(input, copy, 'a lista original, usada nas somas, não é alterada');
  const picked = selectCloudWords(input, 2);
  assert.equal(picked.shown.length, 2);
  assert.equal(picked.eligible, 3);
  assert.equal(picked.hidden, 1);
  assert.equal(picked.excluded, 3);
  assert.equal(picked.total, 6);
});

test('tamanho e intensidade crescem com o valor e valores iguais têm o mesmo tratamento', () => {
  const rows = [
    row('Gigante', 9000000),
    row('Médio', 900000),
    row('Par X', 90000),
    row('Par Y', 90000),
    row('Pequeno', 900),
  ];
  const { items } = layoutCloud(rankCategories(rows), { width: 900, measure });
  const by = Object.fromEntries(items.map((i) => [i.row.categoria, i]));
  const order = ['Gigante', 'Médio', 'Par X', 'Pequeno'];
  for (let i = 1; i < order.length; i++) {
    assert.ok(
      by[order[i - 1]].font > by[order[i]].font,
      `${order[i - 1]} > ${order[i]} em tamanho`,
    );
    assert.ok(
      by[order[i - 1]].t > by[order[i]].t,
      `${order[i - 1]} > ${order[i]} em proporção térmica (t)`,
    );
    assert.equal(
      by[order[i - 1]].color,
      colorForRatio(by[order[i - 1]].t),
      'a cor segue fielmente a rampa do mapa de calor',
    );
  }
  assert.equal(by['Par X'].font, by['Par Y'].font);
  assert.equal(by['Par X'].t, by['Par Y'].t);
  assert.equal(by['Par X'].color, by['Par Y'].color);
  assert.ok(by.Gigante.font >= 2 * by.Pequeno.font, 'a hierarquia é evidente');
});

test('valores todos iguais não inventam hierarquia', () => {
  const { items } = layoutCloud(rankCategories([row('A', 5), row('B', 5), row('C', 5)]), {
    width: 600,
    measure,
  });
  assert.equal(new Set(items.map((i) => i.font)).size, 1);
  assert.equal(new Set(items.map((i) => i.color)).size, 1);
});

test('as cores da escala são legíveis sobre o papel da nuvem', () => {
  for (const stop of CLOUD_STOPS) assert.ok(contrast(stop, CLOUD_PAPER) >= 4.5, stop);
  for (let t = 0; t <= 1; t += 0.1) assert.ok(contrast(colorForRatio(t), CLOUD_PAPER) >= 4.5);
});

for (const width of [320, 360, 768, 1100]) {
  test(`o layout em ${width}px não sobrepõe, não corta e é determinístico`, () => {
    const rows = rankCategories(many);
    const first = layoutCloud(rows, { width, measure });
    const again = layoutCloud(rows, { width, measure });
    assert.deepEqual(first, again);
    assert.equal(first.items.length, rows.length);
    for (const item of first.items) {
      assert.ok(
        item.cx - item.hw / 2 >= 0 && item.cx + item.hw / 2 <= width,
        `${item.row.categoria} cabe na largura`,
      );
      assert.ok(
        item.cy - item.hh / 2 >= 0 && item.cy + item.hh / 2 <= first.height,
        'cabe na altura',
      );
      for (const line of item.lines)
        assert.ok(measure(line, item.font) <= item.hw, 'a linha cabe na caixa');
      assert.ok(item.font >= 12);
    }
    for (let i = 0; i < first.items.length; i++)
      for (let j = i + 1; j < first.items.length; j++) {
        const a = first.items[i];
        const b = first.items[j];
        const apart =
          Math.abs(a.cx - b.cx) >= (a.hw + b.hw) / 2 || Math.abs(a.cy - b.cy) >= (a.hh + b.hh) / 2;
        assert.ok(apart, `${a.row.categoria} e ${b.row.categoria} não se sobrepõem`);
      }
  });
}

test('a consulta principal envia id_candidatura e id_municipio quando fornecidos', () => {
  const scope = {
    ano: 2024,
    cargo: 'VEREADOR',
    uf: 'RN',
    municipioId: '2408102',
    criterio: 'sugeridas',
  };
  const withCandidate = buildDespesasQuery(scope, { id_candidatura: 'abc123' });
  assert.equal(withCandidate.get('id_candidatura'), 'abc123');
  assert.equal(withCandidate.get('uf'), 'RN');
  assert.equal(withCandidate.get('id_municipio'), '2408102');
  assert.equal(withCandidate.get('ano'), '2024');
  assert.equal(buildDespesasQuery(scope, null).has('id_candidatura'), false);
  assert.equal(buildDespesasQuery({ ...scope, uf: '', municipioId: '' }, null).has('uf'), false);
  assert.equal(
    buildDespesasQuery({ ...scope, uf: '', municipioId: '' }, null).has('id_municipio'),
    false,
  );
});

test('a pesquisa respeita ano, cargo, UF e município do recorte', () => {
  const q = buildCandidatosQuery(
    { ano: 2022, cargo: 'DEPUTADO FEDERAL', uf: 'CE', municipioId: '2304400' },
    '  maria ',
  );
  assert.deepEqual(Object.fromEntries(q), {
    ano: '2022',
    cargo: 'DEPUTADO FEDERAL',
    busca: 'maria',
    uf: 'CE',
    id_municipio: '2304400',
  });
});

test('uma candidatura escolhida é descartada quando o recorte deixa de contê-la', () => {
  const candidate = {
    id_candidatura: '1',
    ano: 2024,
    cargo: 'VEREADOR',
    uf: 'RN',
    id_municipio: '2408102',
  };
  const scope = { ano: 2024, cargo: 'VEREADOR', uf: 'RN', municipioId: '2408102' };
  assert.equal(candidateMatchesScope(candidate, scope), true);
  assert.equal(
    candidateMatchesScope(candidate, { ...scope, uf: '' }),
    true,
    'seis UFs contém qualquer UF',
  );
  assert.equal(
    candidateMatchesScope(candidate, { ...scope, municipioId: '' }),
    true,
    'sem município selecionado aceita qualquer município',
  );
  assert.equal(
    candidateMatchesScope(candidate, { ...scope, municipioId: '2408003' }),
    false,
    'município diferente rejeita a candidatura',
  );
  assert.equal(candidateMatchesScope(candidate, { ...scope, uf: 'CE' }), false);
  assert.equal(candidateMatchesScope(candidate, { ...scope, ano: 2020 }), false);
  assert.equal(candidateMatchesScope(candidate, { ...scope, cargo: 'PREFEITO' }), false);
  assert.equal(
    candidateMatchesScope(
      { ...candidate, cargo: 'DEPUTADO ESTADUAL' },
      { ...scope, ano: 2024, cargo: 'Deputado Estadual' },
    ),
    true,
  );
  assert.equal(candidateMatchesScope(null, scope), false);
});

test('compatibilidade de cargos e anos ajusta eleições municipais e gerais', () => {
  assert.ok(ALL_OFFICES.length >= 8);
  assert.equal(getCompatibleYear('VEREADOR', 2022), 2024);
  assert.equal(getCompatibleYear('PREFEITO', 2018), 2024);
  assert.equal(getCompatibleYear('PREFEITO', 2020), 2020);
  assert.equal(getCompatibleYear('DEPUTADO FEDERAL', 2024), 2022);
  assert.equal(getCompatibleYear('GOVERNADOR', 2020), 2022);
  assert.equal(getCompatibleYear('SENADOR', 2018), 2018);
  assert.deepEqual(compatibleYearsForOffice('VEREADOR'), [2024, 2020]);
  assert.deepEqual(compatibleYearsForOffice('DEPUTADO ESTADUAL'), [2022, 2018]);
});
