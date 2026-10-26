WITH x AS (
    SELECT e.ano, UPPER(e.cargo) cargo,
           date_diff('year', p.dt_nascimento, e.data) - 
           CASE WHEN strftime(e.data, '%m-%d') < strftime(p.dt_nascimento, '%m-%d') THEN 1 ELSE 0 END idade,
           CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END eleito
    FROM __SQL_fragment_0__.main.Candidatura c
    JOIN __SQL_fragment_1__.main.Candidato p USING(id_candidato)
    JOIN __SQL_fragment_2__.main.Eleicao e USING(id_eleicao)
    LEFT JOIN __SQL_fragment_3__.main.Resultado_Candidatura r ON r.id_candidatura = c.id_candidatura AND r.turno = 1
    WHERE e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND UPPER(e.cargo) = ?
      AND (? = '' OR c.uf = ?)
    QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
)
SELECT ano,
       COUNT(*) candidaturas,
       COUNT(*) FILTER(WHERE idade BETWEEN 18 AND 29) candidaturas_jovens,
       ROUND(100.0 * COUNT(*) FILTER(WHERE idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER(WHERE idade IS NOT NULL), 0), 2) pct_jovens_candidaturas,
       COUNT(*) FILTER(WHERE eleito = 1) eleitos,
       COUNT(*) FILTER(WHERE eleito = 1 AND idade BETWEEN 18 AND 29) eleitos_jovens,
       ROUND(100.0 * COUNT(*) FILTER(WHERE eleito = 1 AND idade BETWEEN 18 AND 29) / NULLIF(COUNT(*) FILTER(WHERE eleito = 1 AND idade IS NOT NULL), 0), 2) pct_jovens_eleitos
FROM x
WHERE ano IN (2018, 2020, 2022, 2024)
GROUP BY 1 ORDER BY 1
