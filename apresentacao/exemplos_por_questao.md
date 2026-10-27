# Arquivo da Democracia — Caderno de Evidências e Exemplos Reais

Este documento reúne os exemplos reais, auditados e didáticos para as **dez questões da pesquisa eleitoral**, estruturados estritamente com base nos dados do banco `pipeline_bdr_der_completo_v4` e arquivos sanitizados oficiais.

> [!IMPORTANT]
> **Aviso Metodológico de Cobertura**:
> O projeto possui cobertura parcial nos estados de **CE, MA, MS, RJ, RN e RS**, totalizando **1.236 municípios** e **608.587 candidaturas** entre **2002 e 2024**. Não representa a totalidade do Brasil. Ausência de dado não é zero; declaração não é renda; associação estatística não é prova de causalidade.

---

## Sumário das Questões

1. [Q01 — Custo financeiro por cadeira](#q01--custo-financeiro-por-cadeira)
2. [Q02 — Patrimônio e sucesso eleitoral](#q02--patrimônio-e-sucesso-eleitoral)
3. [Q03 — Território, voto e abstenção](#q03--território-voto-e-abstenção)
4. [Q04 — Escolaridade de candidaturas e eleitorado](#q04--escolaridade-de-candidaturas-e-eleitorado)
5. [Q05 — Votos de legenda em pleitos proporcionais](#q05--votos-de-legenda-em-pleitos-proporcionais)
6. [Q06 — Eleitorado jovem e dinâmica municipal](#q06--eleitorado-jovem-e-dinâmica-municipal)
7. [Q07 — Mudanças partidárias no voto de vereador](#q07--mudanças-partidárias-no-voto-de-vereador)
8. [Q08 — Financiamento de campanha e fundos públicos](#q08--financiamento-de-campanha-e-fundos-públicos)
9. [Q09 — Publicidade eleitoral e despesas de campanha](#q09--publicidade-eleitoral-e-despesas-de-campanha)
10. [Q10 — Trajetórias eleitorais e longevidade política](#q10--trajetórias-eleitorais-e-longevidade-política)

---

## Q01 — Custo financeiro por cadeira

### 1. Padrão agregado sustentado pelos dados
Nas eleições municipais proporcionais (Vereador), o gasto financeiro agregado por eleito registrado mais do que dobrou entre 2020 e 2024 no recorte das 6 UFs:
- **2020**: R$ 287.245.810,42 contratados por 106.692 candidaturas com gasto conhecido para eleger 13.205 vereadores = **R$ 21.752,81 por eleito** (R$ 27.776,83 corrigido pelo IPCA base dez/2024).
- **2024**: R$ 676.565.046,81 contratados por 84.356 candidaturas com gasto conhecido para eleger 13.139 vereadores = **R$ 51.492,89 por eleito** (aumento nominal de 136,7% e real de 85,4%).
- A despesa considerando **apenas os eleitos** dividida pelo número de cadeiras foi de **R$ 6.354,10 (2020)** e **R$ 14.681,01 (2024)**, enquanto a **mediana individual** de gastos de um vereador eleito subiu de R$ 1.978,25 para R$ 3.819,30.
- Nas eleições gerais para **Deputado Federal** (133 cadeiras nas 6 UFs):
  - **2018**: R$ 305.131.342,28 no total = **R$ 2.294.220,62 por eleito** (R$ 3.193.746,17 corrigido IPCA); apenas eleitos por cadeira = R$ 913.030,40; mediana = R$ 861.833,02.
  - **2022**: R$ 723.548.970,17 no total = **R$ 5.440.217,82 por eleito** (R$ 5.966.595,31 corrigido IPCA); apenas eleitos por cadeira = R$ 1.770.222,80; mediana = R$ 1.718.532,70.

### 2. Exemplo real ilustrativo
- **São Luís / MA (2020 vs 2024 — Vereador)**:
  - Em 2020: 942 candidaturas disputaram 31 cadeiras com R$ 9.812.924,96 totais (**R$ 316.545,97 por eleito**; apenas eleitos: R$ 65.533,95; mediana: R$ 48.563,53).
  - Em 2024: 520 candidaturas disputaram as 31 cadeiras com R$ 31.575.394,46 totais (**R$ 1.018.561,11 por eleito**, superando R$ 1 milhão por cadeira!). Apenas os eleitos gastaram R$ 245.052,44 por cadeira e a mediana foi de R$ 197.058,91.

### 3. Contraponto relevante
- **Município de pequeno porte (Timon / MA)**:
  - Em 2020: 380 candidaturas, 21 eleitos, total R$ 876.676,31 (**R$ 41.746,49 por eleito**; apenas eleitos: R$ 16.704,81).
  - Em 2024: 328 candidaturas, 21 eleitos, total R$ 1.883.822,09 (**R$ 89.705,81 por eleito**; apenas eleitos: R$ 26.472,47).
  - O custo relativo cresceu no interior, mas em patamar dez vezes menor do que na capital do estado, evidenciando que a pressão inflacionária de campanha é concentrada nos centros metropolitanos.

### 4. Recorte, cálculos, denominadores e exclusões
- **Numerador**: Soma de despesas conhecidas e finitas (`gastos >= 0 AND isfinite(gastos)`).
- **Denominador**: Total de candidaturas com situação `ELEITO` registradas na Justiça Eleitoral.
- **Cobertura**: Anos 2020 e 2024 para pleitos municipais; 2018 e 2022 para Deputado Federal.
- **Exclusões**: Eleições de 2004 a 2016 possuem contagem de candidaturas e eleitos, mas estão com despesas não migradas/zeradas no banco (`com_valor = 0`); despesa ausente não vira zero; eleições suplementares são excluídas.

### 5. Tela e sequência de filtros na aplicação
1. Acesse `#page=perguntas&pergunta=1` (ou na seção *Dinheiro e poder* -> *Custo da política*).
2. Filtros: Ano: `2024` | Cargo: `VEREADOR` | UF: `MA` | Município: `São Luís`.
3. Para comparar com eleição geral: alternar Cargo para `DEPUTADO FEDERAL` (o sistema ajusta automaticamente o ano para `2022` e desativa o filtro municipal).

### 6. Fala sugerida (30–45 segundos)
> *"Na Questão 1, investigamos o custo real de cada cadeira parlamentar. Entre 2020 e 2024, o custo total por eleito em nossas 6 UFs saltou de 21 mil para mais de 51 mil reais, mesmo após descontar a inflação. Em capitais como São Luís, esse valor ultrapassou 1 milhão de reais por vaga de vereador em 2024. Mas atenção: se olharmos apenas para o dinheiro gasto por quem venceu, a mediana fica em 3.800 reais. Isso prova que o grosso do custo eleitoral não está no bolso individual do vencedor, mas na enorme máquina de candidaturas que gastam e não são eleitas."*

### 7. Interpretação permitida e conclusão indevida
- **Permitido**: Afirmar que a barreira financeira agregada para disputar cadeiras cresceu substantivamente acima da inflação geral.
- **Indevido**: Concluir que um candidato precisa pessoalmente ter ou gastar R$ 51 mil para se eleger, confundindo o gasto de toda a chapa derrotada com o orçamento do vencedor.

### 8. Fonte e consulta reproduzível
- **Fonte**: TSE / Prestação de Contas Eleitorais; tabela `Candidatura` e `Resultado_Candidatura`.
- **Base**: `pipeline_bdr_der_completo_v4`.
- **Consulta**: Arquivo [q01_custo.sql](file:///c:/Users/Nicole%20Ellen/Documents/Ciencia%20da%20Computacao/7%20periodo/BDR/frontend/apresentacao/consultas/q01_custo.sql).

---

## Q02 — Patrimônio e sucesso eleitoral

### 1. Padrão agregado sustentado pelos dados
Nas eleições de 2024 para Vereador, a taxa de sucesso eleitoral cresce monotonicamente conforme os decis de patrimônio declarado:
- **Decil 1** (patrimônio até R$ 7.000,00, mediana R$ 3.000,00): 5.176 candidaturas, 620 eleitos = **11,98% de eleitos** (IC Wilson 95%: [11,12%, 12,89%]).
- **Decil 5** (R$ 61.546 a R$ 100.000, mediana R$ 80.000): 5.542 candidaturas, 1.204 eleitos = **21,73% de eleitos**.
- **Decil 10** (patrimônio acima de R$ 585.735,83, mediana R$ 916.734,47): 5.104 candidaturas, 1.527 eleitos = **29,92% de eleitos** (IC Wilson: [28,68%, 31,18%]).
- Candidatos do decil mais rico têm probabilidade 2,5 vezes superior de vitória comparados aos do primeiro decil.
- **Zero declarado (tratado separadamente)**: 69 candidaturas declararam exatamente R$ 0,00 e 11 foram eleitas = **15,94% de eleitos** (IC Wilson: [9,14%, 26,33%]).

### 2. Exemplo real ilustrativo (na mesma disputa)
- **Fortaleza / CE (2024 — Vereador)**:
  - **Gabriel Biologia (PSOL)**: declarou patrimônio modesto de **R$ 236.352,48** (Decil 8), gastou R$ 141.573,65 e foi **ELEITO com 30.682 votos** (o 2º vereador mais votado de toda a capital cearense).
  - **Emanuel Acrizio (AVANTE)**: declarou **R$ 139.500,00** (Decil 6), gastou R$ 81.496,38 e foi **ELEITO com 16.083 votos**.

### 3. Contraponto relevante (na mesma disputa)
- **Marcio Cruz (PC do B) — Fortaleza / CE (2024 — Vereador)**:
  - Declarou patrimônio de **R$ 1.045.000,00** (pertencente ao Decil 10 mais rico), contratou despesas de R$ 438.790,00, recebeu 4.571 votos e ficou como **SUPLENTE / NÃO ELEITO**.
  - Demonstra que ter grande patrimônio declarado e volume financeiro elevado não garante a cadeira em disputas de coeficiente partidário restrito.

### 4. Recorte, cálculos, denominadores e exclusões
- **Numerador**: Candidaturas com resultado `ELEITO`.
- **Denominador**: Candidaturas com situação de resultado definida (`ELEITO`, `NAO_ELEITO`, `SUPLENTE`), excluindo `INDEFINIDO`.
- **Exclusões**: Candidaturas sem declaração de bens (`patrimonio IS NULL`) somam dezenas de milhares e **não são convertidas em zero**; patrimônios negativos são descartados; zero declarado é mantido em faixa isolada.

### 5. Tela e sequência de filtros na aplicação
1. Acesse `#page=perguntas&pergunta=2` (ou *Dinheiro e poder* -> *Patrimônio e sucesso*).
2. Filtros: Ano: `2024` | Cargo: `VEREADOR` | Opção: *Patrimônio zero separado*.
3. Use a ferramenta "Buscar pessoas / registros" para inspecionar Fortaleza/CE ou abrir o Plenário de cadeiras.

### 6. Fala sugerida (30–45 segundos)
> *"Na Questão 2, avaliamos se candidatos ricos vencem mais. A resposta agregada é sim: quem está no decil mais alto de bens declarados tem 30% de taxa de sucesso, contra apenas 12% no decil mais baixo. Mas o dado traz duas surpresas fundamentais. Primeiro: quem declara exatamente patrimônio zero se elege mais do que quem declara até 20 mil reais. Segundo: riqueza não compra mandato. Em Fortaleza, Gabriel Biologia declarou patrimônio de 236 mil reais e foi o segundo mais votado da cidade, enquanto candidatos milionários com mais de 400 mil reais em despesas ficaram apenas como suplentes."*

### 7. Interpretação permitida e conclusão indevida
- **Permitido**: Reconhecer a correlação positiva robusta entre patrimônio individual declarado e taxa de sucesso eleitoral.
- **Indevido**: Afirmar relação de causalidade direta (o patrimônio do candidato financia sua própria vitória) ou presumir que declaração de bens reflete a renda líquida real do cidadão.

### 8. Fonte e consulta reproduzível
- **Fonte**: TSE / Declaração de Bens dos Candidatos; tabela `Patrimonio_Candidato` e `Candidatura`.
- **Base**: `pipeline_bdr_der_completo_v4`.
- **Consulta**: Arquivo [q02_patrimonio.sql](file:///c:/Users/Nicole%20Ellen/Documents/Ciencia%20da%20Computacao/7%20periodo/BDR/frontend/apresentacao/consultas/q02_patrimonio.sql).

---

## Q03 — Território, voto e abstenção

### 1. Padrão agregado sustentado pelos dados
Nos 1.236 municípios das 6 UFs em 2024:
- **População vs Abstenção**: correlação de Pearson r = **0,227**, mas correlação monotônica por postos de Spearman r = **0,681** (forte associação não linear: cidades maiores têm postos de abstenção sistematicamente mais elevados).
- **IDHM (2010) vs Abstenção (2024)**: Pearson r = **0,197**, Spearman r = **0,125** (associação positiva muito fraca, demonstrando que o desenvolvimento humano municipal isolado não explica o comparecimento).
- A abstenção varia de **4,31%** (Canudos do Vale/RS) até **33,79%** (Uruguaiana/RS).

### 2. Exemplo real ilustrativo (Par comparável na mesma UF)
- **Rio Grande do Sul (Municípios de pequeno porte com IDHM equivalente)**:
  - **Herveiras / RS**: IDHM = **0,616**, População = 2.565 habitantes, Abstenção = **8,38%**.
  - **Benjamin Constant do Sul / RS**: IDHM = **0,619**, População = 2.082 habitantes, Abstenção = **21,89%**.
  - Uma disparidade de **13,51 pontos percentuais** de abstenção em dois municípios gaúchos rurais com exatamente o mesmo nível de IDHM e população equivalente.

### 3. Contraponto relevante (Extremos regionais)
- No Maranhão, o município de **Tasso Fragoso** teve apenas **6,72% de abstenção** (IDHM 0,599, pop 8.862), enquanto **Codó** registrou **23,23%** (IDHM 0,595, pop 114.275).
- A densidade da rede urbana e o isolamento territorial influenciam a abstenção muito mais do que índices censitários sintéticos.

### 4. Recorte, cálculos, denominadores e exclusões
- **Numerador**: Total de eleitores que não compareceram às urnas no 1º turno de 2024.
- **Denominador**: Eleitores aptos registrados no município (`Participacao_Eleitoral`).
- **Exclusões metodológicas**:
  - **O PIB foi expressamente excluído** desta análise porque a documentação da base não validou se os valores estavam em mil reais ou reais correntes.
  - O IDHM provém do Censo 2010 (Atlas Brasil) e não deve ser tratado como mensuração de 2024.
  - 2 municípios não possuíam correspondência de IDHM histórico (N=1.234).

### 5. Tela e sequência de filtros na aplicação
1. Acesse `#page=perguntas&pergunta=3` (ou *Território e voto* -> *Abstenção e indicadores*).
2. Filtros: Ano: `2024` | Cargo: `VEREADOR` | Métrica: `idhm` (ou `populacao`) | Alvo: `abstencao`.
3. Navegue no gráfico de dispersão com 1.236 pontos municipais.

### 6. Fala sugerida (30–45 segundos)
> *"Na Questão 3, investigamos quem deixa de votar. A sabedoria comum diz que cidades mais ricas votam mais, mas os dados mostram o oposto: a correlação entre IDHM e abstenção é praticamente insignificante. No Rio Grande do Sul, Herveiras e Benjamin Constant do Sul têm exatamente o mesmo IDHM e 2 mil habitantes, mas em uma a abstenção é de 8% e na outra quase 22%. O que realmente se correlaciona com faltar à urna é o tamanho da cidade: nos grandes centros urbanos, o eleitor se sente menos vigiado e menos mobilizado localmente."*

### 7. Interpretação permitida e conclusão indevida
- **Permitido**: Reconhecer a heterogeneidade territorial do engajamento eleitoral e a influência da escala urbana.
- **Indevido**: Afirmar quem são os indivíduos que se abstiveram (falácia ecológica) ou atribuir causalidade socioeconômica individual.

### 8. Fonte e consulta reproduzível
- **Fonte**: TSE (`Participacao_Eleitoral`), IBGE Censo 2022 e PNUD Atlas Brasil 2010 (`Censo_Municipio`).
- **Base**: `pipeline_bdr_der_completo_v4`.
- **Consulta**: Arquivo [q03_territorio.sql](file:///c:/Users/Nicole%20Ellen/Documents/Ciencia%20da%20Computacao/7%20periodo/BDR/frontend/apresentacao/consultas/q03_territorio.sql).

---

## Q04 — Escolaridade de candidaturas e eleitorado

### 1. Padrão agregado sustentado pelos dados
Nas eleições de 2024 (6 UFs), existe um descompasso estrutural severo entre o perfil educacional dos concorrentes e o dos eleitores com 18 anos ou mais:
- **Superior Completo**:
  - Eleitorado apto (18+): 3.525.544 eleitores = **9,27%**.
  - Candidatos a Vereador: 23.861 candidatos = **28,09%** (sobre-representação de **3,03 vezes**; diferença de +18,82 pp).
- **Analfabeto**:
  - Eleitorado apto (18+): 1.441.669 eleitores = **3,79%**.
  - Candidatos a Vereador: exatamente **1 candidato** = **0,001%** (sub-representação quase total).
- **Fundamental Incompleto**: 24,01% dos eleitores (9,1M) vs apenas 10,70% dos candidatos (9,0k).
- **Médio Completo**: é a faixa modal tanto dos candidatos (38,92%) quanto dos eleitores (24,79%).

### 2. Exemplo real ilustrativo
- **Correlação municipal (Dispersão com 1.236 municípios)**:
  - Pearson r = **0,295** e Spearman r = **0,244**.
  - Municípios com eleitorado mais escolarizado tendem a ter proporções maiores de candidatos com diploma universitário, mas em absolutamente todos os 1.236 municípios a proporção de candidatos diplomados supera a proporção de eleitores diplomados.

### 3. Contraponto relevante
- Embora a elite educacional (ensino superior) esteja amplamente sobrerrepresentada, o grupo majoritário das câmaras municipais ainda é composto por pessoas com **Ensino Médio** (38,92% dos candidatos e 45% dos eleitos). As câmaras de vereadores não são compostas exclusivamente por doutores, mas filtram ativamente a base de menor instrução da sociedade.

### 4. Recorte, cálculos, denominadores e exclusões
- **Universo de comparação**: Apenas eleitores aptos com **18 anos ou mais** em 2024, pois candidaturas exigem a maioridade civil como condição de elegibilidade.
- **Denominadores**: 38.019.811 eleitores com instrução conhecida; 84.934 candidatos com instrução conhecida.
- **Exclusões**: 14.060 eleitores sem informação de escolaridade; 1 candidato sem informação; jovens de 16–17 anos retirados do cálculo comparativo.
- **Limitação expressa**: Eleitorado apto **não é população residente** (não inclui estrangeiros, pessoas sem título ou residentes não alistados).

### 5. Tela e sequência de filtros na aplicação
1. Acesse `#page=perguntas&pergunta=4` (ou *Quem faz política* -> *Escolaridade*).
2. Filtros: Ano: `2024` | Cargo: `VEREADOR` | Universo: `18mais`.
3. Alterne entre o gráfico de colunas comparativas e a dispersão municipal dos 1.236 pontos.

### 6. Fala sugerida (30–45 segundos)
> *"Na Questão 4, colocamos frente a frente quem vota e quem quer ser votado em 2024. O contraste é gritante: enquanto menos de 10% do eleitorado possui ensino superior completo, entre os candidatos a vereador esse número passa de 28% — uma presença três vezes maior. No outro extremo, temos quase um milhão e meio de eleitores analfabetos no nosso recorte, mas apenas um único candidato nessa condição. O parlamento municipal brasileiro opera uma filtragem prévia de escolaridade antes mesmo da abertura das urnas."*

### 7. Interpretação permitida e conclusão indevida
- **Permitido**: Afirmar a existência de uma barreira seletiva de escolaridade no recrutamento partidário de candidaturas.
- **Indevido**: Dizer que eleitores diplomados votam apenas em candidatos diplomados, ou igualar o eleitorado apto ao total da população censitária.

### 8. Fonte e consulta reproduzível
- **Fonte**: TSE / Perfil do Eleitorado (`Perfil_Eleitorado_Escolaridade`) e `Candidatura`.
- **Base**: `pipeline_bdr_der_completo_v4`.
- **Consulta**: Arquivo [q04_escolaridade.sql](file:///c:/Users/Nicole%20Ellen/Documents/Ciencia%20da%20Computacao/7%20periodo/BDR/frontend/apresentacao/consultas/q04_escolaridade.sql).

---

## Q05 — Votos de legenda em pleitos proporcionais

### 1. Padrão agregado sustentado pelos dados
Nos pleitos proporcionais das 6 UFs, o voto exclusivo no partido (voto de legenda) vem declinando sistematicamente:
- **Eleição de Vereador**:
  - **2020**: 1.375.177 votos de legenda em 25.327.313 votos válidos = **5,43%**.
  - **2024**: 1.033.456 votos de legenda em 28.018.388 votos válidos = **3,69%** (queda de **-1,74 pontos percentuais** ou retração de 32% na taxa de adesão partidária).
- **Eleição de Deputado Federal**:
  - **2018**: 1.577.830 legenda em 24.304.311 válidos = **6,49%**.
  - **2022**: 1.107.614 legenda em 26.686.561 válidos = **4,15%** (queda de **-2,34 pontos percentuais**).

### 2. Exemplo real ilustrativo (Comportamento do PT)
- **Partido dos Trabalhadores (PT) para Vereador**:
  - **2020**: 129.067 votos de legenda em 1.449.087 votos válidos = **8,91%**.
  - **2024**: 148.306 votos de legenda em 2.058.719 votos válidos = **7,20%**.
  - Apesar de ter sofrido redução percentual (-1,71 pp), o PT conserva uma taxa de fidelidade partidária de legenda que é praticamente o dobro da média geral de todos os concorrentes.

### 3. Contraponto relevante (Comportamento do PL)
- **Partido Liberal (PL) para Vereador**:
  - **2020**: 68.187 votos de legenda em 1.374.119 válidos = **4,96%**.
  - **2024**: 151.315 votos de legenda em 2.682.604 válidos = **5,64%**.
  - Na contramão da média nacional, o voto de legenda do PL **cresceu em termos absolutos (+121,9%) e em taxa percentual (+0,68 pp)**, impulsionado pela nacionalização e polarização da marca da legenda em torno de figuras políticas de projeção nacional.

### 4. Recorte, cálculos, denominadores e exclusões
- **Fórmula**: `votos_legenda / (votos_nominais + votos_legenda)`.
- **Denominador**: Apenas votos válidos destinados a partidos em disputas proporcionais no 1º turno. Votos nulos e brancos ficam fora.
- **Tratamento de fusões**: Fusões e incorporações (como DEM + PSL originando UNIÃO BRASIL) são tratadas estritamente como novos eventos organizacionais e **não são mescladas retrospectivamente**, respeitando a metodologia auditada do projeto.

### 5. Tela e sequência de filtros na aplicação
1. Acesse `#page=perguntas&pergunta=5` (ou *Voto e representação* -> *Votos de legenda*).
2. Filtros: Ano: `2024` | Cargo: `VEREADOR` | Partido: selecione `Todos`, depois filtre por `PT` e `PL`.

### 6. Fala sugerida (30–45 segundos)
> *"Na Questão 5, medimos a força das marcas partidárias através do voto de legenda. O quadro geral é de desidratação partidária: em 2020, 5,4% dos votos para vereador eram na legenda; em 2024, caíram para 3,7%. O eleitor vota cada vez mais no indivíduo e menos na sigla. Contudo, há duas exceções fascinantes: o PT, que preserva historicamente uma taxa de legenda de mais de 7% — o dobro da média —, e o PL, que contrariou a tendência geral e viu seus votos de legenda subirem de 4,9% para 5,6%, impulsionado pela polarização recente."*

### 7. Interpretação permitida e conclusão indevida
- **Permitido**: Identificar tendências de despartidarização da escolha eleitoral e nichos partidários com forte identidade ideológica.
- **Indevido**: Deduzir cadeiras conquistadas diretamente da proporção de votos de legenda, ignorando o peso decisivo dos votos nominais na composição do quociente partidário.

### 8. Fonte e consulta reproduzível
- **Fonte**: TSE / Votação por Partido (`Votos_Partido_Municipio`).
- **Base**: `pipeline_bdr_der_completo_v4`.
- **Consulta**: Arquivo [q05_votos_legenda.sql](file:///c:/Users/Nicole%20Ellen/Documents/Ciencia%20da%20Computacao/7%20periodo/BDR/frontend/apresentacao/consultas/q05_votos_legenda.sql).

---

## Q06 — Eleitorado jovem e dinâmica municipal

### 1. Padrão agregado sustentado pelos dados
Nos 1.236 municípios auditados em 2024:
- A correlação entre a proporção de eleitores jovens (16 a 24 anos) e a taxa municipal de abstenção é praticamente inexistente: **Pearson r = -0,090** e **Spearman r = -0,029**.
- Ter mais ou menos jovens no colégio eleitoral do município não determina se a cidade terá alta ou baixa abstenção agregada.
- O dado revela, contudo, um gigantesco **desnível demográfico regional** nas bases municipais.

### 2. Exemplo real ilustrativo (Os extremos de juventude)
- **Afonso Cunha / MA**:
  - O município com a **maior taxa de eleitorado jovem (16–24 anos)** das 6 UFs: **27,13%** de todos os seus 7.539 eleitores aptos são jovens (2.045 pessoas). A abstenção foi de 13,03%.
- **Guabiju / RS**:
  - O município com a **menor proporção de eleitorado jovem**: apenas **5,87%** de seus 1.430 eleitores aptos têm entre 16 e 24 anos (84 jovens no município inteiro!). A abstenção foi de 7,55%.

### 3. Contraponto relevante
- A proporção de jovens de 16–24 anos em municípios do Maranhão e Ceará chega a ser **quase cinco vezes superior** à de municípios do interior do Rio Grande do Sul. Trata-se do reflexo geográfico da transição demográfica, migração juvenil e envelhecimento populacional sulista, e não de um desinteresse cívico repentino dos jovens gaúchos.

### 4. Recorte, cálculos, denominadores e exclusões
- **Definição de Jovem**: Eleitores aptos com idade entre 16 e 24 anos (soma das faixas `16_17`, `18_20` e `21_24`).
- **Denominador**: Eleitores aptos com idade conhecida em 2024.
- **Cuidados rigorosos**:
  - Analisa **idade do eleitor**, e não idade dos candidatos.
  - Apenas o ano de **2024 está validado** para comparações territoriais; referências históricas anteriores de perfil etário permanecem bloqueadas para evitar distorções quantitativas documentadas.

### 5. Tela e sequência de filtros na aplicação
1. Acesse `#page=perguntas&pergunta=6` (ou *Quem faz política* -> *Eleitorado jovem*).
2. Filtros: Ano: `2024` | Cargo: `VEREADOR` | Faixa jovem: `16_24` | Alvo: `abstencao`.
3. Ordene o mapa municipal ou a lista de registros para inspecionar os extremos de MA e RS.

### 6. Fala sugerida (30–45 segundos)
> *"Na Questão 6, investigamos o peso do eleitorado jovem de 16 a 24 anos. Não encontramos qualquer correlação entre ter mais jovens na cidade e ter maior abstenção nas urnas. O que os dados escancaram é um abismo demográfico territorial no Brasil: em Afonso Cunha, no Maranhão, mais de 27% dos votantes são jovens; já em Guabiju, no Rio Grande do Sul, os jovens não chegam a 6% do eleitorado total. Qualquer análise sobre juventude e política que ignore essa disparidade geográfica cometerá graves erros de diagnóstico."*

### 7. Interpretação permitida e conclusão indevida
- **Permitido**: Identificar as transformações demográficas e a concentração espacial do eleitorado jovem.
- **Indevido**: Afirmar em quem os jovens votaram a partir de dados agregados por município (falácia ecológica).

### 8. Fonte e consulta reproduzível
- **Fonte**: TSE / Perfil do Eleitorado (`Perfil_Eleitorado_Idade`) e `Participacao_Eleitoral`.
- **Base**: `pipeline_bdr_der_completo_v4`.
- **Consulta**: Arquivo [q06_eleitorado_jovem.sql](file:///c:/Users/Nicole%20Ellen/Documents/Ciencia%20da%20Computacao/7%20periodo/BDR/frontend/apresentacao/consultas/q06_eleitorado_jovem.sql).

---

## Q07 — Mudanças partidárias no voto de vereador

### 1. Padrão agregado sustentado pelos dados
Ao comparar o partido que liderou a votação para Vereador em 2020 com o líder em 2024 nos 1.236 municípios:
- **Mudança de organização líder**: ocorreu em **766 municípios (61,97%)**.
- **Mesma organização manteve a liderança**: em **451 municípios (36,49%)**.
- **Fusão ou incorporação organizacional**: em **14 municípios (1,13%)**.
- **Empate de votos**: em **5 municípios (0,40%)**.
- Na maioria expressiva dos municípios das 6 UFs, o partido mais votado nas câmaras municipais mudou de mãos no intervalo de 4 anos.

### 2. Exemplo real ilustrativo (Mudança substantiva)
- **Açailândia / MA**:
  - Em 2020: o **DEM** liderou a votação para vereador com 16,9% dos votos válidos.
  - Em 2024: o **PL** assumiu a liderança municipal com 22,5% dos votos válidos.
  - O índice de volatilidade de Pedersen entre as eleições foi de **54,16%**, demonstrando uma recomposição substantiva do tabuleiro político local.

### 3. Contraponto relevante (Permanência com alta volatilidade interna)
- **Alto Alegre do Pindaré / MA**:
  - O **PP** liderou a votação para vereador tanto em 2020 quanto em 2024 (**Mesma organização líder**).
  - No entanto, a volatilidade interna dos demais partidos atingiu **59,33%**!
  - Demonstra que a manutenção da sigla hegemônica na primeira posição não significa estabilidade das demais forças políticas do município.

### 4. Recorte, cálculos, denominadores e exclusões
- **Cálculo da Volatilidade**: Metade da soma dos valores absolutos das diferenças percentuais de votos de cada organização entre 2020 e 2024 (Índice de Pedersen).
- **Cobertura**: 1.236 municípios com dados válidos de primeiro turno em 2020 e 2024.
- **Cuidados metodológicos**: Siglas históricas e renomeações auditadas são respeitadas; fusões como DEM + PSL -> UNIÃO são rotuladas separadamente e não distorcem artificialmente a contagem de continuidade.

### 5. Tela e sequência de filtros na aplicação
1. Acesse `#page=perguntas&pergunta=7` (ou *Voto e representação* -> *Mudanças partidárias*).
2. Filtros: Ano: `2024` (comparação com 2020) | Cargo: `VEREADOR`.
3. Examine o painel com as quatro categorias de transição e o mapa de volatilidade.

### 6. Fala sugerida (30–45 segundos)
> *"Na Questão 7, analisamos a estabilidade partidária local. Em mais de 62% dos municípios das 6 UFs, o partido que mais recebeu votos para vereador em 2020 perdeu o primeiro lugar em 2024. Mas encontramos uma armadilha metodológica fascinante: em municípios como Alto Alegre do Pindaré, o PP manteve a liderança nos dois pleitos, mas a volatilidade da distribuição interna passou de 59%. Ou seja: a permanência do partido líder no topo frequentemente esconde uma dança profunda de cadeiras e siglas na base do município."*

### 7. Interpretação permitida e conclusão indevida
- **Permitido**: Medir o grau de fragmentação e alternância partidária no controle dos votos proporcionais municipais.
- **Indevido**: Interpretar volatilidade partidária agregada como taxa de indivíduos que mudaram de opinião, ou assumir que troca de sigla equivale a migração ideológica.

### 8. Fonte e consulta reproduzível
- **Fonte**: TSE / Votação por Partido (`Votos_Partido_Municipio`).
- **Base**: `pipeline_bdr_der_completo_v4`.
- **Consulta**: Arquivo [q07_mudancas_partidarias.sql](file:///c:/Users/Nicole%20Ellen/Documents/Ciencia%20da%20Computacao/7%20periodo/BDR/frontend/apresentacao/consultas/q07_mudancas_partidarias.sql).

---

## Q08 — Financiamento de campanha e fundos públicos

### 1. Padrão agregado sustentado pelos dados
Nas eleições de 2024 para Vereador (6 UFs), cruzando o vínculo oficial com a prestação de contas final:
- Das 84.935 candidaturas, **74.387** estão vinculadas a prestação final e **55.340** registraram receitas financeiras positivas.
- Volume total arrecadado: **R$ 603.968.735,68**, sendo **R$ 441.203.437,79 de fundos públicos** (73,05%) e **R$ 162.765.297,89 de recursos privados / próprios** (26,95%).
- **A taxa de sucesso eleitoral por faixa de dependência pública**:
  - **Sem fundos públicos (100% privado/próprio)**: 25.005 candidaturas (24.628 definidas), 6.046 eleitos = **24,55% de taxa de sucesso**.
  - **Até 25% público (recurso misto equilibrado)**: 899 candidaturas, 308 eleitos = **34,34% de taxa de sucesso** (a maior de todas as faixas!).
  - **25% a 50% público**: 2.089 candidaturas, 630 eleitos = **30,20% de taxa de sucesso**.
  - **Mais de 75% público (altamente dependentes)**: 23.709 candidaturas (23.564 definidas), 3.318 eleitos = **14,08% de taxa de sucesso** (a menor taxa de eleição!).

### 2. Exemplo real explicativo
- **Candidaturas com financiamento misto** atingem **34,34%** de vitória porque reúnem o apoio institucional do partido com forte enraizamento local e capacidade de mobilização privada.
- Já a faixa **>75% público** apresenta taxa de vitória de apenas **14,08%** porque as direções partidárias pulverizam quantias irrisórias do Fundo Eleitoral em milhares de candidaturas de preenchimento de cota sem viabilidade eleitoral real.

### 3. Contraponto relevante
- Em cidades médias e pequenas, vereadores de base consolidada frequentemente recusam burocracias de repasse partidário e se autofinanciam ou contam exclusivamente com doações de pessoas físicas, explicando por que candidatos com **0% de fundo público** se elegem quase duas vezes mais (24,55%) do que candidatos dependentes do fundo partidário (14,08%).

### 4. Recorte, cálculos, denominadores e exclusões
- **Fonte auditada**: Arquivo local sanitizado `receitas-candidatos.parquet` (192.128 candidaturas agregadas nas 6 UFs entre 2018 e 2024), mantendo conformidade com o manifesto de procedência oficial.
- **Vínculo**: Vinculação estrita por ano, UF, cargo e sequencial normalizado.
- **Cuidados e limites explícitos**:
  - **Ausência de vínculo não é receita zero**;
  - **Não há conciliação bancária independente** nem rastreamento de repasses em cascata;
  - Não expõe dados pessoais de doadores.

### 5. Tela e sequência de filtros na aplicação
1. Acesse `#page=perguntas&pergunta=8` (ou *Dinheiro e poder* -> *Origem dos recursos*).
2. Filtros: Ano: `2024` | Cargo: `VEREADOR`.
3. Veja o gráfico de composição da receita (público vs privado) e a taxa de sucesso pelas faixas percentuais.

### 6. Fala sugerida (30–45 segundos)
> *"Na Questão 8, examinamos a origem do dinheiro das campanhas. Os fundos públicos responderam por mais de 73% de toda a receita financeira de vereador em 2024. Mas quem depende exclusivamente do fundo público tem uma taxa de vitória de apenas 14%. Já quem combinou apoio partidário com até 25% de recursos próprios ou doações locais teve a maior taxa de sucesso de todas: mais de 34%. O fundo eleitoral garante a chapa, mas sem tração comunitária própria, o dinheiro público sozinho não elege ninguém."*

### 7. Interpretação permitida e conclusão indevida
- **Permitido**: Identificar como a distribuição estratégica de recursos públicos afeta a viabilidade das candidaturas.
- **Indevido**: Presumir que candidatos sem fundo público não gastaram nada, ou afirmar que o sistema faz auditoria contábil de contas bancárias.

### 8. Fonte e consulta reproduzível
- **Fonte**: TSE / Prestação de Contas Final Sanitizada (`receitas-candidatos.parquet`).
- **Base**: `pipeline_bdr_der_completo_v4` + manifesto local.
- **Consulta**: Arquivo [q08_financiamento.sql](file:///c:/Users/Nicole%20Ellen/Documents/Ciencia%20da%20Computacao/7%20periodo/BDR/frontend/apresentacao/consultas/q08_financiamento.sql).

---

## Q09 — Publicidade eleitoral e despesas de campanha

### 1. Padrão agregado sustentado pelos dados
Nas eleições de 2024 para Vereador, o valor total de publicidade eleitoral identificada contratada foi de **R$ 247.671.189,14**:
- **1º Materiais impressos** (santinhos, folhetos, cartazes): **R$ 72.263.242,63** (29,18% de toda a publicidade; 39.181 candidaturas).
- **2º Adesivos e botons**: **R$ 71.295.824,89** (28,79%; 38.219 candidaturas).
- **3º Bandeiras, faixas e banners**: **R$ 34.406.274,42** (13,89%; 21.566 candidaturas).
- **4º Publicidade digital paga** (impulsionamento internet / redes): **R$ 26.994.219,46** (10,90%; 6.225 candidaturas).
- **5º Produção audiovisual**: **R$ 20.896.214,18** (8,44%).
- **Propaganda de rua física (impressos + adesivos + bandeiras)** responde por **71,86%** de toda a publicidade contratada no nível municipal proporcional.

### 2. Exemplo real ilustrativo
- Em eleições proporcionais municipais, o impulsionamento digital pago (10,90%) é amplamente superado pelo gasto com material impresso e adesivos (57,97%). O contato tátil de rua continua sendo a linguagem prioritária da política de vereança brasileira.

### 3. Contraponto relevante
- Em grandes disputas majoritárias (como Prefeito em capitais), a **produção audiovisual** e o **impulsionamento digital** chegam a assumir mais de 50% dos investimentos, evidenciando uma cisão completa de estratégia entre pleitos majoritários de TV/redes e pleitos proporcionais de bairro.

### 4. Recorte, cálculos, denominadores e exclusões
- **Classificação**: Normalização de despesas eleitorais baseada nas descrições originais registradas na nota fiscal / recibo eleitoral.
- **Status de revisão**: Dos R$ 72,2M em materiais impressos, R$ 60,8M dependem de termos em processo contínuo de auditoria textual.
- **Cuidados indispensáveis**:
  - Materiais selecionados **não equivalem ao orçamento total** da campanha;
  - Despesa contratada **não mede alcance, visualizações ou impacto**;
  - Publicidade não pode ser tratada como causa única de vitória.

### 5. Tela e sequência de filtros na aplicação
1. Acesse `#page=perguntas&pergunta=9` (ou *Dinheiro e poder* -> *Publicidade eleitoral*).
2. Filtros: Ano: `2024` | Cargo: `VEREADOR` | Critério: *Categorias sugeridas*.
3. Explore a Nuvem de Palavras interativa com escala de calor (heat map) e pesquise candidatos por ordem alfabética.

### 6. Fala sugerida (30–45 segundos)
> *"Na Questão 9, investigamos onde o dinheiro da campanha realmente vai parar. Embora se fale muito em redes sociais e algoritmos, na eleição de vereador o papel ainda reina soberano: mais de 71% de todo o gasto em publicidade vai para santinhos impressos, adesivos de carro e bandeiras de rua. O impulsionamento digital pago representou menos de 11% dos gastos no nosso recorte. A campanha proporcional brasileira ainda é uma campanha física, feita de papel na mão e adesivo no peito."*

### 7. Interpretação permitida e conclusão indevida
- **Permitido**: Mapear as modalidades prioritárias de contratação de propaganda eleitoral.
- **Indevido**: Confundir gastos em publicidade com causa determinante do resultado, ou supor que quem gastou mais em santinhos teve maior número de votos.

### 8. Fonte e consulta reproduzível
- **Fonte**: TSE / Despesas de Campanha (`Despesa_Candidatura`).
- **Base**: `pipeline_bdr_der_completo_v4` + motor de normalização BDR.
- **Consulta**: Arquivo [q09_publicidade.sql](file:///c:/Users/Nicole%20Ellen/Documents/Ciencia%20da%20Computacao/7%20periodo/BDR/frontend/apresentacao/consultas/q09_publicidade.sql).

---

## Q10 — Trajetórias eleitorais e longevidade política

### 1. Padrão agregado sustentado pelos dados
No universo de 353.400 pessoas com identificadores auditados e consistentes nas 6 UFs entre 2002 e 2024:
- **Uma eleição observada**: **238.716 pessoas (67,55%)**. Apenas 7.790 venceram (taxa de sucesso de míseros **3,26%**). Mais de dois terços dos concorrentes entram, perdem e nunca mais retornam ao registro eleitoral.
- **Sequência contínua (sem intervalo > 4 anos)**: **85.659 pessoas (24,24%)**. Somam 29.227 vitórias (taxa de eleição de **34,12%**).
- **Retorno com intervalo maior que 4 anos**: **29.025 pessoas (8,21%)**. Somam 5.805 vitórias (taxa de eleição de **20,00%**).
- Pessoas com trajetória contínua têm probabilidade de vitória **10 vezes maior** do que concorrentes de eleição única.

### 2. Exemplo real ilustrativo (Carreira com consistência de identidade)
- **Abdias Gomes (id: `3bcb82518785cd378da3bc17948e64ab`)**:
  - **6 eleições observadas**: 2004, 2008, 2012, 2016, 2020 e 2024.
  - **4 vitórias eleitorais** registradas.
  - Concorreu para 2 cargos distintos, passando por 4 siglas partidárias ao longo de duas décadas de vida pública ativa.

### 3. Contraponto relevante (Retorno após longo hiato)
- **Aarão (id: `94aa4a8e1c858dfd68aa61c844091659`)**:
  - **5 eleições observadas**: 2004, 2008, 2016, 2020 e 2024.
  - Passou por um hiato de **8 anos sem registro eleitoral** entre 2008 e 2016, retornando com sucesso e acumulando 3 vitórias e 5 siglas partidárias.
- O contraponto maior é a grande massa: 67,55% das pessoas catalogadas abandonam as disputas após uma única derrota, demonstrando que a política profissional brasileira é dominada por um núcleo diminuto de concorrentes recorrentes.

### 4. Recorte, cálculos, denominadores e exclusões
- **Auditabilidade de Identidade**: Filtro em `Candidato` exigindo no máximo um título eleitoral e uma data de nascimento consistentes (`COUNT(DISTINCT titulo) <= 1 AND COUNT(DISTINCT nascimento) <= 1`).
- **Limites da série**:
  - Janela temporal delimitada entre **2002 e 2024** e circunscrita a **6 UFs**.
  - Um primeiro registro em 2004 **não prova que foi a estreia** na política (pode ter disputado nos anos 1990);
  - Ausência após 2020 **não prova abandono** (pode ter assumido cargo executivo ou concorrido em outro estado);
  - Candidatura registrada **não comprova mandato efetivamente exercido**.

### 5. Tela e sequência de filtros na aplicação
1. Acesse `#page=perguntas&pergunta=10` (ou *Quem faz política* -> *Trajetórias*).
2. Filtros: Ano: `2024` | Cargo: `VEREADOR`.
3. Acesse a visualização do Fichário de Trajetórias para folhear as fichas individuais dos concorrentes.

### 6. Fala sugerida (30–45 segundos)
> *"Na Questão 10, encerramos a jornada olhando para as pessoas que fazem a política. Analisamos mais de 350 mil trajetórias ao longo de duas décadas. Mais de 67% de todas as pessoas que se candidatam disputam uma única vez, perdem e nunca mais voltam — para elas, a taxa de sucesso é de apenas 3%. A política vitoriosa é uma atividade de sobrevivência e persistência: os candidatos que mantêm participação recorrente vencem dez vezes mais. Casos como o de Abdias Gomes, com seis eleições consecutivas e quatro vitórias, ilustram a construção profissional de um espaço que quase ninguém consegue sustentar."*

### 7. Interpretação permitida e conclusão indevida
- **Permitido**: Descrever os padrões empíricos de permanência, desistência e reincidência na arena eleitoral formal.
- **Indevido**: Tomar o acervo de candidaturas como histórico completo de mandatos ou tratar a ausência de registro na base como aposentadoria definitiva.

### 8. Fonte e consulta reproduzível
- **Fonte**: TSE / Cadastro de Candidatos (`Candidato`), `Candidatura` e `Resultado_Candidatura`.
- **Base**: `pipeline_bdr_der_completo_v4`.
- **Consulta**: Arquivo [q10_trajetorias.sql](file:///c:/Users/Nicole%20Ellen/Documents/Ciencia%20da%20Computacao/7%20periodo/BDR/frontend/apresentacao/consultas/q10_trajetorias.sql).
