import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {sampleExpenses} from './fixtures/legacy/despesas-amostra.js';
const file=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('candidatura da captura possui lançamentos reais na amostra',()=>{
 const bella=sampleExpenses['9b5b61d4d865c3e35a852bc6543dfb48'];
 assert.ok(bella?.length>0); assert.ok(bella.every(x=>x.valor>0&&x.categoria&&x.id));
});
test('o perfil integra o álbum de trajetórias e mantém os dados de registro legíveis',()=>{
 const src=file('src/pages/PersonProfile.jsx');
 assert.ok(src.includes('TrajectoryAlbum'));
 assert.ok(src.includes('sourceValue'));
});
test('novo documento fiscal é uma representação, sem inventar NF original',()=>{
 const src=file('src/pages/PrestacaoDeContas.jsx');
 for(const key of ['fiscal-document-v9','NÃO É NOTA FISCAL ORIGINAL','Fornecedor, emissão e número da nota fiscal não constam desta consulta','receipt-empty-document','O valor declarado não comprova que o pagamento foi realizado.'])assert.ok(src.includes(key),key);
 assert.ok(!src.includes('FORNECEDOR / EMITENTE'));
 assert.ok(!src.includes('NÚMERO DA NOTA ORIGINAL'));
 assert.ok(!src.includes('envelope-open'));
});
test('a paginação das folhas fiscais busca mais do que os 35 primeiros registros',()=>{
 const src=file('src/pages/PrestacaoDeContas.jsx');
 const api=file('server/app.py');
 assert.ok(src.includes('expenseOffset')); assert.ok(/limit:\s*40/.test(src));
 assert.ok(api.includes('total_filtered'));assert.ok(file('server/compatibility/sql/app/app_candidate_expenses_05.sql').includes('OFFSET ?'));
});
test('adesivaria separa síntese, nuvem normalizada e investigação de candidaturas',()=>{
 const jsx=file('src/pages/Adesivaria.jsx');
 assert.ok(jsx.includes('<MaterialOverview'));assert.ok(!jsx.includes('<MaterialCloud'));
 const publicity=file('src/components/exhibition/PublicityInvestigation.jsx');
 assert.ok(publicity.includes('<PublicityCloud'));assert.ok(file('src/components/exhibition/PublicityCloud.jsx').includes('q9-word'));
 assert.ok(jsx.includes('gastos_classificados'));assert.ok(jsx.includes('Maiores gastos'));assert.ok(jsx.includes('Mais votos'));
 assert.ok(!jsx.includes('<PodiumStickers'));assert.ok(jsx.includes('CandidatePanel'));
 assert.ok(jsx.includes('topic="adesivos"'));assert.ok(jsx.includes('O município é o local da candidatura'));
});
test('o plenário mantém mesa, tribuna e import do texto no Three.js',()=>{
 const src=file('src/components/Plenario3D.jsx');
 assert.ok(src.includes('MESA DIRETORA'));assert.ok(src.includes('TRIBUNA'));assert.ok(src.includes('seat.color'));
 assert.match(src,/import\s*\{[^}]*Text[^}]*\}\s*from\s*["']@react-three\/drei["']/);
});
