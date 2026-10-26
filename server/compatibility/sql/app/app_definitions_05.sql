SELECT e.ano,UPPER(e.cargo) cargo,
       SUM(v.votos_legenda) legenda,SUM(v.votos_nominais) nominal,
       ROUND(100*SUM(v.votos_legenda)/NULLIF(SUM(v.votos_legenda+v.votos_nominais),0),2) pct_legenda
       FROM __SQL_fragment_0__.main.Votos_Partido_Municipio v JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
       WHERE UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL') AND v.turno=1 AND e.turno=1
       GROUP BY 1,2 ORDER BY 1,2
