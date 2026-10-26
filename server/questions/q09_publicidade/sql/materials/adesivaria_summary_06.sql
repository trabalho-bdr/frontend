SELECT tipo,categoria,COUNT(*) registros,COUNT(valor) valores_informados,
      ROUND(SUM(valor),2) valor FROM selected GROUP BY tipo,categoria
      HAVING SUM(valor)>0 ORDER BY valor DESC,categoria,tipo LIMIT 100
