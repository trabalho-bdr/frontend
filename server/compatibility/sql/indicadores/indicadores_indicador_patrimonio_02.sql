WITH base AS (
    SELECT c.id_candidatura, c.patrimonio,
           CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1
                WHEN UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE') THEN 0
                ELSE NULL END eleito
    FROM __SQL_fragment_0__.main.Candidatura c
    JOIN __SQL_fragment_1__.main.Eleicao e ON c.id_eleicao = e.id_eleicao
    LEFT JOIN __SQL_fragment_2__.main.Resultado_Candidatura r ON c.id_candidatura = r.id_candidatura AND r.turno = 1
    WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND (? = '' OR c.uf = ?)
      AND (? = '' OR c.id_municipio = ?)
    QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
),
q AS (
    SELECT *, NTILE(4) OVER(ORDER BY patrimonio, id_candidatura) quartil
    FROM base WHERE patrimonio >= 0 AND eleito IS NOT NULL
)
SELECT quartil,
       COUNT(*) candidaturas,
       SUM(eleito) eleitos,
       ROUND(100.0 * AVG(eleito), 2) taxa_eleicao_pct,
       ROUND(MIN(patrimonio), 2) minimo,
       ROUND(MAX(patrimonio), 2) maximo,
       ROUND(MEDIAN(patrimonio), 2) mediana
FROM q GROUP BY 1 ORDER BY 1
