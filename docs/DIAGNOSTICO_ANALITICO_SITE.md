# Diagnóstico editorial e analítico do Arquivo da Democracia

Data: 23/10/2026. Escopo: revisão do código das páginas, componentes, consultas SQL, snapshots e documentação. Não houve inspeção visual nem novas consultas ao banco remoto. Os números abaixo são exemplos do snapshot de 21/10/2026, não resultados recalculados nesta revisão. O banco atual é referenciado como v4 no servidor, enquanto parte da documentação e dos snapshots registra v3; a equivalência precisa ser verificada.

## 1. Diagnóstico central

O site já tem uma identidade editorial própria, exploração por pessoa e território e componentes analíticos úteis. O principal problema é a hierarquia: o visitante recebe muitas portas de entrada e visualizações antes de receber uma resposta sustentada por evidência.

O objetivo recomendado é: permitir que uma pessoa entenda um achado, confira seu recorte e investigue os registros que o sustentam. A navegação deve refletir essa sequência.

A integração nativa recente corrigiu a separação visual dos painéis, mas integração técnica não garante adequação analítica. Q3 e Q7 precisam de gráficos específicos para suas perguntas.

## 2. Organização do site

Navegação principal proposta: Início | Análises | Explorar dados | Metodologia.

- Início: três achados, cobertura e acesso às perguntas; a dimensão do acervo vem depois dos resultados.
- Análises: dez perguntas, agrupadas por dinheiro, sociedade, território/partidos e trajetórias. Cada cartão apresenta pergunta, resposta breve e disponibilidade da evidência.
- Explorar dados: Candidaturas, Territórios, Partidos e Despesas. Arquivo, Atlas, Mural e Adesivaria permanecem como experiências dentro desses assuntos.
- Metodologia: dicionário de indicadores, cobertura por fonte/ano/cargo, critérios de resultados, tratamento de turnos, inflação, partidos e dados ausentes.

Plenário pode ser uma visualização dentro de Dinheiro e representação. Descobertas funciona como seleção de achados na capa e nas análises. Adesivaria pertence a Despesas e propaganda. Evitar nove destinos de mesmo peso para funcionalidades que compartilham os mesmos dados.

A identidade de arquivo físico, papel, fichas e cartazes pode permanecer. Interações 3D devem complementar a evidência, com números e resultados acessíveis sem depender da animação.

## 3. Contrato de leitura de cada análise

1. Pergunta precisa, delimitando população e fenômeno.
2. Resposta em uma ou duas frases, calculada sobre o recorte efetivo.
3. Três indicadores: resultado principal, contraste relevante e cobertura válida.
4. Um gráfico principal que demonstre a resposta.
5. Filtros comuns: eleição/cargo, território e, quando pertinente, partido ou pessoa.
6. Detalhamento: gráficos secundários, tabela e CSV dos mesmos dados.
7. Método e limites: fórmula, numerador, denominador, exclusões, referências temporais e fonte.

Exibir sempre o recorte efetivo e o estado da fonte junto do resultado. Estados distintos: consulta atual; recorte arquivado com data; exemplo fictício; indisponível. Disponibilidade de dados e força da interpretação são dimensões diferentes.

Os filtros precisam atualizar conjuntamente texto, indicadores, gráfico e tabela. Não apresentar uma tabela estática como alternativa de um gráfico cujo filtro é outro. A seleção deve ser preservada em links e na navegação entre análise, candidatura e despesas.

## 4. Como responder às dez perguntas

| Q | Pergunta analítica e resposta possível | Visual principal | Complemento e limites |
|---|---|---|---|
| 1 | Quanto variou o gasto agregado por eleito para o mesmo cargo? | Comparação entre dois pleitos equivalentes, com valor e variação | Separar soma dos gastos de todos / eleitos, mediana de gastos dos eleitos e gasto por voto individual. Mostrar cobertura financeira e moeda nominal. Corrigir inflação antes de chamar variação de aumento real. |
| 2 | Candidaturas com mais patrimônio apresentam maior taxa de eleição? | Taxa por quartil ou decil, incluindo contagem válida de cada grupo | Comparar dentro de cargo/ano e território; medianas de eleitos e não eleitos e distribuição assimétrica. Declarar patrimônio ausente, negativo e excluído. Associação não prova vantagem causal. |
| 3 | Como IDHM e PIB per capita se associam à abstenção municipal? | Dispersão: cada ponto é um município; indicador no eixo X e abstenção no Y | Separar UF e ano, apresentar quantidade de pares válidos e coeficientes. Mapa serve para localizar padrões, não demonstra sozinho associação. IDHM de 2010 deve ser identificado; PIB per capita não equivale à renda das pessoas. |
| 4 | A taxa de eleição varia com a escolaridade declarada? | Barras de taxa por escolaridade com denominadores | Mostrar composição de candidaturas versus composição de eleitos. Contar candidaturas não responde à chance de eleição. Falta fonte populacional para concluir sub-representação social. |
| 5 | A participação do voto de legenda mudou entre eleições equivalentes? | Pontos ligados entre dois anos, por cargo; ou barras empilhadas de nominal e legenda | Fórmula: legenda / (legenda + nominal). Comparação por partido em segundo plano. O indicador não mede a motivação psicológica do eleitor. Mudanças em pontos percentuais. |
| 6 | Como mudou a presença de jovens entre candidaturas e eleitos? | Participação por faixa etária, ano e resultado | Idade na data da eleição e cobertura de nascimento válido. Se a pergunta original é sobre jovens eleitores, declarar que não é respondida e indicar a fonte etária do eleitorado necessária. |
| 7 | Quais municípios trocaram de partido líder entre 2020 e 2024? | Mapa de permanência/troca e matriz de transição entre siglas | Identificar partido de origem e destino, empates e municípios comparáveis. Definir votos totais partidários versus só legenda. Renomeações, fusões e incorporações exigem regra explícita; sigla não mede ideologia. |
| 8 | Como a composição pública/privada das receitas se relaciona ao resultado? | Após integrar receitas: composição percentual e comparações por resultado | Atualmente indisponível. Despesas não identificam origem do financiamento. Informar campos faltantes e como vincular receitas, candidatura e eleição. Até lá, não apresentar conclusão quantitativa. |
| 9 | Como se distribui o investimento em publicidade e como muda entre eleições? | Barras horizontais por grupo padronizado e valores/participações | Nuvem como elemento secundário. Mostrar valor classificado, não classificado e em revisão. Para comparar perfis, mesma entidade/recorte e categorias consistentes; associação com vitória não é efeito causal. |
| 10 | Quem volta a disputar e como variam partido e resultado? | Linha de trajetória de uma pessoa por eleição; agregado por coorte de entrada | Separar voltar a concorrer, vencer novamente e exercer mandato. Não chamar duas vitórias de reeleição sem verificar exercício. Grupos de dois ou mais anos e três ou mais anos se sobrepõem. Auditar identificadores e última observação disponível. |

## 5. Exemplo de uma análise que responde antes de explorar

Pergunta: O patrimônio se associa ao sucesso nas eleições de vereador?

Resposta de exemplo do snapshot: em 2024, a taxa de eleição foi 27,68% no quartil superior de patrimônio e 13,18% no inferior: diferença de 14,50 pontos percentuais, aproximadamente 2,1 vezes.

Recorte exibido: vereador, 2024, seis UFs, candidaturas com patrimônio válido e resultado definido, snapshot de 21/10/2026. O tamanho de cada grupo precisa acompanhar o gráfico e ser confirmado na fonte correspondente antes de publicar o exemplo como resultado principal.

Visual: quatro barras de taxa de eleição. Texto abaixo: há associação neste recorte; a comparação não isola patrimônio de diferenças territoriais, partidárias ou de trajetória política. O mapa e as fichas entram depois para aprofundar.

Exemplo Q5: vereador, legenda de 5,43% em 2020 para 3,69% em 2024, queda de 1,74 ponto percentual no snapshot. Não concluir que o eleitor deixou de confiar nos partidos.

Exemplo Q7: o snapshot registra 452 municípios com a mesma sigla líder e 784 com troca, dentre 1.236 comparados. A apresentação precisa usar a mesma definição de liderança da consulta que gerou esse resultado.

## 6. Problemas concretos encontrados

### Prioridade máxima: confiança no recorte

- `src/data/client.js`: os fallbacks de patrimônio retornam resumos predefinidos sem validar todo o par ano/cargo pedido. Um erro em uma consulta de outro ano pode reaproveitar números de um recorte diferente.
- No fallback municipal do mesmo arquivo, `patrimonio_medio` recebe o valor da mediana. São estatísticas diferentes. Campos como negativos e resultados indefinidos também recebem zero sem evidência de contagem; preferir indisponível.
- `src/App.jsx`: status global deriva do health check, mas cada consulta pode falhar de forma independente. Texto de consulta real não deve ser inferido apenas da conexão geral.
- `EscolaridadeDossie.jsx`: sem resposta atual, usa snapshot; o texto da fonte precisa identificar o fallback efetivo, inclusive para categorias nacionais tratadas excepcionalmente. Não combinar o rótulo nacional de Presidente com cobertura fixa de seis UFs.
- Servidor v4 e snapshots/documentação v3 precisam de contrato de versão, data e cobertura por resposta. Versões diferentes não são automaticamente incompatíveis, mas a equivalência não foi demonstrada nesta revisão.

### Prioridade alta: alinhar pergunta e evidência

- Q3 passou a mostrar mapa de abstenção. Os indicadores socioeconômicos aparecem na ficha municipal, mas falta a relação visual entre variáveis que responde ao título.
- Q7 usa a mesma análise de legenda da Q5, embora a consulta de Q7 defina liderança por soma de votos nominais e de legenda. Assim, a visualização não demonstra o achado de continuidade divulgado.
- O botão de tabela das Investigações usa `getChartData`, enquanto as análises nativas têm filtros locais. A tabela externa pode não representar o gráfico filtrado.
- `ComparisonPanel` aparece após diversas páginas com filtros próprios; permite comparar outro recorte sem que a mudança seja evidente. Nas Investigações, admite assuntos que não correspondem à pergunta selecionada.
- Q9 tem caminhos de classificação distintos: descrições originais, prefixos de três materiais e normalização ampla. Totais só devem ser comparados quando o universo e a classificação forem equivalentes.
- Q10 mostra contagens sobrepostas como categorias paralelas. Não transformar em pizza nem somá-las; preferir indicadores separados ou grupos exclusivos.

### Prioridade de experiência e manutenção

- Estado das páginas fica em React sem URL específica. Isso dificulta compartilhar uma pergunta e recorte, usar voltar/avançar e reproduzir uma análise.
- Metáforas como Partidos abrindo um mural de candidaturas individuais aumentam a distância entre o nome do menu e a informação recebida.
- A capa destaca dimensão do acervo e exploração. Destacar antes três respostas concretas, com recortes explícitos, torna o propósito de análise mais imediato.
- A compilação recente informou pacote principal próximo de 2,86 MB antes de gzip. Cenas 3D e páginas podem ser carregadas sob demanda; é necessário medir a experiência real em celular antes de atribuir tempos de carregamento.
- Testes existentes validam parte das fórmulas, fontes e estrutura. Não substituem auditoria do banco, revisão estatística nem teste visual de navegação.

## 7. Contrato de dados recomendado

Cada resposta analítica deve conter: versão da base; data da extração; tipo de fonte; filtros pedidos e filtros efetivamente aplicados; unidade de análise; numerador; denominador; total elegível; total válido; excluídos por motivo; indicadores calculados; linhas usadas nos gráficos/tabelas; referências temporais; classificação utilizada.

Validar antes de desenhar: os totais reconciliam? Cada candidatura conta uma vez no conceito escolhido? Os dois anos têm o mesmo cargo, território e regras? Há dados suficientes? O rótulo corresponde à unidade? Falha de consulta não deve alterar silenciosamente o recorte.

## 8. Sequência recomendada

1. Corrigir fallback, estatísticas rotuladas incorretamente, proveniência por consulta e coerência entre filtros/gráfico/tabela.
2. Usar Q2 ou Q4 como análise piloto: resposta, três indicadores, gráfico central e detalhamento.
3. Criar os visuais específicos de Q3 e Q7; revisar o universo de classificação de Q9.
4. Reorganizar navegação, capa e ligações entre análise e registros; preservar contexto por URL.
5. Completar fontes ausentes e, se o objetivo for explicar relações além da descrição, planejar modelos ajustados com revisão estatística.

Critérios de conclusão: cada pergunta tem resposta ou impedimento explícito; o primeiro gráfico demonstra a resposta; filtros atualizam todo o conteúdo; o CSV reproduz a tabela; valores arquivados têm data e recorte corretos; não há afirmações causais sustentadas apenas por associação; os números principais são acessíveis sem animação ou 3D.
