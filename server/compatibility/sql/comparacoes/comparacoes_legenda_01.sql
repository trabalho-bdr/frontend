SELECT e.ano ano, __SQL_fragment_0__ serie,
      ROUND(100.0*SUM(v.votos_legenda)/NULLIF(SUM(v.votos_legenda+v.votos_nominais),0),2) valor,
      SUM(v.votos_legenda) legenda,SUM(v.votos_nominais) nominais
      FROM __SQL_fragment_1__.main.Votos_Partido_Municipio v
      JOIN __SQL_fragment_2__.main.Eleicao e USING(id_eleicao)
      JOIN __SQL_fragment_3__.main.Partido p USING(id_partido)
      JOIN __SQL_fragment_4__.main.Municipio m USING(id_municipio)
      WHERE UPPER(e.cargo)=? AND e.ano IN (?,?) AND v.turno=1 AND e.turno=1
      AND (?='' OR m.uf=?) __SQL_fragment_5__
      GROUP BY 1,2 ORDER BY 1,2
