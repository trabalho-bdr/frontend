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
    return [
      { value: 'x', label: data?.x_label || 'Eleitorado jovem', unit: 'percent' },
      {
        value: 'y',
        label: data?.y_label || 'Participação partidária / abstenção',
        unit: 'percent',
      },
    ];
  },
};
