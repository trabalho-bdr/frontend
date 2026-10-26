# Q02 — Patrimônio e sucesso eleitoral

## Responsabilidade e granularidade

Candidaturas com resultado definido e patrimônio conhecido, no recorte selecionado.

## Método preservado

Zero declarado fica separado. Cortes por quartis do patrimônio positivo preservam empates; taxas usam eleitos/candidaturas e intervalos de Wilson de 95%.

## Ausências, normalização e limites

Valores negativos ou ausentes ficam fora das faixas válidas, com cobertura explícita. Tamanhos podem variar por empates; associação não é causalidade.

## Manutenção

- Serviço: `service.py`; consultas: `sql/`. Consultas comuns ficam em `../shared/sql/`, com referência local para evitar cópias.
- Entrada validada no adaptador HTTP; execução injetada por `ResearchContext`. Valores do usuário usam parâmetros preparados.
- Frontend correspondente: `src/features/questions/q02_patrimonio_sucesso/`.
- Regressão: `tests/test_pesquisa.py`, `tests/test_exploration.py` e testes específicos da API. Q09 também usa os testes de classificação e evolução monetária.
- Retornar método, cobertura e limitações junto aos valores. Não alterar denominadores durante uma mudança visual.
