# Arquitetura e manutenção

## Fluxo de uma investigação

1. O menu resolve a rota existente; IDs 01–10 permanecem estáveis.
2. `features/questions/registry.js` reúne definições e capacidades de cada pergunta. `data/questions.js` conserva o import anterior como adaptador.
3. `ResearchPage` compõe filtros, gráficos e exploração. `useResearchData` cuida da consulta cancelável; mensagens comuns não inventam conclusões para estados vazios ou em validação.
4. `pesquisa.py` valida o recorte e mantém o contrato HTTP. O registro Python despacha para o serviço da questão.
5. O serviço recebe `ResearchContext`, que fornece executor e localização dos artefatos. Testes podem injetar DuckDB local ou um executor controlado.
6. SQL versionado recebe fragmentos internos e parâmetros preparados. `core.database` abre o banco em leitura, serializa resultados e limita o cache.

Publicidade mantém `/api/bdr/q9/*`, pois seu contrato detalhado é diferente da resposta geral. Implementação, evolução e classificação pertencem a `q09_publicidade`; módulos antigos são adaptadores explícitos. O gerador de normalização continua funcionando pelo caminho anterior e não executa o SQL que produz.

## Responsabilidades

A separação aplica responsabilidade única e inversão de dependências sem criar hierarquias artificiais de classes. Cada questão pode trocar sua interpretação e visualização sem editar as demais. Serviços não importam `app`. Recortes, estatística e consultas municipais compartilhados evitam cópias de denominadores.

APIs editoriais antigas ainda consumidas permanecem em seus módulos, com SQL em `compatibility/sql/` ou na pasta da questão correspondente. Não foram unificadas à força: algumas usam primeiro turno, outras o último resultado observado. Uma futura retirada exige inventário de consumidores e teste do contrato, não apenas exclusão do menu.

## Como mudar uma pergunta

- Comece pelo README da questão no servidor: confirme granularidade, população, denominador e valores desconhecidos.
- Modifique o SQL próprio ou o serviço. Uma consulta compartilhada requer regressão das perguntas consumidoras.
- Mantenha valores da URL em `params`; `__SQL_*__` é reservado a fragmentos internos, nunca a texto arbitrário do usuário.
- Ajuste definição, interpretação, capacidades e gráfico no módulo frontend correspondente.
- Rode testes, formatação e build. Se mudar a metodologia, revise texto, cobertura e limitações; não trate isso como mera refatoração.

## Código retirado e referências

O inventário `unreachable-after.json` registra os módulos sem caminho desde `src/main.jsx` após a retirada das funções não renderizadas do App. As telas sem consumidores foram removidas. Amostras ainda necessárias a testes foram movidas para `tests/fixtures/legacy`; as demais referências históricas não são fallback em produção. O Atlas foi extraído para `pages/Atlas.jsx`.

Não foram tocadas as integrações locais ainda não versionadas, credenciais, logs ou artefatos temporários do usuário.

## Validação

Os testes existentes de consultas, filtros, identidades, fotos, despesas, evolução e mapas foram mantidos, substituindo apenas inspeções que exigiam telas já aposentadas. Foram acrescentados contratos de módulos e normalização comum Python/SQL/JavaScript.

`research-equivalence.json` compara resultados agregados de Timon/MA, vereador/2024, com a base funcional. Todas as nove questões da API geral foram equivalentes; a comparação ignora apenas o instante de extração e admite tolerância absoluta de 1e-8 e relativa de 1e-12 para agregações flutuantes. Isso não é uma auditoria de todos os recortes do banco.

O build ainda contém bundles grandes associados a gráficos e cenas 3D. A refatoração preserva essas funcionalidades; separar carregamento e revisar dependências por visualização pode ser feito em uma etapa de desempenho dedicada.
