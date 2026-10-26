import definition from './definition.js';
import {describeResult} from './summary.js';
export default {definition,describeResult,allowedCargos:null,map:true,existingMap:false,chamber:true,validatedYear:false,mapFields(data){return [{value:'valor',label:1===1?'Despesa conhecida por eleito':1===5?'Votos de legenda na votação da sigla':'Parcela pública nas receitas vinculadas',unit:1===1?'money':'percent'}]}};
