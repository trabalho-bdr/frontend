SELECT ano,COUNT(*) candidaturas,COUNT(*) FILTER(WHERE gastos>=0 AND isfinite(gastos)) com_valor,
      COUNT(*) FILTER(WHERE situacao='ELEITO') eleitos,
      SUM(gastos) FILTER(WHERE gastos>=0 AND isfinite(gastos)) total,
      SUM(gastos) FILTER(WHERE gastos>=0 AND isfinite(gastos) AND situacao='ELEITO') gasto_eleitos,
      MEDIAN(gastos) FILTER(WHERE gastos>=0 AND isfinite(gastos) AND situacao='ELEITO') mediana
      FROM scoped GROUP BY ano ORDER BY ano
