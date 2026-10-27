-- Q05: Votos de Legenda em Disputas Proporcionais
-- Razão de votos de legenda sobre o total de votos válidos recebidos pela sigla.
-- Base de dados: pipeline_bdr_der_completo_v4

SELECT 
    ano,
    cargo,
    partido,
    SUM(votos_nominais) AS total_nominais,
    SUM(votos_legenda) AS total_legenda,
    SUM(votos_nominais + votos_legenda) AS total_validos,
    ROUND(100.0 * SUM(votos_legenda) / NULLIF(SUM(votos_nominais + votos_legenda), 0), 2) AS taxa_legenda_pct
FROM Votos_Partido_Municipio
WHERE cargo = 'VEREADOR'
  AND ano IN (2020, 2024)
GROUP BY ano, cargo, partido
ORDER BY ano, total_validos DESC;
