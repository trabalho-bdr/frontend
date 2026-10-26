SELECT 
  COUNT(*) total_universo,
  COUNT(*) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0) validos_scatter,
  COUNT(*) FILTER (WHERE c.gastos_campanha_total IS NULL OR c.gastos_campanha_total <= 0 OR r.votos IS NULL OR r.votos <= 0) excluidos_zero_ou_nulo,
  ROUND(CORR(c.gastos_campanha_total, r.votos) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 4) r_linear,
  ROUND(CORR(log10(c.gastos_campanha_total), log10(r.votos)) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 4) r_log,
  ROUND(POW(CORR(log10(c.gastos_campanha_total), log10(r.votos)) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 2), 4) r2_log,
  ROUND(MEDIAN(c.gastos_campanha_total) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_gastos_scatter,
  ROUND(MEDIAN(r.votos) FILTER (WHERE c.gastos_campanha_total > 0 AND r.votos > 0), 2) mediana_votos_scatter
FROM __SQL_fragment_0__.main.Candidatura c
JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
LEFT JOIN __SQL_fragment_2__.main.Partido p USING(id_partido)
JOIN __SQL_fragment_3__.main.Resultado_Candidatura r USING(id_candidatura)
WHERE __SQL_fragment_4__
