WITH b AS (
    SELECT c.id_candidatura,
           COALESCE(NULLIF(TRIM(c.escolaridade_candidatura), ''), 'NÃO INFORMADA') escolaridade,
           r.resultado
    FROM __SQL_fragment_0__.main.Candidatura c
    JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
    LEFT JOIN __SQL_fragment_2__.main.Resultado_Candidatura r ON r.id_candidatura = c.id_candidatura AND r.turno = 1
    WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.turno = 1
      AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND (? = '' OR c.uf = ?)
    QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
)
SELECT escolaridade,
       COUNT(*) candidaturas,
       COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%') eleitos,
       COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%' OR UPPER(resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')) definidos,
       ROUND(100.0 * COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%') /
             NULLIF(COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%' OR UPPER(resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')), 0), 2) taxa_eleicao_pct
FROM b
GROUP BY 1 ORDER BY candidaturas DESC
