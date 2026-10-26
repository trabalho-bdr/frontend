export const archiveStates = [
  { uf: 'CE', name: 'Ceará', region: 'Nordeste', ink: '#247b51' },
  { uf: 'MA', name: 'Maranhão', region: 'Nordeste', ink: '#ab3a34' },
  { uf: 'MS', name: 'Mato Grosso do Sul', region: 'Centro-Oeste', ink: '#236b9c' },
  { uf: 'RJ', name: 'Rio de Janeiro', region: 'Sudeste', ink: '#3874a1' },
  { uf: 'RN', name: 'Rio Grande do Norte', region: 'Nordeste', ink: '#448351' },
  { uf: 'RS', name: 'Rio Grande do Sul', region: 'Sul', ink: '#9e4136' },
];
export const stateInfo = (uf) => archiveStates.find((state) => state.uf === uf);
