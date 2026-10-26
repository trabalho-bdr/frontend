WITH x AS (SELECT e.ano,UPPER(e.cargo) cargo,
       date_diff('year',p.dt_nascimento,e.data) - CASE WHEN strftime(e.data,'%m-%d') < strftime(p.dt_nascimento,'%m-%d') THEN 1 ELSE 0 END idade
       FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Candidato p USING(id_candidato)
       JOIN __SQL_fragment_2__.main.Eleicao e USING(id_eleicao)
       WHERE e.ano IN(2018,2020,2022,2024) AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL','PRESIDENTE'))
       SELECT ano,cargo,COUNT(*) candidaturas,COUNT(*) FILTER(WHERE idade BETWEEN 18 AND 29) jovens,
       COUNT(*) FILTER(WHERE idade IS NULL) sem_idade,
       ROUND(100.0*COUNT(*) FILTER(WHERE idade BETWEEN 18 AND 29)/NULLIF(COUNT(*) FILTER(WHERE idade IS NOT NULL),0),2) pct_jovens
       FROM x GROUP BY 1,2 ORDER BY 1,2
