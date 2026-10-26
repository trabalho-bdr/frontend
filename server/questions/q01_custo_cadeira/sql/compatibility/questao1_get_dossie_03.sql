WITH est AS (
  SELECT p.sigla partido,
    COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos_estadual,
    ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_estadual
  FROM __SQL_fragment_0__.main.Candidatura c
  JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
  JOIN __SQL_fragment_2__.main.Partido p USING(id_partido)
  LEFT JOIN __SQL_fragment_3__.main.Resultado_Candidatura r USING(id_candidatura)
  WHERE e.ano = ? AND UPPER(e.cargo) = 'DEPUTADO ESTADUAL' AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
  GROUP BY 1
), fed AS (
  SELECT p.sigla partido,
    COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%') eleitos_federal,
    ROUND(SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0), 2) custo_federal
  FROM __SQL_fragment_4__.main.Candidatura c
  JOIN __SQL_fragment_5__.main.Eleicao e USING(id_eleicao)
  JOIN __SQL_fragment_6__.main.Partido p USING(id_partido)
  LEFT JOIN __SQL_fragment_7__.main.Resultado_Candidatura r USING(id_candidatura)
  WHERE e.ano = ? AND UPPER(e.cargo) = 'DEPUTADO FEDERAL' AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
  GROUP BY 1
)
SELECT est.partido, est.custo_estadual, est.eleitos_estadual, fed.custo_federal, fed.eleitos_federal
FROM est JOIN fed USING(partido)
ORDER BY fed.custo_federal DESC NULLS LAST
