SELECT c.nome_urna nome, p.sigla partido, c.uf, m.nome municipio,
  c.gastos_campanha_total gastos, r.votos, r.resultado,
  ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto
FROM __SQL_fragment_0__.main.Candidatura c
JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
LEFT JOIN __SQL_fragment_2__.main.Partido p USING(id_partido)
LEFT JOIN __SQL_fragment_3__.main.Municipio m USING(id_municipio)
JOIN __SQL_fragment_4__.main.Resultado_Candidatura r USING(id_candidatura)
WHERE __SQL_fragment_5__
  AND c.gastos_campanha_total IS NOT NULL
  AND UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')
ORDER BY c.gastos_campanha_total DESC
LIMIT 1
