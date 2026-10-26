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
  chamber: false,
  validatedYear: false,
  mapFields(data) {
    return [{ value: 'y', label: data?.y_label || 'Resultado municipal', unit: 'percent' }];
  },
};
