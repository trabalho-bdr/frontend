SELECT m.id_municipio id,m.nome,m.uf,c.populacao,c.idhm,
 c.pib/NULLIF(c.populacao,0) pib_per_capita,p.eleitorado_apto eleitorado,
 p.abstencoes,100.0*p.taxa_abstencao abstencao
 FROM {db}.main.Municipio m
 JOIN {db}.main.Participacao_Eleitoral p USING(id_municipio)
 LEFT JOIN {db}.main.Censo_Municipio c ON c.id_municipio=m.id_municipio AND c.ano_referencia=2022
 WHERE p.ano_participacao=? AND (?='' OR m.uf=?)
 ORDER BY m.uf,m.nome
