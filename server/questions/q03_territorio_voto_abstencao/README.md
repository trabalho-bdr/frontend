# Q03 — Território, voto e abstenção

## Responsabilidade e granularidade

Um registro municipal com indicadores e denominadores reconciliados; votação e participação mantêm seus universos.

## Método preservado

Cruza população, PIB por habitante ou IDHM com abstenção ou participação partidária. Correlação usa somente pares completos. SQL comum em shared/repository.py e shared/sql/.

## Ausências, normalização e limites

IDHM de 2010 e referências de 2022 são identificados na resposta. Associação municipal não revela o voto individual; falta de indicador não é zero.

## Manutenção

- Serviço: `service.py`; consultas: `sql/`. Consultas comuns ficam em `../shared/sql/`, com referência local para evitar cópias.
- Entrada validada no adaptador HTTP; execução injetada por `ResearchContext`. Valores do usuário usam parâmetros preparados.
- Frontend correspondente: `src/features/questions/q03_territorio_voto_abstencao/`.
- Regressão: `tests/test_pesquisa.py`, `tests/test_exploration.py` e testes específicos da API. Q09 também usa os testes de classificação e evolução monetária.
- Retornar método, cobertura e limitações junto aos valores. Não alterar denominadores durante uma mudança visual.
