SELECT c.uf,
  COUNT(*) candidaturas,
  COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
  ROUND(SUM(c.gastos_campanha_total), 2) total_despesas,
  ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) gasto_por_cadeira
FROM __SQL_fragment_0__.main.Candidatura c
JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
LEFT JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
  AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
  AND (? = '' OR c.uf = ?)
GROUP BY 1 ORDER BY gasto_por_cadeira DESC
