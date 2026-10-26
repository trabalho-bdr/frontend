SELECT c.uf,
  COUNT(*) candidaturas,
  COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
  ROUND(SUM(c.gastos_campanha_total), 2) gasto_total,
  ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_por_cadeira,
  ROUND(MIN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) min_gasto,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) q1_gasto,
  ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) mediana_gasto,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0), 2) q3_gasto,
  ROUND(MAX(c.gastos_campanha_total), 2) max_gasto,
  ROUND(MAX(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) max_outlier_nao_eleito
FROM __SQL_fragment_0__.main.Candidatura c
JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
LEFT JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
GROUP BY 1 ORDER BY custo_por_cadeira DESC NULLS LAST
