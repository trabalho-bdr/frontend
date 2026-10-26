SELECT 
  c.id_candidatura id,
  c.nome_urna nome,
  c.numero_urna numero,
  p.sigla partido,
  c.uf,
  m.nome municipio,
  UPPER(e.cargo) cargo,
  e.ano,
  c.gastos_campanha_total gastos,
  r.votos,
  r.resultado,
  CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END eleito,
  ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto,
  COUNT(*) OVER() total_encontrado
FROM __SQL_fragment_0__.main.Candidatura c
JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
LEFT JOIN __SQL_fragment_2__.main.Partido p USING(id_partido)
LEFT JOIN __SQL_fragment_3__.main.Municipio m USING(id_municipio)
JOIN __SQL_fragment_4__.main.Resultado_Candidatura r USING(id_candidatura)
WHERE __SQL_fragment_5__
ORDER BY __SQL_fragment_6__, c.nome_urna, c.id_candidatura
LIMIT ? OFFSET ?
