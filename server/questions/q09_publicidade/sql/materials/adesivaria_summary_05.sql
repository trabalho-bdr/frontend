SELECT tipo,categoria,COUNT(*) registros,COUNT(valor) valores_informados,
      ROUND(SUM(valor),2) valor,COUNT(DISTINCT id) candidaturas
      FROM selected GROUP BY tipo,categoria ORDER BY valor DESC NULLS LAST,categoria,tipo LIMIT 25 OFFSET ?
