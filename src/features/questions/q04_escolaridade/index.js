import definition from './definition.js';
import { describeResult } from './summary.js';
export const ALL_OFFICES = [
  'VEREADOR',
  'PREFEITO',
  'DEPUTADO FEDERAL',
  'DEPUTADO ESTADUAL',
  'SENADOR',
  'GOVERNADOR',
  'VICE-PREFEITO',
  'VICE-GOVERNADOR',
];

export default {
  definition,
  describeResult,
  allowedCargos: ALL_OFFICES,
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
