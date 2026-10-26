# Questões de pesquisa

IDs 01–10 seguem as perguntas originais. Cada módulo possui serviço, consultas SQL e método local. A infraestrutura é recebida por `ResearchContext`; nenhum serviço importa `app`. Os SQLs usam parâmetros preparados para entradas do usuário. Consultas de granularidade comum (perfil municipal, votação por organização e candidatura consolidada) pertencem a `shared` e não são copiadas entre perguntas.

O adaptador `pesquisa.py` preserva `/api/pesquisa/*` e imports dos testes anteriores. Q09 conserva `/api/bdr/q9/*` com o mesmo contrato. APIs editoriais anteriores que têm outros consumidores continuam documentadas como compatibilidade; não foram fundidas de forma a alterar primeiro turno ou denominadores.
