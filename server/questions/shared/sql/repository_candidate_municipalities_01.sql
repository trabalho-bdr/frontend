SELECT municipio_id id,municipio nome,uf,COUNT(*) candidaturas,
      COUNT(*) FILTER(WHERE gastos>=0 AND isfinite(gastos)) com_despesa,
      SUM(gastos) FILTER(WHERE gastos>=0 AND isfinite(gastos)) despesas,
      COUNT(*) FILTER(WHERE situacao='ELEITO') eleitos,
      MEDIAN(patrimonio) FILTER(WHERE patrimonio>=0 AND isfinite(patrimonio)) patrimonio_mediano,
      COUNT(*) FILTER(WHERE patrimonio>=0 AND isfinite(patrimonio)) patrimonio_conhecido,
      COUNT(*) FILTER(WHERE patrimonio>=0 AND isfinite(patrimonio) AND situacao<>'INDEFINIDO') definidos_com_patrimonio,
      COUNT(*) FILTER(WHERE patrimonio>=0 AND isfinite(patrimonio) AND situacao='ELEITO') eleitos_com_patrimonio
      FROM scoped GROUP BY 1,2,3 ORDER BY municipio
