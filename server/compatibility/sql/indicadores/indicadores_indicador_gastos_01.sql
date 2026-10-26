WITH base AS (
    SELECT c.id_candidatura, c.gastos_campanha_total gastos, r.votos,
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
      AND (? = '' OR UPPER(p.sigla) = ?)
    QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
),
valid AS (
    SELECT *, NTILE(4) OVER(ORDER BY gastos, id_candidatura) faixa
    FROM base
    WHERE gastos >= 0 AND eleito IS NOT NULL
)
SELECT 
    COUNT(*) candidaturas_analisadas,
    ROUND(SUM(gastos), 2) gasto_total_declarado,
    ROUND(MEDIAN(gastos), 2) mediana_geral,
    ROUND(SUM(gastos) / NULLIF(COUNT(*) FILTER(WHERE eleito = 1), 0), 2) gasto_agregado_por_cadeira,
    ROUND(MEDIAN(gastos) FILTER(WHERE eleito = 1), 2) mediana_eleitos,
    ROUND(MEDIAN(gastos) FILTER(WHERE eleito = 0), 2) mediana_nao_eleitos,
    COUNT(*) FILTER(WHERE eleito = 1) eleitos,
    COUNT(*) FILTER(WHERE eleito = 0) nao_eleitos
FROM base
