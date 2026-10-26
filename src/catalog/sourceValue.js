import normalization from '../../shared/normalization.json' with {type: 'json'};

export function sourceValue(value) {
  const text = value == null ? '' : String(value).trim();
  const key = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalization.missingCodes.includes(key)) return normalization.missingLabel;
  if (normalization.restrictedCodes.includes(key)) return normalization.restrictedLabel;
  return text;
}
