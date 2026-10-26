WITH b AS (
      SELECT c.id_candidatura,c.patrimonio,
       CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1
            WHEN UPPER(r.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 0 ELSE NULL END eleito
      FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
      JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
      WHERE e.ano=? AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        AND c.patrimonio IS NOT NULL AND c.patrimonio>=0 AND (?='' OR c.uf=?)
    ), q AS (SELECT *,NTILE(4) OVER(ORDER BY patrimonio,id_candidatura) quartil
      FROM b WHERE eleito IS NOT NULL)
    SELECT quartil,CONCAT('Quartil ',CAST(quartil AS VARCHAR)) serie,COUNT(*) candidaturas,
      COUNT(*) FILTER(WHERE eleito=1) eleitos,ROUND(100.0*AVG(eleito),2) valor,
      ROUND(MEDIAN(patrimonio),2) mediana FROM q GROUP BY 1 ORDER BY 1
