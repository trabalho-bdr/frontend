# Normalização e qualidade dos dados

## Contratos de leitura

`shared/normalization.json` é a fonte versionada para códigos de ausência e restrição. `domain.normalization` e `catalog/sourceValue.js` aplicam o mesmo contrato. `catalog_facets` aplica as chaves também aos predicados SQL; casos comuns são testados em `shared/normalization-cases.json`.

- `NE`, `NI`, `NA`, `NULO`, campos vazios e equivalentes identificam ausência na fonte.
- “Não divulgável” tem chave própria; não se transforma em ausência.
- Zero financeiro continua numérico. Ausência não entra silenciosamente em somas, medianas ou taxas como zero.
- A normalização de ocupações reúne acentos, caixa, espaços e pontuação equivalentes; não agrupa profissões diferentes por aproximação textual.
- A harmonização educacional retira o prefixo “Ensino” quando equivalente; categorias desconhecidas não são redistribuídas.

Os registros brutos permanecem intactos. Esta etapa não reescreve tabelas remotas nem tenta corrigir identidades por nome parecido.

## Partidos

`shared/parties.json` centraliza grupos de nomes, renomeações, fusões/incorporações, notas e a fonte já usada pelo projeto. Catálogo, frontend e análise de transições leem o mesmo contrato. PL histórico e PSD histórico mantêm tratamento próprio. O filtro de nomes históricos não transforma fusões em renomeações.

## Publicidade

`questions/q09_publicidade/normalization.py` mantém regras revisáveis e descrições originais. A classificação não elimina as categorias ambíguas. A geração de SQL/CSV continua local e exige revisão antes de qualquer aplicação externa.

## Auditoria executada

O relatório `normalization-audit.json` contém apenas agregações de leitura da v4:

- 608.591 candidaturas; nenhum ID duplicado.
- Nenhuma candidatura sem ID de pessoa ou referência correspondente em `Candidato`.
- Nenhum grupo duplicado nas chaves verificadas de resultados e votação partidária.
- Patrimônio: 472.182 ausentes, 139 zeros declarados e nenhum valor negativo observado.
- Despesas consolidadas: 395.530 ausentes e 63.976 zeros declarados.

A ausência de duplicatas nessas chaves não prova que todos os vínculos ou atributos estão corretos. Não valida o patrimônio item a item nem a origem última das receitas. A cobertura financeira incompleta continua visível nas análises.

## Evolução do contrato

Uma mudança semântica requer aumentar a versão do contrato, adicionar exemplos de entrada/saída e verificar Python, SQL e JavaScript. Não fundir “não divulgável”, ausência e zero para simplificar filtros. Novos eventos partidários exigem comprovação e tratamento temporal antes de entrar no histórico.
