import {displayNumber as num,displayMoney as money} from '../../../catalog/logic.js';
export function describeResult(data){
 const rows=data.rows||[],s=data.summary;
 const upper=rows.find(r=>r.grupo==='Superior completo');return upper?.valor!=null&&upper?.referencia!=null?`Superior completo aparece em ${num(upper.valor)}% das candidaturas e ${num(upper.referencia)}% do eleitorado de referência com escolaridade conhecida. A comparação municipal reúne ${num(s?.n)} pares completos.`:'Não há escolaridade conhecida suficiente nos dois universos para calcular a comparação.'
}
