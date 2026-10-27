-- Q07: Mudanças Partidárias no Voto de Vereador (2020 para 2024)
-- Identificação do partido líder em cada pleito e cálculo da estabilidade de liderança.
-- Base de dados: pipeline_bdr_der_completo_v4

WITH ranked_votes AS (
    SELECT 
        ano,
        id_municipio,
        partido,
        SUM(votos_nominais + votos_legenda) AS total_votos,
        ROW_NUMBER() OVER (
            PARTITION BY ano, id_municipio 
            ORDER BY SUM(votos_nominais + votos_legenda) DESC
        ) AS posicao
    FROM Votos_Partido_Municipio
    WHERE cargo = 'VEREADOR' AND ano IN (2020, 2024)
    GROUP BY ano, id_municipio, partido
),
lideres_2020 AS (
    SELECT id_municipio, partido AS lider_2020
    FROM ranked_votes WHERE ano = 2020 AND posicao = 1
),
lideres_2024 AS (
    SELECT id_municipio, partido AS lider_2024
    FROM ranked_votes WHERE ano = 2024 AND posicao = 1
)
SELECT 
    m.id_municipio,
    m.nome AS municipio,
    m.uf,
    l20.lider_2020,
    l24.lider_2024,
    CASE 
        WHEN l20.lider_2020 = l24.lider_2024 THEN 'Mesma organização'
        WHEN (l20.lider_2020 IN ('DEM', 'PSL') AND l24.lider_2024 = 'UNIÃO') THEN 'Fusão/incorporação'
        ELSE 'Mudança entre organizações'
    END AS status_lideranca
FROM Municipio m
JOIN lideres_2020 l20 ON l20.id_municipio = m.id_municipio
JOIN lideres_2024 l24 ON l24.id_municipio = m.id_municipio;
