# Q01 — Custo financeiro por cadeira

## Responsabilidade e granularidade

Candidatura consolidada no último turno observado por pessoa, cargo e território; agregação por eleição.

## Método preservado

Despesa conhecida de todas as candidaturas dividida pelo número de eleitos registrados. Mediana individual e gasto apenas dos eleitos são medidas separadas. IPCA usa dezembro a dezembro, base 2024.

## Ausências, normalização e limites

Despesa ausente não vira zero. Sem eleitos, a razão fica nula. Eleito registrado não comprova mandato exercido.

## Manutenção

- Serviço: `service.py`; consultas: `sql/`. Consultas comuns ficam em `../shared/sql/`, com referência local para evitar cópias.
- Entrada validada no adaptador HTTP; execução injetada por `ResearchContext`. Valores do usuário usam parâmetros preparados.
- Frontend correspondente: `src/features/questions/q01_custo_cadeira/`.
- Regressão: `tests/test_pesquisa.py`, `tests/test_exploration.py` e testes específicos da API. Q09 também usa os testes de classificação e evolução monetária.
- Retornar método, cobertura e limitações junto aos valores. Não alterar denominadores durante uma mudança visual.
