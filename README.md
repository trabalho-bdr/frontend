# Arquivo da Democracia

Portal de exploração eleitoral organizado pelas dez perguntas da pesquisa. Preserva a identidade visual de arquivo, com catálogo de pessoas, perfis, álbum de candidaturas, gráficos, mapas, mural e Plenário.

## Executar

Requisitos: Node 22+, Python 3.10+ e acesso de leitura ao banco configurado no servidor.

```powershell
npm ci
python -m pip install -r requirements-dev.txt
python server/run.py
```

Em outro terminal:

```powershell
npm run dev
```

Abra http://127.0.0.1:5173. O Vite encaminha `/api` para `127.0.0.1:8000`.

Configure `server/.env` a partir de `server/.env.example`: `MOTHERDUCK_TOKEN` e, opcionalmente, `MOTHERDUCK_DATABASE=md:pipeline_bdr_der_completo_v4`. Credenciais ficam somente no servidor. A conexão abre exclusivamente a v4 em modo somente leitura. Não há substituição silenciosa de resultados por amostras quando a API falha.

## Organização

- `src/features/questions/q01_*` até `q10_*`: definição, interpretação, capacidades do mapa/Plenário e gráficos específicos.
- `src/features/questions/shared/`: carregamento cancelável e interpretações comuns.
- `src/pages/ResearchPage.jsx`: composição visual, filtros e estados da investigação.
- `server/questions/q01_*` até `q10_*`: serviços, SQL e documentação metodológica por pergunta.
- `server/questions/shared/`: consultas com granularidade comum, recortes e estatística.
- `server/core/`: conexão, cache, configuração, protocolo de execução e carregamento SQL.
- `server/domain/` e `shared/`: normalização versionada, contratos comuns ao Python/JavaScript e auditoria de integridade.
- `server/catalog/`: SQL do catálogo de pessoas; APIs anteriores mantêm seus contratos de compatibilidade.
- `tests/fixtures/legacy/`: amostras históricas usadas apenas em testes; não fazem parte do catálogo de produção.

Leia [arquitetura e manutenção](docs/refactoring/ARCHITECTURE.md), [normalização](docs/refactoring/NORMALIZATION.md) e [sequência dos commits](docs/refactoring/COMMITS.md).

## Verificar alterações

```powershell
npm test
npm run test:api
npm run check
npm run build
```

`npm run format` aplica Prettier ao JavaScript/JSX/CSS e Ruff ao Python de produção. Instale `requirements-dev.txt` para disponibilizar `ruff` no PATH. `PYTHON` pode apontar para o executável do ambiente Python usado por `npm run test:api`.

Auditorias opcionais com a conexão local, sem escrita no banco:

```powershell
python scripts/audit_normalization.py
python scripts/verify_research.py --baseline 026596e
```

Elas produzem somente relatórios agregados em `artifacts/`. O segundo comando compara o contrato das nove questões da API geral com o commit de base; Q09 conserva sua API detalhada e testes específicos.

## Dados e limites

Cobertura parcial de CE, MA, MS, RJ, RN e RS entre 2002 e 2024. Não equivale ao Brasil inteiro. Ausência não é zero; não divulgável permanece separado. Pessoa, candidatura, resultado registrado e mandato exercido têm significados distintos.

O perfil do eleitorado está liberado para comparação em 2024; histórico não validado continua bloqueado. Indicadores censitários e IDHM têm referências temporais próprias. Financiamento continua uma análise descritiva parcial. Todas as respostas devem manter método, cobertura e limitações visíveis.

A documentação de versões anteriores está em `docs/history/`; ela descreve comportamentos históricos, não o estado atual.
