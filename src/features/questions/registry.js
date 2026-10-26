import q1 from './q01_custo_cadeira/index.js';
import q2 from './q02_patrimonio_sucesso/index.js';
import q3 from './q03_territorio_voto_abstencao/index.js';
import q4 from './q04_escolaridade/index.js';
import q5 from './q05_votos_legenda/index.js';
import q6 from './q06_eleitorado_jovem/index.js';
import q7 from './q07_mudancas_partidarias/index.js';
import q8 from './q08_financiamento/index.js';
import q9 from './q09_publicidade/index.js';
import q10 from './q10_trajetorias/index.js';

export const questionModules = Object.freeze({
  1: q1,
  2: q2,
  3: q3,
  4: q4,
  5: q5,
  6: q6,
  7: q7,
  8: q8,
  9: q9,
  10: q10,
});
export const getQuestion = (number) => questionModules[Number(number)];
export const researchQuestions = Object.values(questionModules).map((module) => module.definition);

export function describe(data, number) {
  if (!data) return '';
  if (data.status === 'em_validacao')
    return 'Os dados históricos deste recorte precisam de validação. Escolha 2024 para consultar a comparação liberada.';
  if (data.status === 'fonte_pendente')
    return 'Ainda não há receitas importadas e vinculadas para este recorte.';
  if (!data.rows?.length) return 'Este recorte não tem registros suficientes para uma conclusão.';
  return getQuestion(number)?.describeResult(data) || '';
}
