import { partyStyle } from './partyColors.js';
import { partyHistory, partyHistorySource } from './partyHistory.js';
export default function PartyHistory({ sigla, year }) {
  const note = partyHistory(sigla, year);
  return note ? (
    <p className="catalog-method party-history-note" style={partyStyle(sigla)}>
      <strong>Histórico da legenda: </strong>
      {note}{' '}
      <a href={partyHistorySource} target="_blank" rel="noreferrer">
        Fonte: TSE ↗
      </a>
    </p>
  ) : null;
}
