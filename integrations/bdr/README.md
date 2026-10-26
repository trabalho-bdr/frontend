# Painéis BDR integrados

O módulo é carregado por `src/components/PaineisBDR.jsx`, via importação dinâmica de `App.tsx`. Seus componentes e estilos precisam estar versionados para que uma nova instalação consiga compilar e abrir os painéis.

`requisicaoApi.ts` consulta as rotas da API pelo proxy do portal. Credenciais não pertencem a este diretório. Arquivos `mock*` e `GraficosLegendaMock.tsx` contêm cenários fictícios de prototipagem, identificados nos próprios arquivos; não são dados oficiais.

Executar pelo projeto principal (`npm ci`, `npm run dev`). Validar com `npm test` e `npm run build`.
