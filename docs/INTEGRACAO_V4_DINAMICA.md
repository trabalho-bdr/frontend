# Integração dinâmica com a v4

## Auditoria e conexão

O frontend é React/Vite em `src`, com painéis adicionais em `integrations/bdr`.
A API principal é FastAPI em `server/app.py`, iniciada por `server/run.py`.
O proxy de desenvolvimento encaminha `/api` para a porta 8000.

O compartilhamento anteriormente configurado não foi encontrado pela conta disponível.
A conexão ao workspace também falhava ao anexar `INVALID`. Foi confirmado acesso
direto ao banco **pipeline_bdr_der_completo_v4**, com o esquema `main`.
A inicialização usa `attach_mode=single` e `read_only=True`. As consultas usam
diretamente `pipeline_bdr_der_completo_v4.main`, sem alias ou tradução em `_rows`.
O banco remoto não foi modificado. Nenhuma operação de Git foi executada.

`MOTHERDUCK_TOKEN` continua exclusivamente no ambiente do servidor.
`MOTHERDUCK_DATABASE`, se definido, deve ser `md:pipeline_bdr_der_completo_v4`.
O caminho antigo de compartilhamento deixa de ser necessário para esta conexão.

## Mudanças funcionais

- Remoção dos fallbacks quantitativos em Home, histórias editoriais, patrimônio,
  custo por cadeira, ranking, dispersão, Fichário, Mural, despesas e descobertas.
- Catálogo institucional separado das antigas referências quantitativas.
- Contexto compartilhado na URL: eleição, cargo, UF, município, partido,
  candidatura e demais campos investigativos. Mudança para disputa estadual
  remove filtros municipais de cadeiras e ajusta o ano ao cargo.
- Filtros compartilhados com opções obtidas da API, incluindo municípios e siglas.
- Conexões declarativas entre ambientes, com dependências de dados e filtros.
- Filtros de partido e município aplicados antes das agregações de gastos,
  patrimônio, escolaridade e votos/eleitos por partido.
- Exemplos proporcionais selecionados pelo banco, pela maior diferença de votos
  entre um não eleito/suplente e um eleito da mesma disputa; nomes não são fixos.
- Linha do tempo com patrimônio, escolaridade, idade calculada na eleição e
  resumo das candidaturas, vitórias, siglas e cargos observados.
- Resultados longitudinais deduplicados pelo último turno observado da disputa.
- Mapa de manutenção/troca da sigla líder reaproveita o GeoAtlas. Comparações
  respeitam vereador 2020/2024 e deputados 2018/2022; empates são excluídos.
- IDHM retirado dos controles editoriais e do mapa principal.
- Controles de dados simulados desativados nos painéis legados.
- Cache de consultas por SQL/parâmetros: 60 segundos, até 128 entradas.
- Erros públicos de conexão não reproduzem mensagens internas ou credenciais.

Arquivos históricos de referência permanecem no repositório para testes e
documentação. Eles não devem ser reintroduzidos como fallback de produção.

## Endpoints

Arquivos com alterações funcionais nesta entrega:

- Backend: `server/app.py`, `server/indicadores.py`, `server/exhibition.py`,
  novo `server/contexto.py`.
- Navegação e serviços: `src/App.jsx`, `src/data/client.js`,
  `src/data/exhibition.js`, `src/data/questao1Client.js`, novos
  `src/data/catalog.js`, `src/data/investigationContext.js` e
  `src/components/InvestigationContext.jsx`.
- Histórias: `src/components/exhibition/Story.jsx`, `LegendaInvestigation.jsx`,
  `PeopleStory.jsx`, `PartyStory.jsx`, `SpendingStory.jsx`, `TerritoryStory.jsx`,
  `PublicityInvestigation.jsx`, `ProportionalStory.jsx`, `CandidateTimeline.jsx`
  e `exhibition.css`.
- Ambientes: `src/pages/HomeEditorial.jsx`, `ArchivePart.jsx`,
  `MuralCampanhas.jsx`, `PrestacaoDeContas.jsx`, `Descobertas.jsx`,
  `Adesivaria.jsx`, `ExhibitionMethod.jsx`.
- Componentes e mapas: `src/components/GeoAtlas.jsx`, `PatrimonioMapaDossie.jsx`,
  `ComparisonPanel.jsx`, `src/atlas/data.js`, `src/atlas/geography.js`,
  `src/adesivaria/model.js`, `integrations/bdr/App.tsx`,
  `integrations/bdr/PainelPatrimonio.tsx`.
- Verificação: `scripts/validate_live.py`, `tests/context.test.mjs`,
  `tests/test_motherduck_connection.py`, `tests/atlas.test.mjs`,
  `tests/exhibition.test.mjs`, `tests/questao1.test.mjs`,
  `tests/questao2.test.mjs`, `tests/adesivaria-ranking.test.mjs`.

Novo: `GET /api/contexto/opcoes?ano=&cargo=&uf=`.

Ampliados/corrigidos:

- `/api/health`, `/api/diagnostico`, `/api/indicadores/diagnostico`.
- `/api/candidates`: município, pessoa vinculada, primeiro turno e seis UFs.
- `/api/exposicao/partidos`, `/gastos`, `/patrimonio`, `/escolaridade`:
  parâmetros `ano`, `cargo`, `uf`, `partido`, `municipio`.
- `/api/exposicao/transicoes`: `uf` e `cargo`, com pares temporais compatíveis.
- `/api/exposicao/proporcional`: seleção dinâmica no recorte solicitado.
- `/api/exposicao/trajetoria/{id}`: histórico individual ampliado.
- `/api/indicadores/trajetorias`: último turno e deduplicação por disputa.
- `/api/bdr/*`: reutilização da conexão real corrigida.

Foram reutilizados os endpoints existentes de Questão 1, Questão 2,
Adesivaria, legenda e participação territorial. Não foi criada uma nova página
genérica de investigações.

## Definições

Gasto agregado por cadeira é a soma de despesas conhecidas de todas as
candidaturas do recorte dividida pelas candidaturas eleitas. Mediana dos eleitos
usa apenas despesas conhecidas dos eleitos. Taxas por faixa usam resultados
definidos no denominador. Quartis de patrimônio usam valores não negativos,
com cobertura apresentada separadamente. NULL não representa zero.

As situações `ELEITO`, `ELEITO POR QP` e `ELEITO POR MÉDIA` foram encontradas
na consulta real. `SUPLENTE` integra o universo definido, mas não as cadeiras.
`NÃO ELEITO` é derrota conhecida. Códigos nulos, registros negados, renúncias e
outros resultados ficam fora dos denominadores que exigem resultado definido.

Valores monetários são nominais. Votos de legenda são divididos pela soma de
votos nominais e de legenda. Nenhuma métrica reconstrói a distribuição oficial
de vagas ou demonstra causalidade. A identidade longitudinal segue o
`id_candidato` do acervo; ela não demonstra exercício de mandato ou aposentadoria.
Receitas por origem permanecem indisponíveis e não são inferidas de despesas.

## Validação reproduzível

`python scripts/validate_live.py` usa as credenciais locais, importa a aplicação
real e chama os endpoints com TestClient. Não injeta respostas simuladas.
O processo sai com erro caso qualquer endpoint não retorne HTTP 200.

`artifacts/live-validation.json` contém o esquema consultado, cada endpoint,
respostas agregadas, SQL e parâmetros efetivamente encaminhados à camada de
consulta, sem tokens. Inclui resultados, despesas, patrimônio, escolaridade,
continuidade, território, transições, legenda, eleitos, opções de contexto,
trajetória individual e os painéis legados.

Testes unitários: `python -m unittest discover -s tests -p 'test_*.py'`.
Frontend: `node --test tests/*.test.mjs`. Build: `npm.cmd run build`.
Os testes antigos que exigiam snapshots na indisponibilidade foram atualizados
para exigir ausência explícita de dados; fixtures continuam restritas aos testes.

## Limites da entrega e operação local

O navegador integrado informou indisponibilidade, impedindo inspeção visual e
validação manual de responsividade/acessibilidade. O CSS responsivo e os
controles acessíveis existentes foram preservados; isso não substitui uma
auditoria visual completa. O build ainda informa chunks grandes de Three.js.

Já havia um processo ocupando a porta 8000. Ele não foi encerrado. Reinicie a
API existente para que o site de desenvolvimento carregue o backend alterado.
As consultas do relatório usam a aplicação atual diretamente, independentemente
desse processo antigo.

A entrega não equivale à conclusão integral de todos os critérios do pedido:
ainda faltam validação visual, auditoria longitudinal independente das identidades,
validação documental das unidades econômicas e uniformização completa dos filtros
nos aprofundamentos legados. O mapa de participação principal mantém seu recorte
editorial explicitado; as análises de receitas continuam dependendo de importação.
