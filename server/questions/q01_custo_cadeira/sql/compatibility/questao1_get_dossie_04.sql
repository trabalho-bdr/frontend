SELECT 
  COUNT(*) FILTER (WHERE c.gastos_campanha_total <= ?) b1,
  COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b2,
  COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b3,
  COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b4,
  COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b5,
  COUNT(*) FILTER (WHERE c.gastos_campanha_total > ? AND c.gastos_campanha_total <= ?) b6,
  COUNT(*) FILTER (WHERE c.gastos_campanha_total > ?) b7
FROM __SQL_fragment_0__.main.Candidatura c
JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
WHERE __SQL_fragment_3__ AND UPPER(r.resultado) LIKE 'ELEITO%'
