SELECT tipo,COUNT(*) registros,COUNT(valor) valores_informados,
      ROUND(SUM(valor),2) valor,COUNT(DISTINCT id) candidaturas
      FROM raw WHERE tipo IS NOT NULL GROUP BY tipo ORDER BY valor DESC NULLS LAST,tipo
