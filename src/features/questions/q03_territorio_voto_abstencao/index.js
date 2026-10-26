import definition from './definition.js';
import {describeResult} from './summary.js';
export default {definition,describeResult,allowedCargos:['VEREADOR','PREFEITO'],map:true,existingMap:true,chamber:false,validatedYear:false,mapFields(data){return [{value:'y',label:data?.y_label||'Resultado municipal',unit:'percent'}]}};
