import {displayNumber as num,displayMoney as money} from '../../../catalog/logic.js';
export function describeResult(data){
 const rows=data.rows||[],s=data.summary;
 const complete=rows.filter(r=>r.valor!=null),first=complete[0],last=complete.at(-1);return first&&last?(first.ano===last.ano?`Em ${last.ano}, os votos de legenda representam ${num(last.valor)}% da votação deste recorte.`:`A parcela dos votos de legenda passou de ${num(first.valor)}% em ${first.ano} para ${num(last.valor)}% em ${last.ano}: variação de ${num(last.valor-first.valor)} pontos percentuais.`):'Não há contagens completas suficientes para calcular a participação dos votos de legenda.'
}
