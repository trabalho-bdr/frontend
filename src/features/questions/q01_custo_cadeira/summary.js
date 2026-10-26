import {displayNumber as num,displayMoney as money} from '../../../catalog/logic.js';
export function describeResult(data){
 const rows=data.rows||[],s=data.summary;
 return s?.valor!=null?`As despesas conhecidas de todas as candidaturas equivalem a ${money(s.valor)} por eleito registrado em ${s.ano}.`:'Não há despesas conhecidas e eleitos suficientes para calcular a razão neste ano.';
}
