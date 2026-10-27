-- Q10: Trajetórias Eleitorais e Padrões de Carreira Política (2002–2024)
-- Agrupa pessoas auditadas por continuidade, intervalo de retorno ou eleição única.
-- Base de dados: pipeline_bdr_der_completo_v4

WITH safe_people AS (
    SELECT id_candidato
    FROM Candidato
    GROUP BY id_candidato
    HAVING COUNT(DISTINCT NULLIF(TRIM(titulo_eleitoral), '')) <= 1 
       AND COUNT(DISTINCT dt_nascimento) <= 1
),
historico_pessoa AS (
    SELECT 
        c.id_candidato,
        COUNT(DISTINCT cd.id_candidatura) AS participacoes,
        COUNT(DISTINCT cd.id_candidatura) FILTER (WHERE r.situacao = 'ELEITO') AS vitorias,
        COUNT(DISTINCT cd.cargo) AS cargos_distintos,
        COUNT(DISTINCT cd.partido) AS siglas_distintas,
        MIN(cd.ano) AS primeiro_ano,
        MAX(cd.ano) AS ultimo_ano,
        MAX(cd.ano) - MIN(cd.ano) AS amplitude_temporal
    FROM Candidatura cd
    JOIN safe_people c USING (id_candidato)
    JOIN Resultado_Candidatura r USING (id_candidatura)
    GROUP BY c.id_candidato
)
SELECT 
    CASE 
        WHEN participacoes = 1 THEN 'Uma eleição observada'
        WHEN amplitude_temporal > 4 AND participacoes < (amplitude_temporal / 2) THEN 'Retorno com intervalo maior que quatro anos'
        ELSE 'Sequência sem intervalo maior que quatro anos'
    END AS grupo_trajetoria,
    COUNT(*) AS total_pessoas,
    SUM(vitorias) AS total_vitorias,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS participacao_grupo_pct,
    ROUND(100.0 * SUM(CASE WHEN vitorias > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) AS taxa_sucesso_pelo_menos_uma_vitoria_pct
FROM historico_pessoa
GROUP BY grupo_trajetoria
ORDER BY total_pessoas DESC;
