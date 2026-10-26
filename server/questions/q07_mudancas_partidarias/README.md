# Q07 — Mudanças partidárias

## Responsabilidade e granularidade

Par de eleições consecutivas equivalentes por município; distribuição dos votos por organização.

## Método preservado

Compara liderança e distribuição, usando renomeações e eventos organizacionais versionados. Empates e cobertura são explicitados.

## Ausências, normalização e limites

Não infere ideologia. PL histórico e PSD histórico têm identidade própria. Fusão/incorporação não é migração individual.

## Manutenção

- Serviço: `service.py`; consultas: `sql/`. Consultas comuns ficam em `../shared/sql/`, com referência local para evitar cópias.
- Entrada validada no adaptador HTTP; execução injetada por `ResearchContext`. Valores do usuário usam parâmetros preparados.
- Frontend correspondente: `src/features/questions/q07_mudancas_partidarias/`.
- Regressão: `tests/test_pesquisa.py`, `tests/test_exploration.py` e testes específicos da API. Q09 também usa os testes de classificação e evolução monetária.
- Retornar método, cobertura e limitações junto aos valores. Não alterar denominadores durante uma mudança visual.
