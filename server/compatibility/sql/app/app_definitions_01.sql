SELECT e.ano,UPPER(e.cargo) cargo,COUNT(*) candidaturas,
       COUNT(*) FILTER(WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
       ROUND(SUM(c.gastos_campanha_total),2) gasto_total,
       ROUND(SUM(c.gastos_campanha_total)/NULLIF(COUNT(*) FILTER(WHERE UPPER(r.resultado) LIKE 'ELEITO%'),0),2) valor
       FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
       JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
       WHERE e.ano IN (2018,2020,2022,2024) AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
       AND UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE')
       GROUP BY 1,2 ORDER BY 1,2
