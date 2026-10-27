# Q10

`definition.js`: texto e destino. `summary.js`: interpretação descritiva. `index.js`: capacidades e campos do mapa. Filtros, carregamento e estados vazios permanecem no shell compartilhado `pages/ResearchPage.jsx`. SQL e metodologia: `server/questions/q10_trajetorias`.

`CandidateTrajectoryExplorer.jsx` pesquisa nomes civis/de urna no catálogo, sem restringir o ano. Cargo, UF, município e partido selecionam candidatos com passagem pelo recorte; o perfil selecionado fornece o histórico completo disponível, sem aplicar esses filtros novamente. O explorador aparece na entrada do panorama e na aba Candidatos.

`TrajectoryChart.jsx` apresenta anos no eixo horizontal e cargos no vertical. Círculo verde: eleito; cruz vermelha: não eleito, incluindo suplente; losango cinza: resultado desconhecido/indefinido. A legenda fica ao lado no desktop e abaixo no celular. Os pontos são selecionáveis por mouse e teclado. `trajectory.js` ordena o histórico e identifica mudanças de cargo; anos sem registros e mandatos não são inferidos.
