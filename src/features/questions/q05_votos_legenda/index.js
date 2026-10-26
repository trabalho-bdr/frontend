import definition from './definition.js';
import { describeResult } from './summary.js';
export default {
  definition,
  describeResult,
  allowedCargos: ['VEREADOR', 'DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL'],
  map: true,
  existingMap: false,
  chamber: true,
  validatedYear: false,
  mapFields() {
    return [{ value: 'valor', label: 'Votos de legenda na votação da sigla', unit: 'percent' }];
  },
};
