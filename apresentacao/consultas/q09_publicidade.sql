-- Q09: Publicidade Eleitoral e Despesas de Campanha
-- Distribuição de valores contratados por categorias de propaganda eleitoral.
-- Base de dados: pipeline_bdr_der_completo_v4

SELECT 
    tipo_despesa,
    COUNT(*) AS total_lancamentos,
    COUNT(DISTINCT id_candidatura) AS total_candidaturas,
    SUM(valor_despesa) AS valor_total_contratado,
    ROUND(100.0 * SUM(valor_despesa) / SUM(SUM(valor_despesa)) OVER(), 2) AS participacao_pct
FROM Despesa_Candidatura d
JOIN Candidatura c USING (id_candidatura)
WHERE c.ano = 2024
  AND c.cargo = 'VEREADOR'
  AND d.valor_despesa > 0
GROUP BY tipo_despesa
ORDER BY valor_total_contratado DESC;
