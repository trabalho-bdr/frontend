# Arquivo da Democracia — v10 | Comparações dentro do portal

**Novidade:** sistema único de gráficos interativos e tabelas integrado às seções **já existentes**, sem alterações na identidade nem novas opções de navegação. Inclui evolução temporal do voto de legenda por partido, abstenção por UF, gasto agregado por eleito, escolaridade, patrimônio, categorias de propaganda e comparações entre fichas e municípios. Oferece filtros, tabela e CSV. Os dados ao vivo vêm de agregações somente-leitura do acervo; há snapshot auditado com recortes limitados quando a API não está conectada.

**Veja os detalhes, limites e filtros em [`docs/COMPARACOES_V10.md`](docs/COMPARACOES_V10.md).**

# Arquivo da Democracia — v9 | Fichário indexado 3D e documentos fiscais

Esta versão substitui **a cena do armário de gavetas** por uma **caixa horizontal de fichas indexadas** como a referência enviada. A interface gráfica geral foi preservada.

## Correções desta versão

- **Plenário 3D restaurado:** corrigido import ausente de `Text` em `src/components/Plenario3D.jsx`, que fazia o erro de runtime acionar a visualização plana. Mesa diretora elevada, tribuna, bancadas semicirculares e 72 assentos interativos permanecem 3D. As cores dos blocos são **meramente cenográficas**, pois não há classificação partidária/ideológica validada.
- **Caixa de fichas 3D:** `src/components/Arquivo3D.jsx` é uma caixa horizontal de metal com papel e divisórias por ano, partido, cargo ou estado. As divisórias mudam de página: não há limite artificial de seis partidos. A busca paginada encontra uma candidatura; a ficha sai da caixa no espaço 3D, com número, partido, nome, resultado e verso com os dados. Clique na ficha para virá-la; botões permitem comparar ou ver gastos. O fallback sem WebGL reproduz uma caixa em perspectiva, não uma tabela vazia.
- **Folhas fiscais:** `src/pages/PrestacaoDeContas.jsx` abre os lançamentos diretamente ao escolher a campanha. Cada registro é diagramado como uma folha de prestação de contas, com categoria, valor e identificação da campanha. **Não é nota fiscal original**. A base não fornece XML/PDF/DANFE, chave de acesso, fornecedor ou data; esses campos são explicitamente marcados como indisponíveis, nunca fabricados.
- **Todos os lançamentos acessíveis pela API:** `server/app.py` agora expõe paginação de despesas (`limit`, `offset`, `categoria`) para folhear os registros completos de uma candidatura com a conexão ao vivo. A prévia desconectada permanece uma amostra.
- **Restante do portal preservado:** TV, atlas GeoJSON municipal, mural, Adesivaria, Descobertas e dez investigações.

## Executar

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Sem configurar a API, o site oferece uma amostra arquivada auditada, limitada, com exemplos de lançamentos e candidaturas reais.

### Consultar o acervo completo no MotherDuck

O token fica **somente no servidor**, nunca no navegador. No diretório `server/`, copie `.env.example` para `.env`, preencha suas próprias credenciais e execute:

```bash
python -m pip install -r server/requirements.txt
python server/run.py
```

Execute o React no outro terminal com `npm run dev`. O proxy Vite redireciona `/api` ao backend. O backend é somente-leitura e usa o compartilhamento `pipeline_bdr_der_completo_v3`.

**Cobertura:** 608.587 candidaturas, 1.236 municípios dos seis estados CE, MA, MS, RJ, RN, RS; **não representa todos os municípios do Brasil**. A busca de candidaturas e os documentos fiscais individuais são paginados para não carregar a base inteira no navegador. A interface não mostra informações técnicas sobre MotherDuck.

## Limites e interpretação

- A apresentação lembra um documento fiscal, mas **não equivale a uma nota fiscal verdadeira**. Sem arquivo fiscal original seria incorreto gerar número de nota, QR Code de autorização, fornecedor ou data de emissão fictícios.
- Votos, gastos e bens exibem `Não informado` quando ausentes; ausência não é zero. O arquivo v3 não oferece perfil etário de eleitores nem discriminação da origem de financiamento público/privado, portanto os estudos correlatos seguem parciais.
- A animação 3D depende de navegador com WebGL ativado. Se desativado, há uma alternativa visual navegável. Não há necessidade de recursos externos adicionais para a modelagem do fichário.

## Testes

```bash
npm run build
node --test tests/*.test.mjs
python -m unittest discover -s tests -p 'test_*.py' -q
```

Build e testes passaram. A renderização visual no navegador não foi confirmada neste ambiente porque a navegação automatizada para URLs locais foi bloqueada. Teste o 3D em seu Chrome/Firefox com WebGL ativado.

## Arquivos principais

- `src/components/Arquivo3D.jsx`: caixa indexada, divisórias, santinho 3D e animação de extração.
- `src/components/Plenario3D.jsx`: plenário real em Three.js/React Three Fiber.
- `src/pages/PrestacaoDeContas.jsx`: folhas fiscais e navegação pelos lançamentos.
- `server/app.py`: API paginada e parametrizada, leitura somente.
- `public/maps/`: GeoJSON de estados e 1.236 municípios cobertos.
- `docs/ANALISES_E_LIMITACOES.md`: definições dos indicadores e cautelas.

