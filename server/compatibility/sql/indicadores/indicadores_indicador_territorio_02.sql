WITH base AS (
    SELECT p.ano_participacao ano, m.uf, c.idhm,
           c.pib / NULLIF(c.populacao, 0) pib_pc,
           p.taxa_abstencao * 100 AS abstencao
    FROM __SQL_fragment_0__.main.Participacao_Eleitoral p
    JOIN __SQL_fragment_1__.main.Censo_Municipio c ON c.id_municipio = p.id_municipio AND c.ano_referencia = 2022
    JOIN __SQL_fragment_2__.main.Municipio m ON m.id_municipio = p.id_municipio
    WHERE p.ano_participacao = ?
)
SELECT uf,
       COUNT(*) municipios,
       ROUND(CORR(idhm, abstencao), 4) r_idhm,
       ROUND(CORR(pib_pc, abstencao), 4) r_pib_pc,
       ROUND(AVG(abstencao), 2) abstencao_media
FROM base
GROUP BY 1 ORDER BY 1
