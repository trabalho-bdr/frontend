# Q08 — Financiamento

## Responsabilidade e granularidade

Candidatura vinculada à prestação financeira final por sequencial, ano, UF e cargo.

## Método preservado

Cruza parcela declarada de fundos públicos, outros recursos e origem incompleta com resultado eleitoral. Artefatos locais e manifesto têm procedência explícita.

## Ausências, normalização e limites

Sem vínculo não é receita zero. Não rastreia origem última dos repasses nem faz conciliação bancária. Resultado continua parcial.

## Manutenção

- Serviço: `service.py`; consultas: `sql/`. Consultas comuns ficam em `../shared/sql/`, com referência local para evitar cópias.
- Entrada validada no adaptador HTTP; execução injetada por `ResearchContext`. Valores do usuário usam parâmetros preparados.
- Frontend correspondente: `src/features/questions/q08_financiamento/`.
- Regressão: `tests/test_pesquisa.py`, `tests/test_exploration.py` e testes específicos da API. Q09 também usa os testes de classificação e evolução monetária.
- Retornar método, cobertura e limitações junto aos valores. Não alterar denominadores durante uma mudança visual.
