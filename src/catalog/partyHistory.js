import parties from '../../shared/parties.json' with {type: 'json'};
export const partyNameGroups=parties.nameGroups;
const notes=parties.notes;
export const partyHistorySource=parties.source;
export function partyHistory(sigla,year){if(sigla==='PL'&&Number(year)<2006)return 'Este PL histórico fundiu-se com PRONA em 2006, formando PR. Não é uma simples mudança de nome.';const g=partyNameGroups.find(g=>g.includes(sigla));return [g?'Mudança de nome: '+g.join(' → ')+'.':'',notes[sigla]||''].filter(Boolean).join(' ')}
export function partyOptionLabel(sigla){const g=partyNameGroups.find(g=>g.includes(sigla));return g?sigla+' — '+(sigla===g[0]?'depois '+g[1]:'antes '+g[0]):sigla}
