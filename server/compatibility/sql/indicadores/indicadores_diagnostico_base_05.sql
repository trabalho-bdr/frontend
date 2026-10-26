SELECT e.ano,UPPER(e.cargo) cargo,c.uf,COUNT(DISTINCT c.id_candidatura) candidaturas
          FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
          WHERE e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' GROUP BY 1,2,3 ORDER BY 1,2,3
