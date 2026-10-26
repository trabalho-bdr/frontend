# Q05 — Votos de legenda

## Responsabilidade e granularidade

Partido, município e eleição proporcional no primeiro turno.

## Método preservado

Votos de legenda divididos por votos nominais mais votos de legenda, com contagens completas e eleições equivalentes. Histórico de nomes é opcional.

## Ausências, normalização e limites

Sigla original preservada. Fusões e incorporações não são tratadas como simples renomeações. Não deduzir cadeiras diretamente da proporção.

## Manutenção

- Serviço: `service.py`; consultas: `sql/`. Consultas comuns ficam em `../shared/sql/`, com referência local para evitar cópias.
- Entrada validada no adaptador HTTP; execução injetada por `ResearchContext`. Valores do usuário usam parâmetros preparados.
- Frontend correspondente: `src/features/questions/q05_votos_legenda/`.
- Regressão: `tests/test_pesquisa.py`, `tests/test_exploration.py` e testes específicos da API. Q09 também usa os testes de classificação e evolução monetária.
- Retornar método, cobertura e limitações junto aos valores. Não alterar denominadores durante uma mudança visual.
