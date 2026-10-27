-- Q04: Escolaridade das Candidaturas e do Eleitorado (2024)
-- Compara as distribuições educacionais normalizadas para eleitores (18+) e candidaturas a vereador.
-- Base de dados: pipeline_bdr_der_completo_v4

WITH cands AS (
    SELECT 
        escolaridade,
        COUNT(*) AS total_candidatos
    FROM Candidatura
    WHERE ano = 2024
      AND cargo = 'VEREADOR'
      AND escolaridade IS NOT NULL 
      AND escolaridade NOT IN ('NAO_INFORMADO', 'NAO_DIVULGAVEL')
    GROUP BY escolaridade
),
eleit AS (
    SELECT 
        escolaridade,
        SUM(quantidade) AS total_eleitores
    FROM Perfil_Eleitorado_Escolaridade
    WHERE ano = 2024
      AND faixa_etaria NOT IN ('16_17')
      AND escolaridade IS NOT NULL
      AND escolaridade NOT IN ('NAO_INFORMADO')
    GROUP BY escolaridade
)
SELECT 
    COALESCE(c.escolaridade, e.escolaridade) AS grau_escolaridade,
    c.total_candidatos,
    ROUND(100.0 * c.total_candidatos / SUM(c.total_candidatos) OVER(), 2) AS candidatos_pct,
    e.total_eleitores,
    ROUND(100.0 * e.total_eleitores / SUM(e.total_eleitores) OVER(), 2) AS eleitores_pct,
    ROUND(
        (100.0 * c.total_candidatos / SUM(c.total_candidatos) OVER()) - 
        (100.0 * e.total_eleitores / SUM(e.total_eleitores) OVER()), 2
    ) AS diferenca_pontos_percentuais
FROM cands c
FULL OUTER JOIN eleit e ON c.escolaridade = e.escolaridade
ORDER BY c.total_candidatos DESC;
