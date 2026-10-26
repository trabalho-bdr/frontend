# Commits da refatoração

Base verificada em 26/10/2026: 97 testes JavaScript e 167 testes Python.

1. Base funcional, sem credenciais/logs/temporários.
2. Inventário de APIs e contratos de preservação.
3. Infraestrutura: conexão somente leitura, configuração e carregamento SQL.
4. Dez módulos de questões com serviços, consultas e documentação próprios.
5. Normalização compartilhada e versionada.
6. Frontend por questão e composição por tema.
7. Limpeza de código sem uso, ferramentas e documentação.

## Contratos preservados
- Ausência não é zero; não divulgável é separado.
- Primeiro turno de votação e resultado final são universos distintos.
- Pessoa e candidatura têm identidades distintas.
- Sigla histórica é preservada; fusão não é renomeação.
- Município só delimita disputa municipal.
- Eleitorado histórico não validado continua bloqueado.
- Receitas financeiras mantêm limitações e cobertura de vínculo.
- Não escrever no MotherDuck; preservar os links existentes.

A migração será incremental. Endpoints antigos que ainda têm consumidores ficam como adaptadores, nunca como uma segunda metodologia oculta. Não excluir arquivos apenas por não aparecerem no menu.
