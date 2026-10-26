SELECT p.sigla partido,SUM(v.votos_nominais) nominais,SUM(v.votos_legenda) legenda,
      SUM(v.votos_nominais+v.votos_legenda) total,
      100.0*SUM(v.votos_legenda)/NULLIF(SUM(v.votos_nominais+v.votos_legenda),0) participacao_legenda
      FROM __SQL_fragment_0__.main.Votos_Partido_Municipio v JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
      JOIN __SQL_fragment_2__.main.Partido p USING(id_partido) WHERE v.id_municipio=? AND e.ano=? AND UPPER(e.cargo)=?
      AND e.turno=1 AND v.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      GROUP BY p.sigla ORDER BY total DESC NULLS LAST,p.sigla LIMIT 60
