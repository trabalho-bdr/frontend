-- Q06: Eleitorado Jovem (16 a 24 anos) em 2024
-- Proporção de eleitores jovens aptos com idade conhecida por município.
-- Base de dados: pipeline_bdr_der_completo_v4

SELECT 
    m.id_municipio,
    m.nome AS municipio,
    m.uf,
    SUM(p.quantidade) AS total_eleitores_aptos,
    SUM(p.quantidade) FILTER (WHERE p.faixa_etaria IN ('16_17', '18_20', '21_24')) AS total_jovens_16_24,
    ROUND(
        100.0 * SUM(p.quantidade) FILTER (WHERE p.faixa_etaria IN ('16_17', '18_20', '21_24')) / 
        NULLIF(SUM(p.quantidade), 0), 2
    ) AS pct_jovens_16_24
FROM Municipio m
JOIN Perfil_Eleitorado_Idade p ON p.id_municipio = m.id_municipio AND p.ano = 2024
GROUP BY m.id_municipio, m.nome, m.uf
ORDER BY pct_jovens_16_24 DESC;
