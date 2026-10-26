SELECT m.id_municipio id,m.nome,m.uf,SUM(v.votos_nominais+v.votos_legenda) total,
          SUM(CASE WHEN ?='' OR p.sigla=? THEN v.votos_legenda ELSE 0 END) legenda,
          SUM(CASE WHEN ?='' OR p.sigla=? THEN v.votos_nominais+v.votos_legenda ELSE 0 END) total_selecionado,
          COUNT(*) FILTER(WHERE v.votos_nominais IS NULL OR v.votos_legenda IS NULL) incompletos
          FROM __SQL_fragment_0__.main.Votos_Partido_Municipio v JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao) JOIN __SQL_fragment_2__.main.Municipio m USING(id_municipio) JOIN __SQL_fragment_3__.main.Partido p USING(id_partido)
          WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND v.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
          AND m.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR m.uf=?) AND (?='' OR m.id_municipio=?) GROUP BY 1,2,3 ORDER BY m.nome
