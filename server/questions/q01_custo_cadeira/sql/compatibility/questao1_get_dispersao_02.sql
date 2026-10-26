WITH base AS (
  SELECT 
    c.id_candidatura id,
    c.nome_urna nome,
    c.numero_urna numero,
    p.sigla partido,
    c.uf,
    m.nome municipio,
    ROUND(c.gastos_campanha_total, 2) gastos,
    r.votos,
    r.resultado,
    CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END eleito,
    ROUND(c.gastos_campanha_total / NULLIF(r.votos, 0), 2) custo_voto
  FROM __SQL_fragment_0__.main.Candidatura c
  JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
  LEFT JOIN __SQL_fragment_2__.main.Partido p USING(id_partido)
  LEFT JOIN __SQL_fragment_3__.main.Municipio m USING(id_municipio)
  JOIN __SQL_fragment_4__.main.Resultado_Candidatura r USING(id_candidatura)
  WHERE __SQL_fragment_5__
    AND c.gastos_campanha_total IS NOT NULL AND c.gastos_campanha_total > 0
    AND r.votos IS NOT NULL AND r.votos > 0
),
ranked AS (
  SELECT *,
    ROW_NUMBER() OVER(PARTITION BY eleito ORDER BY hash(id)) rn
  FROM base
)
SELECT id, nome, numero, partido, uf, municipio, gastos, votos, resultado, eleito, custo_voto
FROM ranked
WHERE (eleito = 1 AND rn <= ?) OR (eleito = 0 AND rn <= ?)
ORDER BY eleito DESC, gastos DESC
