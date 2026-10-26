SELECT e.ano ano,UPPER(e.cargo) serie,
      ROUND(SUM(c.gastos_campanha_total)/NULLIF(COUNT(*) FILTER(WHERE UPPER(r.resultado) LIKE 'ELEITO%'),0),2) valor,
      ROUND(SUM(c.gastos_campanha_total),2) gasto_total,
      COUNT(*) FILTER(WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
      COUNT(*) FILTER(WHERE c.gastos_campanha_total IS NOT NULL) gastos_informados,
      COUNT(*) candidaturas
      FROM __SQL_fragment_0__.main.Candidatura c
      JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
      JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
      WHERE e.ano IN (?,?) AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND (?='' OR c.uf=?) GROUP BY 1,2 ORDER BY 1
