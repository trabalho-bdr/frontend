SELECT e.ano,
       SUM(v.votos_legenda) legenda,
       SUM(v.votos_nominais) nominais,
       SUM(v.votos_legenda + v.votos_nominais) total_votos,
       ROUND(100.0 * SUM(v.votos_legenda) / NULLIF(SUM(v.votos_legenda + v.votos_nominais), 0), 2) pct_legenda
FROM __SQL_fragment_0__.main.Votos_Partido_Municipio v
JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
JOIN __SQL_fragment_2__.main.Municipio m USING(id_municipio)
WHERE UPPER(e.cargo) = ? AND e.ano IN (?, ?) AND e.turno = 1 AND v.turno = 1
  AND (? = '' OR m.uf = ?)
GROUP BY 1 ORDER BY 1
