import definition from './definition.js';
import { describeResult } from './summary.js';
export default {
  definition,
  describeResult,
  allowedCargos: ['VEREADOR', 'PREFEITO'],
  map: true,
  existingMap: true,
  chamber: true,
  validatedYear: true,
  mapFields(data) {
    return [
      {
        value: 'diferenca_pp',
        label: 'Diferença de superior completo · candidatos − eleitores',
        unit: 'pp',
      },
      { value: 'x', label: 'Eleitorado 18+ com superior completo', unit: 'percent' },
      { value: 'y', label: 'Candidaturas com superior completo', unit: 'percent' },
    ];
  },
};
