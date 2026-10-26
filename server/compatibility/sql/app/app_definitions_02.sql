WITH b AS (SELECT e.ano,UPPER(e.cargo) cargo,c.id_candidatura,c.patrimonio,
       CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1
            WHEN UPPER(r.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 0
            ELSE NULL END eleito
       FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
       JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
       WHERE e.ano IN (2018,2020,2022,2024) AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
       AND UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE')
       AND c.patrimonio IS NOT NULL AND c.patrimonio >= 0),
       q AS(SELECT *,NTILE(4) OVER(PARTITION BY ano,cargo ORDER BY patrimonio,id_candidatura) quartil FROM b WHERE eleito IS NOT NULL)
       SELECT ano,cargo,quartil,COUNT(*) candidaturas,ROUND(100*AVG(eleito),2) taxa,
       ROUND(MEDIAN(patrimonio),2) mediana FROM q GROUP BY 1,2,3 ORDER BY 1,2,3
