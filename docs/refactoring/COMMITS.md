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

## Execução concluída

Commits locais na branch `codex/refatoracao-modular-questoes`:

- `026596e` — chore: registrar base funcional do portal eleitoral
- `82f267c` — docs: definir commits e contratos da refatoracao modular
- `b3689f6` — refactor(api): extrair infraestrutura e dependencias de consultas
- `cc5be21` — refactor(questions): separar dez questoes e versionar consultas SQL
- `3053cf5` — refactor(data): compartilhar normalizacao e historico partidario
- `67234dc` — refactor(ui): organizar interpretacoes e graficos por questao
- `e11f10e` — refactor: remover telas obsoletas e isolar fixtures historicas
- `49e84bf` — refactor(q09): reunir classificacao e preservar gerador compativel
- `1361c5d` — refactor(ui): separar carregamento e interpretacoes compartilhadas
- `1fc52d6` — style: padronizar codigo e adicionar verificacoes reproduziveis

O commit seguinte registra a documentação e as auditorias de leitura. Não houve push. Validação: 99 testes JavaScript, 172 testes Python, Prettier/Ruff e build de produção aprovados.
