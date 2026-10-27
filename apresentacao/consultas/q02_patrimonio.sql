-- Q02: Patrimônio e Sucesso Eleitoral
-- Taxa de eleição por faixas de patrimônio (Decis) preservando o zero declarado separado.
-- Base de dados: pipeline_bdr_der_completo_v4

WITH candidaturas_validas AS (
    SELECT 
        id_candidatura,
        patrimonio,
        CASE WHEN situacao = 'ELEITO' THEN 1 ELSE 0 END AS eleito
    FROM Candidatura
    JOIN Resultado_Candidatura USING (id_candidatura)
    WHERE ano = 2024
      AND cargo = 'VEREADOR'
      AND patrimonio >= 0 
      AND isfinite(patrimonio)
      AND situacao <> 'INDEFINIDO'
),
cortes_decis AS (
    SELECT 
        QUANTILE_CONT(patrimonio, 0.1) AS c1,
        QUANTILE_CONT(patrimonio, 0.2) AS c2,
        QUANTILE_CONT(patrimonio, 0.3) AS c3,
        QUANTILE_CONT(patrimonio, 0.4) AS c4,
        QUANTILE_CONT(patrimonio, 0.5) AS c5,
        QUANTILE_CONT(patrimonio, 0.6) AS c6,
        QUANTILE_CONT(patrimonio, 0.7) AS c7,
        QUANTILE_CONT(patrimonio, 0.8) AS c8,
        QUANTILE_CONT(patrimonio, 0.9) AS c9
    FROM candidaturas_validas
    WHERE patrimonio > 0
),
classificadas AS (
    SELECT 
        v.*,
        CASE 
            WHEN v.patrimonio = 0 THEN 0
            WHEN v.patrimonio <= c.c1 THEN 1
            WHEN v.patrimonio <= c.c2 THEN 2
            WHEN v.patrimonio <= c.c3 THEN 3
            WHEN v.patrimonio <= c.c4 THEN 4
            WHEN v.patrimonio <= c.c5 THEN 5
            WHEN v.patrimonio <= c.c6 THEN 6
            WHEN v.patrimonio <= c.c7 THEN 7
            WHEN v.patrimonio <= c.c8 THEN 8
            WHEN v.patrimonio <= c.c9 THEN 9
            ELSE 10 
        END AS decil
    FROM candidaturas_validas v
    CROSS JOIN cortes_decis c
)
SELECT 
    CASE WHEN decil = 0 THEN 'Zero declarado' ELSE 'Decil ' || decil END AS faixa_patrimonio,
    COUNT(*) AS total_candidaturas,
    SUM(eleito) AS total_eleitos,
    ROUND(100.0 * SUM(eleito) / COUNT(*), 2) AS taxa_sucesso_pct,
    MIN(patrimonio) AS patrimonio_minimo,
    MAX(patrimonio) AS patrimonio_maximo,
    MEDIAN(patrimonio) AS patrimonio_mediano
FROM classificadas
GROUP BY decil
ORDER BY decil;
