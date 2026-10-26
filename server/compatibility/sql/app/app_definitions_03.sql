WITH b AS (SELECT a.ano_participacao ano,m.uf,c.idhm,
       c.pib/NULLIF(c.populacao,0) pib_pc, c.populacao,a.taxa_abstencao
       FROM __SQL_fragment_0__.main.Participacao_Eleitoral a
       JOIN __SQL_fragment_1__.main.Censo_Municipio c ON c.id_municipio=a.id_municipio AND c.ano_referencia=2022
       JOIN __SQL_fragment_2__.main.Municipio m ON m.id_municipio=a.id_municipio)
       SELECT ano,uf,COUNT(*) municipios,ROUND(CORR(idhm,taxa_abstencao),4) r_idhm,
       ROUND(CORR(pib_pc,taxa_abstencao),4) r_pib_pc,
       ROUND(AVG(taxa_abstencao)*100,2) abstencao_media
       FROM b GROUP BY 1,2 ORDER BY 1,2
