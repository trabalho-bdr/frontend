import definition from './definition.js';
import {describeResult} from './summary.js';
export default {definition,describeResult,allowedCargos:null,map:false,existingMap:false,chamber:false,validatedYear:false,mapFields(data){return [{value:'valor',label:9===1?'Despesa conhecida por eleito':9===5?'Votos de legenda na votação da sigla':'Parcela pública nas receitas vinculadas',unit:9===1?'money':'percent'}]}};
