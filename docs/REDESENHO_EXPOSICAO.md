# Exposição de descobertas eleitorais

Implementação de 24/10/2026, no projeto existente. Não foram realizadas operações de versionamento.

## Organização e leitura

O menu principal apresenta Dinheiro e poder; O voto e as cadeiras; O Brasil no mapa; Quem faz política. Um segundo nível leva aos ambientes existentes. A marca volta à capa e o caderno de fontes e método fica acessível pela faixa superior e pelo rodapé.

A capa tem três histórias principais, os quatro caminhos temáticos e uma curiosidade contextual. A TV fica como aprofundamento manual, sem carrossel automático. O Plenário, o Fichário, a Adesivaria, o Atlas e o Mural permanecem no projeto. Links com `page`, `story` e `theme` podem ser compartilhados. O índice original de Investigações é um arquivo opcional acessível pela metodologia e por links antigos; a jornada principal não depende dele.

As novas histórias seguem pergunta → descoberta → evidência → interpretação → exploração. Os exploradores anteriores ficam em detalhes que montam os componentes apenas quando abertos, reduzindo a quantidade simultânea de gráficos e de cenas WebGL.

## Ambientes

- Plenário: comparação real entre Tony Brito e Marcos Paulo, de Fortaleza, vereador/2024; explicação conceitual do sistema proporcional sem simular distribuição oficial. Outra história compara gasto mediano de eleitos e não eleitos e taxas por quartis de despesas. A maquete e os rankings anteriores continuam disponíveis no aprofundamento.
- Adesivaria: concentração das despesas nas três primeiras candidaturas do material e recorte selecionados. A amostra é identificada como parcial. Dispersão e comparação individual usam somente os registros carregados, com explicitação desse universo. Classificação ampliada e séries históricas permanecem acessíveis com aviso de que seus universos diferem do ranking de três materiais.
- Atlas: dispersão de abstenção e população, PIB per capita ou IDHM; correlação e número de pares válidos; seleção por UF/ano e tabela dos mesmos dados. Outra história compara siglas líderes e transições municipais. O mapa municipal original continua disponível.
- Fichário: escolaridade e taxa de eleição, patrimônio por quartis e retorno às disputas por idade e resultado de origem. A seleção de uma ficha permite consultar a linha do tempo de candidaturas vinculadas à pessoa. Não se inferem mandatos ou motivos de ausência.
- Mural: participação nos votos versus participação nas candidaturas eleitas, com contagens, taxa por resultado definido, filtros e tabela de todos os partidos. Os cartazes e o voto de legenda continuam acessíveis.
- Contas: distinção entre gasto agregado por eleito e despesa individual; lacuna das receitas pública/privada explicitada. Documentos fiscais continuam sendo espelhos informativos.

## Dados e consultas verificadas

A conexão MotherDuck e o esquema foram inspecionados antes das novas consultas. A conexão disponível nesta sessão expõe `pipeline_bdr_der_completo_v3`; o backend do projeto usa o catálogo configurado sob o alias v4. Consultas arquivadas e consultas atuais têm proveniência distinta, sem afirmar equivalência entre versões.

As consultas de leitura que sustentam os novos arquivos de referência foram executadas em 24/10/2026:

- Território: 1.236 municípios, sem truncamento; extração paginada para respeitar os limites de resposta da ferramenta.
- Liderança: 1.231 municípios comparáveis entre 2020 e 2024; cinco líderes empatados ficam fora. O universo difere da comparação antiga que desempata por identificador.
- Partidos: 29 siglas na consulta padrão de vereador/2024.
- Continuidade: coorte de vereador/2020 vinculada a candidaturas em 2024; grupos por idade de origem e resultado, incluindo não retornos.
- Gastos: quatro quartis de despesas não negativas com resultado definido, primeiro turno. Medianas revalidadas: R$ 3.819,30 entre eleitos e R$ 1.600 entre não eleitos/suplentes; os denominadores deste recorte são 13.137 e 68.732, respectivamente. Diferem de totais sem as mesmas exclusões.
- Fortaleza: Tony Brito, PSD, 12.177 votos, suplente; Marcos Paulo, PP, 4.992 votos, eleito por QP. Ambos verificados na mesma cidade, cargo, ano e turno.
- Escolaridade: grupos de vereador/2024 e resultados definidos revalidados para a evidência de abertura.

As novas rotas somente-leitura estão em `server/exhibition.py`, sob `/api/exposicao`: partidos, território, transições, continuidade, gastos e trajetória. Reinicie o processo de backend após atualizar os arquivos. As credenciais permanecem no servidor.

`exhibitionSnapshot.json` e `exhibitionFacts.js` guardam referências revalidadas com data e recorte. Filtros compatíveis de território usam subconjuntos reais. Não existe fallback estadual para agregados que só foram extraídos para seis UFs. Recortes não disponíveis geram estado de indisponibilidade.

Os fallbacks de gastos deixaram de criar candidaturas sintéticas ou multiplicar votos/despesas para simular outros cargos. A dispersão offline usa somente a amostra real existente e recalcula suas estatísticas nesse universo. Distribuições que exigem dados adicionais ficam indisponíveis. O fallback de patrimônio valida ano/cargo/município, não atribui mediana a um campo de média nem transforma exclusões desconhecidas em zero.

## Componentes e acessibilidade

`components/exhibition/Story.jsx` reúne abertura narrativa, interpretação, fonte, curiosidade, aprofundamento, estado de indisponibilidade e tabela/CSV. Os componentes de cada história preservam as cores e a tipografia do portal. Filtros e tabelas operam sobre os mesmos registros nas novas análises. Tabelas longas mostram registros progressivamente, enquanto o CSV contém o conjunto filtrado.

Há foco visível, link para pular ao conteúdo sem alterar a rota, navegação por botões/seletores, estados de carregamento/erro, ausência diferenciada de zero, regras responsivas e respeito a movimento reduzido. As cenas existentes mantêm seus fallbacks WebGL. Gráficos têm alternativa textual e tabela; não se depende apenas dos tooltips.

## Verificação

- 58 testes JavaScript aprovados, incluindo reconciliação de taxas, cobertura, filtros, correlação, transições, coortes e proteção contra fallbacks incompatíveis.
- 47 testes Python aprovados. As novas consultas foram executadas também em DuckDB local com fixtures que verificam empate, denominador da coorte, junções, mediana e parâmetros inválidos.
- 10 histórias e 5 rotas passaram por renderização textual em React, sem NaN ou Infinity. Isso é um teste de estrutura/renderização; não substitui navegação por cliques ou avaliação visual.
- Build de produção aprovado. Ambientes e cenas carregam sob demanda; ainda há aviso de chunks grandes. Não foi medido tempo de carregamento em dispositivos reais.
- Inspeção visual desktop/mobile não confirmada: a integração de navegador expirou ao tentar iniciar. Não foram produzidas capturas nem declarada validação visual.

Comandos: `node --test tests/*.test.mjs`; `.venv-local/Scripts/python.exe -m unittest discover -s tests -p 'test_*.py' -q`; `npm run build`. Dependências de teste Python estão em `server/requirements-test.txt`.

## Limites mantidos

Não foram criados modelos ajustados, intervalos de confiança ou afirmações de significância sem validação. Correlação territorial não identifica comportamento individual. Valores são nominais; IDHM é de 2010. Comparações não isolam efeitos de patrimônio, gasto, experiência ou partido. Receitas pública/privada, escolaridade/idade do eleitorado, séries municipais históricas, cassações e mandato efetivamente exercido continuam dependendo de outras fontes.
