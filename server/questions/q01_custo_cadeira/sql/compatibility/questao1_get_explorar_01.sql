WITH base AS (
        SELECT __SQL_fragment_0__ AS grupo, c.id_municipio municipio_id, c.id_candidatura,
          CASE WHEN isfinite(c.gastos_campanha_total) AND c.gastos_campanha_total >= 0
            THEN c.gastos_campanha_total END AS gasto,
          CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END AS eleito,
          CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' OR UPPER(r.resultado) IN
            ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 1 ELSE 0 END AS definido
        FROM __SQL_fragment_1__.main.Candidatura c
        JOIN __SQL_fragment_2__.main.Eleicao e USING(id_eleicao)
        LEFT JOIN __SQL_fragment_3__.main.Resultado_Candidatura r USING(id_candidatura)
        LEFT JOIN __SQL_fragment_4__.main.Partido p USING(id_partido)
        LEFT JOIN __SQL_fragment_5__.main.Municipio m USING(id_municipio)
        WHERE __SQL_fragment_6__
    ) SELECT grupo, __SQL_fragment_7__ municipio_id,
        COUNT(*) candidaturas,
        COUNT(gasto) com_gasto, COUNT(*) FILTER (WHERE gasto IS NULL) sem_gasto,
        SUM(eleito) eleitos, SUM(definido) resultado_definido,
        ROUND(SUM(gasto),2) total_despesas,
        ROUND(SUM(gasto)/NULLIF(SUM(eleito),0),2) gasto_por_cadeira,
        ROUND(MEDIAN(gasto) FILTER (WHERE eleito=1),2) mediana_eleitos,
        ROUND(100.0*SUM(eleito)/NULLIF(SUM(definido),0),2) taxa_eleicao
      FROM base GROUP BY grupo__SQL_fragment_8__ ORDER BY grupo LIMIT 1200
