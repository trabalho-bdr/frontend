SELECT tipo,COUNT(*) registros,COUNT(valor) valores_informados,ROUND(SUM(valor),2) valor
      FROM raw WHERE id=? AND tipo IS NOT NULL GROUP BY tipo ORDER BY tipo
