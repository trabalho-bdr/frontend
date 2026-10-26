# Q04 — Escolaridade

## Responsabilidade e granularidade

Distribuições de candidatos e eleitores por categoria conhecida; dispersão municipal usa eleitorado de 18 anos ou mais.

## Método preservado

Harmoniza grafias equivalentes sem juntar níveis distintos. A distribuição permite selecionar o universo etário; o gráfico municipal mantém a referência 18+. Partido restringe candidatos, não eleitores.

## Ausências, normalização e limites

Sem informação e não divulgável continuam distintos e ficam fora do denominador conhecido. Eleitorado não é população residente. Só 2024 está liberado.

## Manutenção

- Serviço: `service.py`; consultas: `sql/`. Consultas comuns ficam em `../shared/sql/`, com referência local para evitar cópias.
- Entrada validada no adaptador HTTP; execução injetada por `ResearchContext`. Valores do usuário usam parâmetros preparados.
- Frontend correspondente: `src/features/questions/q04_escolaridade/`.
- Regressão: `tests/test_pesquisa.py`, `tests/test_exploration.py` e testes específicos da API. Q09 também usa os testes de classificação e evolução monetária.
- Retornar método, cobertura e limitações junto aos valores. Não alterar denominadores durante uma mudança visual.
