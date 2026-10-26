SELECT m.id_municipio id, m.nome, m.uf,
       c.populacao, c.idhm,
       ROUND(c.pib / NULLIF(c.populacao, 0), 2) pib_per_capita,
       p.eleitorado_apto eleitorado,
       p.abstencoes,
       ROUND(100.0 * p.taxa_abstencao, 2) abstencao_pct
FROM __SQL_fragment_0__.main.Municipio m
JOIN __SQL_fragment_1__.main.Participacao_Eleitoral p USING(id_municipio)
LEFT JOIN __SQL_fragment_2__.main.Censo_Municipio c ON c.id_municipio = m.id_municipio AND c.ano_referencia = 2022
WHERE p.ano_participacao = ?
  AND (? = '' OR m.uf = ?)
ORDER BY m.uf, m.nome
