import definition from './definition.js';
import {describeResult} from './summary.js';
export default {definition,describeResult,allowedCargos:['VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL'],map:true,existingMap:true,chamber:false,validatedYear:false,mapFields(data){return [{value:'valor',label:'Mudança na distribuição dos votos',unit:'pp'}]}};
