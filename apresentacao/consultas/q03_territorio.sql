-- Q03: Território, Voto e Abstenção
-- Cruzamento municipal de indicadores demográficos e educacionais com taxas eleitorais de 2024.
-- Base de dados: pipeline_bdr_der_completo_v4

SELECT 
    m.id_municipio,
    m.nome AS municipio,
    m.uf,
    c.populacao,
    c.idhm,
    p.eleitores_aptos,
    p.abstencao,
    ROUND(100.0 * p.abstencao / NULLIF(p.eleitores_aptos, 0), 2) AS taxa_abstencao_pct
FROM Municipio m
JOIN Censo_Municipio c ON c.id_municipio = m.id_municipio AND c.ano_referencia = 2022
LEFT JOIN Participacao_Eleitoral p ON p.id_municipio = m.id_municipio AND p.ano = 2024
WHERE p.eleitores_aptos > 0
ORDER BY taxa_abstencao_pct ASC;
