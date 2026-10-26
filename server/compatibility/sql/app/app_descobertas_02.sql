SELECT m.nome,m.uf,p.eleitorado_apto eleitorado,
         ROUND(100*p.taxa_abstencao,2) percentual
         FROM __SQL_fragment_0__.main.Participacao_Eleitoral p JOIN __SQL_fragment_1__.main.Municipio m USING(id_municipio)
         WHERE p.ano_participacao=? AND p.eleitorado_apto>=10000 AND (? IS NULL OR m.uf=?)
         ORDER BY p.taxa_abstencao {order},m.nome LIMIT 10
