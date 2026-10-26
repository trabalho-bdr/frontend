WITH base AS (
    SELECT c.id_candidatura, p.sigla partido,
           r.votos,
           CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 
                WHEN UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') THEN 0
                ELSE NULL END eleito
    FROM __SQL_fragment_0__.main.Candidatura c
    JOIN __SQL_fragment_1__.main.Eleicao e ON c.id_eleicao = e.id_eleicao
    LEFT JOIN __SQL_fragment_2__.main.Partido p ON c.id_partido = p.id_partido
    LEFT JOIN __SQL_fragment_3__.main.Resultado_Candidatura r ON c.id_candidatura = r.id_candidatura AND r.turno = 1
    WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND (? = '' OR c.uf = ?)
      AND (? = '' OR c.id_municipio = ?)
    QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
)
SELECT partido,
       COUNT(*) candidaturas,
       COUNT(*) FILTER(WHERE eleito = 1) eleitos,
       COUNT(*) FILTER(WHERE eleito IS NOT NULL) definidos,
       ROUND(100.0 * COUNT(*) FILTER(WHERE eleito = 1) / NULLIF(COUNT(*) FILTER(WHERE eleito IS NOT NULL), 0), 2) taxa_pct,
       COALESCE(SUM(votos), 0) votos_nominais
FROM base
WHERE partido IS NOT NULL
GROUP BY 1 ORDER BY eleitos DESC, votos_nominais DESC LIMIT 30
