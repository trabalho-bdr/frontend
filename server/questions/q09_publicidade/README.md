# Q09 — Publicidade eleitoral

`repository.py` contém as consultas e classificação da publicidade; `evolution.py` compara séries; `sql/` guarda SQL. A API `/api/bdr/q9/*` e os imports anteriores permanecem compatíveis. A classificação distingue conteúdo explícito, ambíguo e não publicitário. Não somar recortes de materiais como se fossem o total da campanha. Testes: `tests/test_q9_evolution_money.py`, `tests/test_adesivaria_ranking.py`.
