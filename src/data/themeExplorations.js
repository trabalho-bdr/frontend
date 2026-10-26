export const themeExplorations = {
  mapa: {
    title: 'Territórios e eleições',
    heading: 'Cada território, uma história.',
    description:
      'Explore as diferenças entre municípios e acompanhe o que permanece ou muda na distribuição dos votos.',
    items: [
      {
        id: 'territorio',
        page: 'atlas',
        label: 'Território, voto e abstenção',
        note: 'Como as características municipais se relacionam com os resultados',
        question: 3,
        guide:
          'Compare indicadores municipais com a abstenção ou a participação de um partido. Os pontos e o mapa permitem localizar e conferir cada município.',
        limit:
          'Associações territoriais não revelam o voto individual. Indicadores socioeconômicos têm referências temporais próprias.',
      },
      {
        id: 'lideranca',
        page: 'atlas',
        label: 'Permanências e mudanças',
        note: 'Como a distribuição partidária se transforma entre eleições',
        question: 7,
        guide:
          'Acompanhe organizações líderes, transições e a mudança na distribuição dos votos entre eleições equivalentes.',
        limit:
          'A análise descreve organizações partidárias; não atribui orientação ideológica aos municípios.',
      },
    ],
  },
  pessoas: {
    title: 'Pessoas e trajetórias',
    heading: 'Pessoas, perfis e trajetórias.',
    description:
      'Compare a escolaridade, conheça o eleitorado jovem e siga as trajetórias das pessoas que disputaram eleições.',
    items: [
      {
        id: 'escolaridade',
        page: 'arquivo',
        label: 'Escolaridade e eleitorado',
        note: 'Como a formação dos candidatos se aproxima ou se distancia do eleitorado',
        question: 4,
        guide:
          'Compare as distribuições de escolaridade e investigue as diferenças municipais no gráfico e no mapa.',
        limit:
          'O eleitorado está validado em 2024. Eleitorado e população residente são universos distintos; a escolaridade da população ainda não foi integrada.',
      },
      {
        id: 'juventude',
        page: 'arquivo',
        label: 'Eleitorado jovem',
        note: 'Como a composição etária se relaciona com partidos e abstenção',
        question: 6,
        guide:
          'Escolha uma faixa etária e relacione sua participação no eleitorado à votação partidária ou à abstenção municipal.',
        limit: 'A comparação validada usa 2024. Não identifica em quem os jovens votaram.',
      },
      {
        id: 'trajetorias',
        page: 'arquivo',
        label: 'Trajetórias eleitorais',
        note: 'Permanências, intervalos e retornos ao longo das eleições',
        question: 10,
        guide:
          'Compare padrões observados e procure uma pessoa para conferir sua sequência de candidaturas no perfil e no Fichário.',
        limit:
          'O histórico abrange o acervo de seis UFs entre 2002 e 2024. Ausência de registro não comprova abandono da política.',
      },
    ],
  },
  voto: {
    title: 'Votos e representação',
    heading: 'Dos votos à representação.',
    description:
      'Entenda o papel do nome e da legenda e compare a votação dos partidos com sua participação entre os eleitos.',
    items: [
      {
        id: 'legenda',
        page: 'partidos',
        label: 'Votos nominais e de legenda',
        note: 'Quanto do voto vai para a sigla e como essa parcela muda',
        question: 5,
        guide:
          'Compare a participação dos votos de legenda em séries do mesmo cargo e confira as contagens que formam os percentuais.',
        limit:
          'Mudanças de nome podem ser acompanhadas; fusões permanecem separadas. Ausência de dados não equivale a zero.',
      },
      {
        id: 'representacao',
        page: 'partidos',
        label: 'Representação por partido',
        note: 'Compare a participação nos votos e nas candidaturas eleitas',
        guide: 'Compare parcelas dos votos e dos eleitos e confira os partidos de maior contraste.',
        limit:
          'O painel agrega disputas territoriais e não reconstrói o cálculo oficial de vagas ou o papel de cada federação.',
      },
      {
        id: 'proporcional',
        page: 'plenario',
        label: 'Como os votos viram vagas',
        note: 'Por que a votação individual não explica sozinha o resultado',
        guide:
          'Confira candidaturas da mesma disputa e entenda o papel da votação partidária na eleição proporcional.',
        limit:
          'O caso ilustrado não mede a frequência do fenômeno nem refaz a distribuição oficial das vagas.',
      },
    ],
  },
};
