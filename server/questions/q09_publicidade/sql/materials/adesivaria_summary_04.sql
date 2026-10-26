SELECT COALESCE(partido,'Não informado') partido,COUNT(*) candidaturas_recorte,
      COUNT(*) FILTER(WHERE lancamentos>0) candidaturas,COUNT(gastos_classificados) valores_informados,
      SUM(lancamentos) lancamentos,ROUND(SUM(gastos_classificados),2) valor
      FROM enriched GROUP BY partido HAVING SUM(lancamentos)>0 ORDER BY valor DESC NULLS LAST,partido
