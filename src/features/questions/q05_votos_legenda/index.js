import definition from './definition.js';
import {describeResult} from './summary.js';
export default {definition,describeResult,allowedCargos:['VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL'],map:true,existingMap:false,chamber:true,validatedYear:false,mapFields(data){return [{value:'valor',label:5===1?'Despesa conhecida por eleito':5===5?'Votos de legenda na votação da sigla':'Parcela pública nas receitas vinculadas',unit:5===1?'money':'percent'}]}};
