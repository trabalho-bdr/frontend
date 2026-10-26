WITH base AS (
    SELECT c.id_candidatura, c.id_partido, p.sigla partido,
           c.uf, c.id_municipio,
           r.votos,
           CASE 
               WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 'ELEITO'
               WHEN UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO') THEN 'NÃO ELEITO'
               WHEN UPPER(r.resultado) = 'SUPLENTE' THEN 'SUPLENTE'
               ELSE 'INDEFINIDO'
           END situacao
    FROM __SQL_fragment_0__.main.Candidatura c
    JOIN __SQL_fragment_1__.main.Eleicao e ON c.id_eleicao = e.id_eleicao
    LEFT JOIN __SQL_fragment_2__.main.Partido p ON c.id_partido = p.id_partido
    LEFT JOIN __SQL_fragment_3__.main.Resultado_Candidatura r ON c.id_candidatura = r.id_candidatura AND r.turno = 1
    WHERE e.ano = ? AND UPPER(e.cargo) = ? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND (? = '' OR c.uf = ?)
      AND (? = '' OR c.id_municipio = ?)
      AND (? = '' OR UPPER(p.sigla) = ?)
    QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado) = 1
)
SELECT 
    COUNT(*) total_candidaturas,
    COUNT(*) FILTER(WHERE situacao = 'ELEITO') eleitos,
    COUNT(*) FILTER(WHERE situacao = 'NÃO ELEITO') nao_eleitos,
    COUNT(*) FILTER(WHERE situacao = 'SUPLENTE') suplentes,
    COUNT(*) FILTER(WHERE situacao = 'INDEFINIDO') indefinidos,
    COUNT(*) FILTER(WHERE situacao IN ('ELEITO', 'NÃO ELEITO', 'SUPLENTE')) definidos,
    ROUND(100.0 * COUNT(*) FILTER(WHERE situacao = 'ELEITO') / 
          NULLIF(COUNT(*) FILTER(WHERE situacao IN ('ELEITO', 'NÃO ELEITO', 'SUPLENTE')), 0), 2) taxa_eleicao_pct,
    COALESCE(SUM(votos), 0) votos_nominais_totais,
    ROUND(MEDIAN(votos) FILTER(WHERE situacao = 'ELEITO'), 1) mediana_votos_eleitos,
    ROUND(MEDIAN(votos) FILTER(WHERE situacao != 'ELEITO'), 1) mediana_votos_nao_eleitos
FROM base
