-- Q01: Custo Financeiro por Cadeira
-- Agrega despesas de todas as candidaturas, apenas eleitos e mediana individual por eleição.
-- Base de dados: pipeline_bdr_der_completo_v4
-- Filtro parametrizado: cargo municipal ('VEREADOR') ou estadual/federal ('DEPUTADO FEDERAL')

WITH base_candidaturas AS (
    SELECT 
        ano,
        cargo,
        situacao,
        gastos
    FROM Candidatura
    JOIN Resultado_Candidatura USING (id_candidatura)
    WHERE cargo = 'VEREADOR'
)
SELECT 
    ano,
    COUNT(*) AS total_candidaturas,
    COUNT(*) FILTER (WHERE gastos >= 0 AND isfinite(gastos)) AS candidaturas_com_gasto,
    COUNT(*) FILTER (WHERE situacao = 'ELEITO') AS eleitos_registrados,
    SUM(gastos) FILTER (WHERE gastos >= 0 AND isfinite(gastos)) AS gasto_total_todas_candidaturas,
    SUM(gastos) FILTER (WHERE gastos >= 0 AND isfinite(gastos) AND situacao = 'ELEITO') AS gasto_total_apenas_eleitos,
    MEDIAN(gastos) FILTER (WHERE gastos >= 0 AND isfinite(gastos) AND situacao = 'ELEITO') AS mediana_gasto_eleitos,
    -- Cálculos agregados
    SUM(gastos) FILTER (WHERE gastos >= 0 AND isfinite(gastos)) / 
        NULLIF(COUNT(*) FILTER (WHERE situacao = 'ELEITO'), 0) AS gasto_todas_por_eleito,
    SUM(gastos) FILTER (WHERE gastos >= 0 AND isfinite(gastos) AND situacao = 'ELEITO') / 
        NULLIF(COUNT(*) FILTER (WHERE situacao = 'ELEITO'), 0) AS gasto_eleitos_por_eleito
FROM base_candidaturas
GROUP BY ano
ORDER BY ano;
