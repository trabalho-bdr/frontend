# Q09 — Publicidade eleitoral

## Responsabilidade e granularidade

Descrição original de despesa e candidatura; totais e evolução mantêm recortes próprios.

## Método preservado

repository.py consulta; evolution.py compara eleições; normalization.py classifica e gera SQL/CSV para revisão. API /api/bdr/q9/*; adaptadores em bdr_paineis e q9_normalizacao preservam consumidores.

## Ausências, normalização e limites

Classificação é revisável: explícita, ambígua ou não publicitária. Materiais selecionados não equivalem ao total da campanha. O gerador não executa SQL remoto.

## Manutenção

- Serviço: `service.py`; consultas: `sql/`. Consultas comuns ficam em `../shared/sql/`, com referência local para evitar cópias.
- Entrada validada no adaptador HTTP; execução injetada por `ResearchContext`. Valores do usuário usam parâmetros preparados.
- Frontend correspondente: `src/features/questions/q09_publicidade/`.
- Regressão: `tests/test_pesquisa.py`, `tests/test_exploration.py` e testes específicos da API. Q09 também usa os testes de classificação e evolução monetária.
- Retornar método, cobertura e limitações junto aos valores. Não alterar denominadores durante uma mudança visual.
