SELECT m.id_municipio, m.nome, m.uf,
      p.eleitorado_apto AS eleitorado,
      p.abstencoes,
      ROUND(100.0 * p.taxa_abstencao, 2) AS abstencao_pct,
      c.populacao,
      ROUND(c.pib / NULLIF(c.populacao, 0), 2) AS pib_per_capita,
      c.idhm
      FROM __SQL_fragment_0__.main.Municipio m
      JOIN __SQL_fragment_1__.main.Participacao_Eleitoral p ON p.id_municipio = m.id_municipio
      LEFT JOIN __SQL_fragment_2__.main.Censo_Municipio c ON c.id_municipio = m.id_municipio AND c.ano_referencia = 2022
      WHERE m.uf = ? AND p.ano_participacao = ?
      ORDER BY m.nome
