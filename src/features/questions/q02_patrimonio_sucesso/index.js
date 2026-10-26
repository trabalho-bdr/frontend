import definition from './definition.js';
import { describeResult } from './summary.js';
export default {
  definition,
  describeResult,
  allowedCargos: null,
  map: true,
  existingMap: false,
  chamber: true,
  validatedYear: false,
  mapFields(data) {
    return [
      { value: 'valor', label: 'Patrimônio mediano', unit: 'money' },
      { value: 'taxa_eleicao', label: 'Taxa de eleição · patrimônio conhecido', unit: 'percent' },
    ];
  },
};
