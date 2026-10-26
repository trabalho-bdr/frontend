# Dez perguntas: implementação e evidências

Atualização: 25/10/2026.

## Entregas

- Entrada As dez perguntas na navegação e na capa; links antigos e ambientes temáticos conectados às análises novas.
- Q1: despesa de todos por eleito, apenas eleitos por eleito e mediana individual; série nominal e corrigida por IPCA de dezembro a dezembro, base dez/2024.
- Q2: patrimônio zero separado; faixas positivas com empates preservados; resultados definidos, tamanhos de grupos e intervalos de Wilson nas fichas.
- Q3: indicadores municipais versus abstenção ou participação da sigla selecionada; Pearson/Spearman e fichas por município. IDHM lido diretamente da referência 2010. PIB não foi usado sem validação de unidade.
- Q4: distribuição educacional e comparação municipal entre candidaturas e eleitorado, com universos etários e exclusões explícitos.
- Q5: votos de legenda por ano, denominadores agregados e opção de acompanhar renomeações sem juntar fusões.
- Q6: participação jovem do eleitorado e associação territorial, sem inferir voto individual.
- Q7: volatilidade da distribuição, liderança e eventos organizacionais, sem converter cores/siglas em ideologia.
- Q8: receitas financeiras oficiais de 2018/2020/2022/2024 importadas para seis UFs em arquivo local sanitizado. 192.128 candidaturas agregadas; sem nomes/documentos de doadores. Vínculo por ano, UF, cargo e sequencial normalizado. Ausência de vínculo não é zero.
- Q9: investigação existente de publicidade integrada ao índice, com classificação revisável e proteção de recortes incompatíveis.
- Q10: seleção de coorte pelo recorte e histórico em todos os cargos nas seis UFs; sequências, intervalos, múltiplos cargos e mudanças organizacionais com renomeações/eventos conhecidos excluídos.

## Limites que continuam explícitos

Perfil do eleitorado liberado para comparação em 2024. Referências 2018/2020/2022 permanecem em validação; 2022 apresentou divergência quantitativa em 1.215 municípios. Escolaridade da população residente não foi importada e não é confundida com escolaridade do eleitorado.

Financiamento é uma resposta descritiva parcial: origem declarada, somente receitas financeiras finais/regularização, exclusão de recibos conflitantes e cobertura por vínculo. Não há conciliação independente com extratos/devoluções nem rastreamento integral de repasses. Os números de exclusões e hashes são acessíveis nas fontes da análise.

Trajetória é limitada por 2002–2024 e seis UFs. Uma eleição observada não prova estreia; ausência posterior não prova abandono. Candidaturas não comprovam mandatos.

## Fontes e reprodução

MotherDuck v4 somente leitura; nenhuma tabela/view remota alterada. Fontes adicionais oficiais em server/data/receitas-manifest.json e server/data/ipca.json. Atualização pelos scripts server/scripts/refresh_receitas.py e refresh_ipca.py. Regras em server/data/README.md.

## Verificação

Suíte ampla: 163 testes backend passaram antes do teste adicional da referência 2010; suíte específica final: 16 testes de pesquisa passaram, incluindo a regressão adicional. Testes JS: 84 passaram na validação de integração; recompilação final concluída. Verificadas consultas reais, série de partido selecionado e histórico opcional, receita vinculada, estados em validação, navegação e celular sem rolagem horizontal.

Exemplo de conferência PT/MA/Vereador 2024: 719 candidaturas, 600 vinculadas a prestação final, 388 com receita financeira positiva. Esses números descrevem o recorte e não são uma auditoria contábil.

## Organização temática revisada

A navegação principal apresenta os temas. As perguntas orientam as análises dentro das seções; o índice da pesquisa fica como apoio no menu do acervo. Dinheiro e poder reúne custo (linha temporal), patrimônio (bolhas), origem dos recursos (composição circular + taxas) e publicidade (grupos e categorias). Quem faz política possui caminhos para escolaridade, eleitorado jovem e trajetórias. Os links da pesquisa levam aos ambientes temáticos, preservando URLs diretas antigas.


## Aprofundamento das análises — 25/10/2026

As perguntas incorporadas às seções temáticas recebem o painel “Do panorama aos casos”. Os modos disponíveis dependem do cargo e da pergunta: mapa municipal, comparação A/B, busca de registros, busca de pessoas e Plenário. A publicidade mantém a investigação própria de materiais e lançamentos.

- Mapas de custo, patrimônio, escolaridade, eleitorado, votos de legenda, volatilidade e receitas usam o indicador da análise, escalas fixas e ausência separada de zero. O Brasil inicial mostra cobertura; a UF abre os municípios.
- Comparação permite ano, UF, município e partido B, mantendo o cargo A. Identifica os universos e não calcula diferenças para evidência em validação.
- Gráficos de dispersão e série financeira permitem abrir os registros. A conferência também funciona por busca textual, sem depender do gráfico.
- O Plenário usa resultados reais do endpoint de eleitos, até 72 por votos. O município é obrigatório para vereador. A cor muda entre partido, despesa, patrimônio e escolaridade; a lista de nomes oferece alternativa ao 3D. Não representa candidatos não eleitos nem ocupantes atuais.
- A cadeira abre a pessoa e sua candidatura correta por identificadores. A busca de pessoas preserva os filtros; inclui registros sem o indicador conhecido.
- O modo escolhido permanece ao trocar UF ou município. Consultas são carregadas sob demanda e não recebem dados de demonstração como substituição.

Validação: 167 testes Python, 92 testes JavaScript e compilação Vite. Verificação no navegador: mapa financeiro MA/Timon, comparação A/B, 21 cadeiras de Timon/2024, cores por despesa, seleção nominal e abertura do perfil histórico de Clara Prado.


## Navegação financeira consolidada

A barra Contas de campanha / Adesivaria / Gastos e cadeiras foi retirada. Dinheiro e poder mantém quatro explorações. Publicidade renderiza uma única investigação geral e oferece a Adesivaria, sem repetir sua síntese. Custo reúne os aprofundamentos de taxas de sucesso e perfis. Lançamentos individuais abrem por candidatura ou pelo botão de conferência, com retorno à seção. Rotas antigas de Adesivaria e Plenário financeiro resolvem para as explorações equivalentes e preservam os parâmetros; Plenário de votos e vagas permanece no tema de representação. Validação: 94 testes JavaScript, build Vite e fluxos conferidos no navegador.


## Explorações dos demais temas

Os temas Mapa, Pessoas e Voto usam o cabeçalho e os cartões do formato financeiro, com leitura guiada e limites explícitos. As perguntas 03, 04, 05, 06, 07 e 10 são conteúdo principal. Atlas, Fichário, Mural e comparação recente de votos de legenda são aprofundamentos sob demanda. O tema Voto também oferece representação por partido e explicação de vagas proporcionais. Os filtros próprios das perguntas permanecem em cada análise; a barra de ambientes foi substituída pelos cartões. Validação: 95 testes JavaScript e build Vite.

Fichário simplificado: integrado à seção Trajetória do perfil como alternativa à linha do tempo. Ficha frontal com foto e resumo eleitoral, divisórias por candidatura e animação curta com suporte a movimento reduzido. Links anteriores arquivo/fichario abrem o perfil nesta visualização. A seleção permanece entre formatos. A cena separada e o giro deixam de fazer parte deste fluxo. Verificado no navegador com 2020/2024 e largura de 375 px.
