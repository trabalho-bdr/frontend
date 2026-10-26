# Q10 — Trajetórias eleitorais

## Responsabilidade e granularidade

Coorte de pessoas com identidade consistente selecionadas pelo recorte; histórico completo observado nas seis UFs.

## Método preservado

Agrupa sequências de participação, continuidade e retorno após intervalo maior que quatro anos. Cargos e mudanças organizacionais são indicadores adicionais.

## Ausências, normalização e limites

Primeiro/último registro não provam estreia ou saída da política. Candidatura não é mandato. Ausência no acervo não comprova interrupção de atividade.

## Manutenção

- Serviço: `service.py`; consultas: `sql/`. Consultas comuns ficam em `../shared/sql/`, com referência local para evitar cópias.
- Entrada validada no adaptador HTTP; execução injetada por `ResearchContext`. Valores do usuário usam parâmetros preparados.
- Frontend correspondente: `src/features/questions/q10_trajetorias/`.
- Regressão: `tests/test_pesquisa.py`, `tests/test_exploration.py` e testes específicos da API. Q09 também usa os testes de classificação e evolução monetária.
- Retornar método, cobertura e limitações junto aos valores. Não alterar denominadores durante uma mudança visual.
