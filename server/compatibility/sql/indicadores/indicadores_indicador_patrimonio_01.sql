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
)
SELECT 
    COUNT(*) total,
    COUNT(*) FILTER(WHERE patrimonio IS NOT NULL AND patrimonio >= 0) validos,
    COUNT(*) FILTER(WHERE patrimonio < 0) negativos,
    COUNT(*) FILTER(WHERE patrimonio IS NULL) nao_informados,
    COUNT(*) FILTER(WHERE patrimonio >= 0 AND eleito IS NOT NULL) validos_com_resultado,
    ROUND(100.0 * COUNT(*) FILTER(WHERE patrimonio >= 0) / NULLIF(COUNT(*), 0), 2) cobertura_pct,
    ROUND(MEDIAN(patrimonio) FILTER(WHERE patrimonio >= 0), 2) mediana_geral,
    ROUND(MEDIAN(patrimonio) FILTER(WHERE patrimonio >= 0 AND eleito = 1), 2) mediana_eleitos,
    ROUND(MEDIAN(patrimonio) FILTER(WHERE patrimonio >= 0 AND eleito = 0), 2) mediana_nao_eleitos
FROM base
