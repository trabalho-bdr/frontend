# Dados reais do banco v4

Atualização de 24/10/2026. A origem do backend foi validada como o compartilhamento `pipeline_bdr_der_completo_v4`, contendo 1.236 municípios e 608.587 candidaturas. As consultas são somente de leitura.

O MotherDuck pode anexar automaticamente um compartilhamento antigo com o alias `v4`. A inicialização agora valida o nome do compartilhamento configurado, substitui apenas o alias da conexão local quando necessário e anexa a origem correta com `READ_ONLY`. Não modifica tabelas nem altera compartilhamentos remotos. Configurar uma v3 no arquivo de ambiente gera erro; não é apresentada como v4.

As rotas de exposição, patrimônio, gastos e comparações usam a conexão v4. Foi removido o fallback do servidor que tentava consultar v3 quando uma tabela não era encontrada. Também foram removidos dados presidenciais fixos que eram retornados sem consulta ao banco.

Escolaridade, patrimônio e o exemplo proporcional agora consultam a API da exposição. Gastos usam as medianas devolvidas pela mesma consulta, e não constantes. Capa, TV, resumos do Fichário e do Mural derivam dos registros efetivamente extraídos da v4.

As referências locais também foram regeneradas na v4 em 24/10/2026. Elas continuam identificadas como consulta arquivada e não como acesso ao vivo. Incluem:

- Território: 1.236 municípios.
- Transições partidárias: 1.231 municípios comparáveis, com exclusão de líderes empatados.
- Partidos: 29 siglas no recorte padrão.
- Escolaridade: nove categorias.
- Patrimônio e gastos: quatro quartis em cada análise.
- Continuidade: oito grupos de idade/resultado da coorte.
- Exemplo proporcional de Fortaleza: duas candidaturas reconsultadas.
- Amostras auxiliares: 24 candidaturas, até 12 despesas reais por candidatura e 18 municípios, sem extrapolação para ranking completo.

Para regenerar as referências, execute `python server/refresh_v4_reference.py` no ambiente do servidor com as credenciais locais configuradas. O script verifica a origem antes de escrever os arquivos e não exporta credenciais. Os arquivos históricos da v3 foram preservados para auditoria, mas não são usados como fallback das análises ativas.

A API local foi reiniciada na porta 8000. Foram verificadas por HTTP as respostas de `/api/health` e dos endpoints de gastos, escolaridade, patrimônio, exemplo proporcional, território, partidos e continuidade, todos com origem `pipeline_bdr_der_completo_v4`.

Validação: 58 testes JavaScript, 48 testes Python e renderização textual das histórias aprovados; build de produção aprovado. A conexão e a origem foram verificadas de fato; a inspeção visual no navegador não foi repetida nesta atualização.
