# Catálogo de pessoas, candidaturas e territórios

## Entradas e integração

- `#page=candidatos`: pesquisa paginada de candidaturas, com acesso ao perfil da pessoa.
- `#page=arquivo&story=perfil&q1_pessoaId=...&q1_candidaturaId=...`: perfil dentro do Fichário existente.
- `#page=territorios`: seis estados consultados no banco, com seus municípios.
- `#page=territorios&story=municipio&q1_uf=...&q1_municipioId=...`: perfil eleitoral municipal.

As entradas **Candidatos** e **Estados e municípios** foram acrescentadas à navegação principal.
O Fichário 3D mantém sua interface e passa a oferecer acesso ao mesmo perfil completo.
Plenário e Adesivaria também podem abrir esse perfil. Os vínculos para outros ambientes
preservam os filtros compatíveis; transformações de ano ou território são informadas.
Nenhuma tabela foi reintroduzida na interface.

O catálogo guarda busca, filtros, ordenação e página na URL. Voltar do perfil recupera
inclusive a opção “todos os anos”. Pessoa (`id_candidato`) e candidatura
(`id_candidatura`) têm campos distintos. O link para a Prestação de Contas identifica
a candidatura exata e pode ser recarregado sem selecionar outra pessoa por engano.

## Dados e definições

Todas as consultas usam `pipeline_bdr_der_completo_v4.main`, pela conexão de leitura
do backend. Não há SQL no navegador nem fallback para snapshots ou listas de pessoas.

O período é 2002–2024, com cobertura de CE, MA, MS, RJ, RN e RS. Anos, cargos,
municípios, siglas e opções demográficas são consultados no banco. Nomes de estados
e textos institucionais são metadados editoriais, não substitutos de resultados.

A camada do catálogo consolida o último turno observado de cada pessoa, ano, cargo
e território de disputa. Resultados duplicados são agregados antes das demais junções;
situações conflitantes ficam indefinidas. As vitórias seguem `ELEITO`, `ELEITO POR QP`
e `ELEITO POR MÉDIA`. Suplência, derrota e resultado indefinido permanecem distintos.
Quantidade de vitórias não comprova quantidade de mandatos exercidos.

Vereador e prefeito são delimitados por município; deputados pela UF. Votos municipais
de deputados são uma análise territorial, sem atribuição de cadeiras ao município.
Ordenar por despesa exige ano, cargo e território comparáveis. A ordenação por votos
é oferecida em disputas sem segundo turno, evitando comparar votos de turnos distintos.
Busca por número também exige esse contexto: o número não é identificador da pessoa.

A idade é calculada com nascimento e data da eleição, incluindo o ajuste do aniversário.
O nascimento não é enviado ao cliente. Escolaridade e situação de registro são da
candidatura; ocupação, gênero e raça/cor são do cadastro da pessoa, sem garantia de
referência histórica por eleição. Essa distinção é informada no perfil e nos filtros.

O patrimônio usa o consolidado confiável de cada candidatura. Ausência não é zero.
Não foram vinculados bens individuais sem validação da correspondência item a item.
Despesas mostram o consolidado, categorias originais e comparação com o mesmo pleito,
cargo e território. Valores históricos são nominais e não informam origem das receitas.

## Fotografias e identidade

`Foto_Candidato` e `Perfil_Eleitorado_Municipio` foram inspecionadas diretamente.
A auditoria registra cobertura, tipos de colunas, duplicações e valores inválidos.

Fotos só são disponibilizadas quando há correspondência exata de pessoa, ano, UF e
sequencial da candidatura, metadados de imagem e fonte HTTPS oficial do TSE.
O endpoint binário confere assinatura JPEG/PNG e SHA-256. A lista não baixa BLOBs.
Imagens ausentes ou rejeitadas usam iniciais neutras; não se utiliza foto de outro ano.
Se a tabela opcional não existir, o catálogo continua sem fotografias.

Perfis não são reunidos por semelhança de nomes. Antes de reunir candidaturas por
`id_candidato`, o backend rejeita conflitos internos de documento ou nascimento.
Esse controle não equivale a uma auditoria independente das identidades da fonte.
CPF, título eleitoral, sequencial de origem e nascimento não aparecem nas respostas
do catálogo. Identificadores internos de pessoa e candidatura são usados na navegação.

## Territórios e limites

Estados e municípios são carregados dinamicamente, com paginação e busca sem acentos.
O município reúne população com ano de referência, participação, comparecimento,
abstenção, votos nominais, votos de legenda e liderança partidária, incluindo empates.
O catálogo de candidaturas municipais pode ser aberto diretamente dessa ficha.

PIB permanece na unidade original do acervo, explicitamente identificada; não é
convertido para reais nem usado para calcular PIB per capita sem validação documental.
A cobertura do perfil do eleitorado é informada, mas não foi convertida em distribuições
populacionais ou comparações com candidatos sem validação dos denominadores.

## Endpoints criados

Todos aceitam somente GET:

- `/api/catalogo/opcoes?ano=&uf=&cargo=`: cobertura e opções coerentes com o recorte.
- `/api/catalogo/candidaturas`: busca, filtros combinados, total, ordenação e paginação.
- `/api/catalogo/pessoas/{id}?candidatura={id}`: trajetória e candidatura selecionada.
- `/api/catalogo/candidaturas/{id}`: resolve a pessoa a partir de uma candidatura.
- `/api/catalogo/fotos/{id}`: fotografia validada da candidatura, sem URL externa no cliente.
- `/api/catalogo/estados`: cobertura dos seis estados.
- `/api/catalogo/estados/{uf}/municipios?q=&limit=&offset=`: índice municipal paginado.
- `/api/catalogo/municipios/{id}?ano=&cargo=`: perfil eleitoral municipal.

Filtros de candidaturas: `q`, `ano`, `uf`, `cargo`, `municipio`, `partido`, `resultado`,
`escolaridade`, `genero`, `raca`, `ocupacao`, `idade_min/max`, `gasto_min/max`,
`patrimonio_min/max`, `recorrencia`, `ordem`, `limit`, `offset`.

Há consultas parametrizadas, limite de 36 candidaturas por resposta (12 por padrão),
contagem separada e cache de curta duração já existente no backend. Requisições
obsoletas são canceladas; buscas aguardam uma breve pausa na digitação.

## Arquivos

Novos:

- `server/catalogo.py`.
- `src/pages/CandidateCatalog.jsx`, `PersonProfile.jsx`, `TerritoryCatalog.jsx`.
- `src/catalog/useCatalog.jsx`, `logic.js`, `Portrait.jsx`, `catalog.css`.
- `tests/test_catalog.py`, `tests/catalog-context.test.mjs`.
- `scripts/audit_catalog.py`, `scripts/validate_catalog.py`.

Integração alterada:

- `server/app.py`: registro das rotas.
- `src/App.jsx`: navegação, perfil no Fichário e links persistentes.
- `src/data/investigationContext.js`: contexto histórico e territorial.
- `src/pages/ArchivePart.jsx`: acesso ao perfil único.
- `src/components/exhibition/TerritoryStory.jsx`: leitura do ano territorial compatível.

## Verificação

- `python scripts/audit_catalog.py`: esquema e qualidade, somente leitura.
- `python scripts/validate_catalog.py`: aplicação FastAPI atual contra o MotherDuck real.
- `python -m unittest discover -s tests -p 'test_*.py'`.
- `node --test tests/*.test.mjs`.
- `npm.cmd run build`.

Os relatórios `artifacts/catalog-schema-audit.json` e
`artifacts/catalog-live-validation.json` guardam SQL, parâmetros e resultados seguros,
sem credenciais nem números de documentos. Foram exercitados busca histórica,
filtros, paginação, perfil, foto oficial, estados e município. Também foi verificado
o acesso às rotas pelo proxy utilizado pelo frontend.

O navegador integrado estava indisponível: não foi possível concluir inspeção visual
manual. O CSS inclui layouts para desktop e celular e os controles são nativos,
com foco visível, estados de carregamento e possibilidade de repetir a consulta.
O build continua a alertar sobre os chunks grandes preexistentes de Three.js.

O anexo recebido termina no título da seção F. A implementação cobre o escopo
efetivamente fornecido, sem pressupor requisitos de uma continuação não recebida.
Não foram feitas operações de Git nem alterações no banco remoto.
