import {displayNumber as num,displayMoney as money} from '../../../catalog/logic.js';
export function describeResult(data){
 const rows=data.rows||[],s=data.summary;
 const valid=rows.filter(r=>r.valor!=null&&r.grupo!=='Origem incompleta');if(valid.length<2)return 'Há apenas um grupo com taxa conhecida; não há contraste suficiente neste recorte.';const lo=valid[0],hi=valid.at(-1);return `${lo.grupo}: ${num(lo.valor)}% de eleição. ${hi.grupo}: ${num(hi.valor)}%. A comparação é descritiva.`
}
