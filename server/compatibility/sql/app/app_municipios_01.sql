SELECT m.id_municipio id,m.nome,m.uf,m.regiao,
      c.populacao,c.idhm,ROUND(c.pib/NULLIF(c.populacao,0),2) pib_per_capita,
      ROUND(100*p.taxa_abstencao,2) abstencao_2024
      FROM __SQL_fragment_0__.main.Municipio m
      LEFT JOIN __SQL_fragment_1__.main.Censo_Municipio c ON c.id_municipio=m.id_municipio AND c.ano_referencia=2022
      LEFT JOIN __SQL_fragment_2__.main.Participacao_Eleitoral p ON p.id_municipio=m.id_municipio AND p.ano_participacao=2024
      WHERE strip_accents(m.nome) ILIKE strip_accents(?) AND (? IS NULL OR m.uf=?)
      ORDER BY m.nome LIMIT ?
