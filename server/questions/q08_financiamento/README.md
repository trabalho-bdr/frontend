# Q08 — Financiamento

Entrada: recorte validado pelo catálogo. `service.calculate` recebe um `ResearchContext` explícito; `sql/` contém consultas desta questão. Fragmentos internos são renderizados pelo carregador SQL; valores do usuário continuam em parâmetros preparados.

Método e limitações são retornados junto aos resultados. Testes de regressão: `tests/test_pesquisa.py` e `tests/test_exploration.py`. Primeiro turno, resultado final, ausências e denominadores preservam os contratos anteriores. Não escrever no banco remoto.
