SELECT e.ano, UPPER(e.cargo) cargo,c.escolaridade_candidatura escolaridade,
       COUNT(*) candidaturas,COUNT(*) FILTER(WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos
       FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
       JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
       WHERE e.ano IN(2018,2020,2022,2024) AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE')
       GROUP BY 1,2,3 ORDER BY 1,2,4 DESC
