import SearchSelect from './SearchSelect.jsx';
import { partyOptionLabel } from './partyHistory.js';
import { partyColors } from './partyColors.js';
export default function PartySelect({ value, options, onChange, label = 'Partido na eleição' }) {
  return (
    <SearchSelect
      label={label}
      value={value}
      onChange={onChange}
      options={[
        { value: '', label: 'Todos os partidos' },
        ...options.map((sigla) => ({
          value: sigla,
          label: sigla,
          description: partyOptionLabel(sigla).split(' — ')[1],
          color: partyColors[sigla],
        })),
      ]}
    />
  );
}
