SELECT p.sigla partido,
       SUM(v.votos_legenda) legenda,
       SUM(v.votos_nominais) nominais,
       SUM(v.votos_legenda + v.votos_nominais) total_votos,
       ROUND(100.0 * SUM(v.votos_legenda) / NULLIF(SUM(v.votos_legenda + v.votos_nominais), 0), 2) pct_legenda
FROM __SQL_fragment_0__.main.Votos_Partido_Municipio v
JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
JOIN __SQL_fragment_2__.main.Partido p USING(id_partido)
JOIN __SQL_fragment_3__.main.Municipio m USING(id_municipio)
WHERE UPPER(e.cargo) = ? AND e.ano = ? AND e.turno = 1 AND v.turno = 1
  AND (? = '' OR m.uf = ?)
GROUP BY 1 HAVING total_votos > 1000
ORDER BY total_votos DESC LIMIT 20
