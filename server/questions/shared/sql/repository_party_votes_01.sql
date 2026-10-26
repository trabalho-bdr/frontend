SELECT e.ano,v.id_municipio,m.nome,m.uf,p.sigla partido,SUM(v.votos_nominais) nominais,SUM(v.votos_legenda) legenda
      FROM __SQL_fragment_0__.main.Votos_Partido_Municipio v JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao) JOIN __SQL_fragment_2__.main.Municipio m USING(id_municipio) JOIN __SQL_fragment_3__.main.Partido p USING(id_partido)
      WHERE e.ano BETWEEN 2002 AND 2024 AND UPPER(e.cargo)=? AND e.turno=1 AND v.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND m.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR m.uf=?) AND (?='' OR m.id_municipio=?) GROUP BY ALL ORDER BY e.ano,m.uf,m.nome,p.sigla
