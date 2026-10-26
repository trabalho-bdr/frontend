WITH observed AS (
    SELECT c.id_candidato,c.id_candidatura,c.id_partido,e.ano,UPPER(e.cargo) cargo,r.resultado
    FROM __SQL_fragment_0__.main.Candidatura c
    JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
    LEFT JOIN __SQL_fragment_2__.main.Resultado_Candidatura r ON r.id_candidatura = c.id_candidatura
    WHERE e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND e.ano BETWEEN 2002 AND 2024
    AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
    QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidato,e.ano,UPPER(e.cargo),c.uf,c.id_municipio
      ORDER BY e.turno DESC,r.turno DESC,c.id_candidatura)=1
), s AS (
    SELECT id_candidato,COUNT(DISTINCT ano) n_anos,COUNT(DISTINCT id_partido) n_partidos,
           COUNT(DISTINCT cargo) n_cargos,
           COUNT(DISTINCT CASE WHEN UPPER(resultado) LIKE 'ELEITO%' THEN id_candidatura END) vitorias
    FROM observed
    GROUP BY 1
)
SELECT 
    COUNT(*) total_pessoas,
    COUNT(*) FILTER(WHERE n_anos > 1) multi_anos,
    COUNT(*) FILTER(WHERE n_anos >= 3) tres_ou_mais_anos,
    COUNT(*) FILTER(WHERE n_partidos > 1) multi_partidos,
    COUNT(*) FILTER(WHERE n_cargos > 1) multi_cargos,
    COUNT(*) FILTER(WHERE vitorias >= 2) multi_vitorias,
    ROUND(100.0 * COUNT(*) FILTER(WHERE n_anos > 1) / NULLIF(COUNT(*), 0), 2) pct_retorno,
    ROUND(100.0 * COUNT(*) FILTER(WHERE n_partidos > 1) / NULLIF(COUNT(*), 0), 2) pct_troca_partido
FROM s
