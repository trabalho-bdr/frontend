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
  mapFields() {
    return [{ value: 'valor', label: 'Despesa conhecida por eleito', unit: 'money' }];
  },
};
