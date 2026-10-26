import SearchSelect from './SearchSelect.jsx';
import { useState } from 'react';
const age = [
  ['18 a 29 anos', '18', '29'],
  ['30 a 44 anos', '30', '44'],
  ['45 a 59 anos', '45', '59'],
  ['60 anos ou mais', '60', ''],
];
const money = [
  ['Zero declarado', '0', '0'],
  ['Até R$ 10 mil', '0.01', '10000'],
  ['Mais de R$ 10 mil até R$ 50 mil', '10000.01', '50000'],
  ['Mais de R$ 50 mil até R$ 100 mil', '50000.01', '100000'],
  ['Mais de R$ 100 mil até R$ 500 mil', '100000.01', '500000'],
  ['Mais de R$ 500 mil', '500000.01', ''],
];
export default function RangeFilter({ prefix, label, values, onChange }) {
  const [custom, setCustom] = useState(false),
    lo = values[prefix + '_min'],
    hi = values[prefix + '_max'];
  const presets = prefix === 'idade' ? age : money,
    index = presets.findIndex((row) => row[1] === lo && row[2] === hi);
  const selected = custom ? 'custom' : !lo && !hi ? '' : index >= 0 ? String(index) : 'custom';
  const change = (next) => {
    setCustom(next === 'custom');
    if (next === 'custom') return;
    const row = next === '' ? ['', '', ''] : presets[Number(next)];
    onChange({ [prefix + '_min']: row[1], [prefix + '_max']: row[2] });
  };
  return (
    <fieldset className="catalog-range">
      <legend>{label}</legend>
      <SearchSelect
        label={'Faixa de ' + label.toLowerCase()}
        value={selected}
        onChange={change}
        options={[
          { value: '', label: 'Qualquer valor' },
          ...presets.map((row, i) => ({ value: String(i), label: row[0] })),
          { value: 'custom', label: 'Personalizar intervalo' },
        ]}
      />
      {selected === 'custom' && (
        <div className="catalog-range-pair">
          {[
            ['min', 'De'],
            ['max', 'Até'],
          ].map(([suffix, title]) => (
            <label key={suffix}>
              {title}
              {prefix !== 'idade' ? ' (R$)' : ''}
              <input
                type="number"
                inputMode={prefix === 'idade' ? 'numeric' : 'decimal'}
                min="0"
                max={prefix === 'idade' ? '120' : undefined}
                step={prefix === 'idade' ? '1' : '0.01'}
                placeholder="Sem limite"
                value={values[prefix + '_' + suffix]}
                onChange={(e) => onChange({ [prefix + '_' + suffix]: e.target.value })}
              />
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
