import definition from './definition.js';
import { describeResult } from './summary.js';
export default {
  definition,
  describeResult,
  allowedCargos: ['VEREADOR', 'PREFEITO'],
  map: true,
  existingMap: true,
  chamber: false,
  validatedYear: true,
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
