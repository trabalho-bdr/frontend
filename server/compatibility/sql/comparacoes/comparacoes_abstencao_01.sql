SELECT p.ano_participacao ano,m.uf serie,COUNT(*) municipios,
      ROUND(100.0*SUM(p.abstencoes)/NULLIF(SUM(p.eleitorado_apto),0),2) valor,
      SUM(p.abstencoes) abstencoes,SUM(p.eleitorado_apto) aptos
      FROM __SQL_fragment_0__.main.Participacao_Eleitoral p
      JOIN __SQL_fragment_1__.main.Municipio m USING(id_municipio)
      WHERE p.ano_participacao IN (2022,2024) AND m.uf IN (__SQL_fragment_2__)
      GROUP BY 1,2 ORDER BY 1,2
