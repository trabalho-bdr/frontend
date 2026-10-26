import {displayNumber as num,displayMoney as money} from '../../../catalog/logic.js';
export function describeResult(data){
 const rows=data.rows||[],s=data.summary;
 return s?.pearson!=null?`Entre ${num(s.n)} municípios com os dois valores, a correlação linear é ${num(s.pearson)}. Isso descreve o território, sem revelar o voto individual.`:'Escolha um partido ou um recorte com pares completos para comparar os indicadores.';
}
