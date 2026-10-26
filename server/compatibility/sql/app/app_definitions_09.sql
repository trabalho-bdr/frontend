WITH s AS(SELECT c.id_candidato,COUNT(DISTINCT e.ano) n_anos,
       COUNT(DISTINCT c.id_partido) n_partidos,
       SUM(CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END) vitorias
       FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
       JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
       WHERE e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' GROUP BY 1)
       SELECT COUNT(*) pessoas,COUNT(*) FILTER(WHERE n_anos>1) multi_anos,
       COUNT(*) FILTER(WHERE n_anos>=3) tres_anos,
       COUNT(*) FILTER(WHERE n_partidos>1) multi_partidos,
       COUNT(*) FILTER(WHERE vitorias>=2) multi_vitorias FROM s
