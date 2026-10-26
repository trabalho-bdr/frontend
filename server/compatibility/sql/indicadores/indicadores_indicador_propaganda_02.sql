SELECT grupo_despesa AS categoria,
       SUM(registros_agregados) AS registros,
       ROUND(SUM(valor_contratado), 2) AS total
FROM __SQL_fragment_0__.main.vw_q9_resumo_categorias
WHERE grupo_despesa IS NOT NULL AND grupo_despesa NOT IN ('Não informada', 'Não classificada — revisar')
GROUP BY 1 ORDER BY total DESC LIMIT 24
