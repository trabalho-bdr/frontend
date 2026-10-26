# Dados locais de pesquisa

receitas-candidatos.parquet: agregados por ano, sequencial de candidatura, UF e cargo, importados dos ZIPs oficiais do TSE para 2018/2020/2022/2024 e seis UFs. Não contém nomes nem documentos de doadores. O arquivo não é uma cópia integral da prestação de contas.

receitas-manifest.json guarda URLs, hashes por CSV, data, contagens excluídas e conflitos. Contas sem vínculo ou com recibos conflitantes não equivalem a receita zero. Relatórios parciais não são somados a finais. Receitas estimáveis não entram na composição financeira principal. Não há auditoria independente de extratos/devoluções nem rastreamento integral da origem de repasses; a investigação apresenta resposta parcial.

ipca.json: IPCA mensal oficial, série SGS 433, fatores de dezembro a dezembro até dezembro/2024. Convenção anual explícita, sem data de cada lançamento.

Atualização manual a partir da raiz do projeto: python server/scripts/refresh_receitas.py e python server/scripts/refresh_ipca.py. Rede necessária; refresh incompleto de receitas não deve substituir a base existente.

O MotherDuck é consultado somente para leitura. Não foram criadas tabelas nem views no banco remoto.
