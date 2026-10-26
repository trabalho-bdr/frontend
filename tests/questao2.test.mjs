import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { patrimonioSnapshot } from '../src/data/patrimonioSnapshot.js';
import { getQ2Opcoes, getQ2Municipios, getQ2Patrimonio } from '../src/data/client.js';

test('patrimonioSnapshot cobre as 6 UFs auditadas com resumo e decis', () => {
  const ufsEsperadas = ['CE', 'MA', 'MS', 'RJ', 'RN', 'RS'];
  for (const uf of ufsEsperadas) {
    const resumo = patrimonioSnapshot.resumos_uf[uf];
    assert.ok(resumo, `Resumo ausente para ${uf}`);
    assert.equal(resumo.uf, uf);
    assert.equal(resumo.cargo, 'VEREADOR');
    assert.equal(resumo.ano, 2024);
    assert.ok(resumo.decis.length === 10, `${uf} deve conter exatamente 10 decis`);

    // A taxa de sucesso no decil 10 deve ser superior à do decil 1
    const d1 = resumo.decis.find(d => d.decil === 1);
    const d10 = resumo.decis.find(d => d.decil === 10);
    assert.ok(d10.taxa_sucesso_pct > d1.taxa_sucesso_pct,
      `Taxa do Decil 10 (${d10.taxa_sucesso_pct}%) deve ser maior que Decil 1 (${d1.taxa_sucesso_pct}%) em ${uf}`);
  }
});

test('eleitos declaram patrimônio mediano maior do que não eleitos no snapshot', () => {
  const resumoBR = patrimonioSnapshot.resumo_br;
  assert.ok(resumoBR);
  const eleitos = resumoBR.resumo_situacao.find(s => s.situacao === 'eleito');
  const naoEleitos = resumoBR.resumo_situacao.find(s => s.situacao === 'nao_eleito');
  assert.ok(eleitos && naoEleitos);
  assert.ok(eleitos.patrimonio_mediano > naoEleitos.patrimonio_mediano,
    `Eleitos (${eleitos.patrimonio_mediano}) devem ter mediana superior a não eleitos (${naoEleitos.patrimonio_mediano})`);
});

test('patrimônio indisponível retorna ausência explícita sem referência local', async () => {
 const options=await getQ2Opcoes();assert.deepEqual(options.opcoes,[]);assert.equal(options.source,'unavailable');
 const result=await getQ2Municipios({ano:2024,cargo:'VEREADOR',uf:'CE'});assert.equal(result.source,'unavailable');assert.deepEqual(result.municipios,[]);
});

test('Investigações integra PatrimonioMapaDossie no id=2 e restaura id=3', () => {
  const appSrc = fs.readFileSync('src/App.jsx', 'utf8');
  assert.ok(appSrc.includes('PatrimonioMapaDossie'), 'App.jsx deve importar PatrimonioMapaDossie');
  assert.ok(appSrc.includes('id===2&&!viewRecords?<PatrimonioMapaDossie'), 'Dossiê 02 deve renderizar PatrimonioMapaDossie');
  assert.ok(!appSrc.includes('TerritorioMapaDossie'), 'TerritorioMapaDossie não deve existir em App.jsx');
  assert.ok(appSrc.includes('id!==4&&id!==1&&id!==2'), 'Live query deve pular id 2 (custom dossier) e executar id 3 normalmente');
});
