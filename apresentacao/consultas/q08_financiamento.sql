-- Q08: Financiamento de Campanha e Fundos Públicos
-- Taxa de sucesso de candidaturas conforme a dependência de recursos públicos declarados.
-- Fonte auxiliar: receitas-candidatos.parquet (vinculada à prestação final do TSE)

SELECT 
    CASE 
        WHEN publico = 0 THEN 'Sem fundos públicos'
        WHEN publico / total <= 0.25 THEN 'Até 25% público'
        WHEN publico / total <= 0.50 THEN '25% a 50% público'
        WHEN publico / total <= 0.75 THEN '50% a 75% público'
        ELSE 'Mais de 75% público'
    END AS faixa_recurso_publico,
    COUNT(*) AS total_candidaturas,
    COUNT(*) FILTER (WHERE situacao = 'ELEITO') AS eleitos,
    ROUND(100.0 * COUNT(*) FILTER (WHERE situacao = 'ELEITO') / COUNT(*), 2) AS taxa_eleicao_pct,
    SUM(total) AS receita_total_declarada,
    SUM(publico) AS total_recursos_publicos,
    SUM(privado) AS total_recursos_privados
FROM 'server/data/receitas-candidatos.parquet'
WHERE ano = 2024
  AND cargo = 'VEREADOR'
  AND situacao IN ('ELEITO', 'NAO_ELEITO', 'SUPLENTE')
GROUP BY faixa_recurso_publico
ORDER BY taxa_eleicao_pct DESC;
