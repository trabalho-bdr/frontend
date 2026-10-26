# Q06 — Eleitorado jovem

## Responsabilidade e granularidade

Município, perfil etário e votação do partido selecionado ou abstenção.

## Método preservado

Participação dos jovens entre eleitores com idade conhecida. Faixas 16–17, 18–24, 16–24 e 16–29. SQL municipal em shared/.

## Ausências, normalização e limites

Não é idade dos candidatos nem comportamento individual de voto. Faixas inválidas são excluídas e contadas. Histórico fora de 2024 permanece em validação.

## Manutenção

- Serviço: `service.py`; consultas: `sql/`. Consultas comuns ficam em `../shared/sql/`, com referência local para evitar cópias.
- Entrada validada no adaptador HTTP; execução injetada por `ResearchContext`. Valores do usuário usam parâmetros preparados.
- Frontend correspondente: `src/features/questions/q06_eleitorado_jovem/`.
- Regressão: `tests/test_pesquisa.py`, `tests/test_exploration.py` e testes específicos da API. Q09 também usa os testes de classificação e evolução monetária.
- Retornar método, cobertura e limitações junto aos valores. Não alterar denominadores durante uma mudança visual.
