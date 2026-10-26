SELECT 
  COUNT(*) total_candidaturas,
  COUNT(c.gastos_campanha_total) candidaturas_com_gasto,
  COUNT(*) FILTER (WHERE c.gastos_campanha_total = 0) candidaturas_gasto_zero,
  COUNT(*) FILTER (WHERE c.gastos_campanha_total > 0) candidaturas_gasto_positivo,
  COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos,
  COUNT(*) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')) nao_eleitos,
  COUNT(*) FILTER (WHERE r.votos IS NOT NULL AND r.votos > 0) com_votos,
  ROUND(SUM(c.gastos_campanha_total), 2) total_despesas,
  ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) gasto_por_cadeira,
  ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 2) mediana_gastos_eleitos,
  ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) mediana_gastos_nao_eleitos,
  ROUND(MEDIAN(r.votos) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 2) mediana_votos_eleitos,
  ROUND(MEDIAN(r.votos) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 2) mediana_votos_nao_eleitos,
  ROUND(MEDIAN(c.gastos_campanha_total / NULLIF(r.votos, 0)) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%' AND c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_custo_voto_eleitos,
  ROUND(MEDIAN(c.gastos_campanha_total / NULLIF(r.votos, 0)) FILTER (WHERE UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') AND c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_custo_voto_nao_eleitos
FROM __SQL_fragment_0__.main.Candidatura c
JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
LEFT JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
WHERE __SQL_fragment_3__
