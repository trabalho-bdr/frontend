# An?lises BDR integradas ao portal

As quest?es 3, 5, 7 e 9 apresentam os mapas e gr?ficos diretamente no documento da investiga??o, como componentes React. N?o h? iframe, p?gina separada ou bot?o de abertura. A quest?o 2 mant?m o dossi? de patrim?nio j? integrado ao portal.

- Q3: mapa de absten??o e indicadores municipais, filtros territoriais e ano.
- Q5 e Q7: votos de legenda, compara??o entre munic?pios e evolu??o por partido.
- Q9: nuvem de categorias, ranking, busca de candidatura, exporta??o CSV e evolu??o da estrat?gia publicit?ria.

O c?digo adaptado do projeto original est? em `integrations/bdr`. Os estilos foram limitados ao cont?iner `.bdr-native` em `src/components/paineis-bdr.css`, com as cores e tipografia do portal. As an?lises s?o carregadas sob demanda ao entrar na quest?o. A navega??o entre perguntas pertence ao site.

As rotas `/api/bdr` em `server/bdr_paineis` reutilizam a conex?o configurada no servidor do portal. Reinicie o backend ap?s atualizar. Sem conex?o, os erros e op??es de tentar novamente s?o exibidos no conte?do da investiga??o. Exemplos fict?cios de legenda s? aparecem quando explicitamente ativados.

A cobertura permanece restrita a CE, MA, MS, RJ, RN e RS. As regras de classifica??o e interpreta??o dos dados do projeto original foram preservadas.

Valida??o: 51 testes JavaScript aprovados e build de produ??o compilado. A confer?ncia visual no navegador e as consultas ao banco remoto permanecem pendentes.
