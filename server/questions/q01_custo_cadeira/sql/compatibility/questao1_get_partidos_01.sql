SELECT DISTINCT p.sigla partido FROM __SQL_fragment_0__.main.Candidatura c
        JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
        JOIN __SQL_fragment_2__.main.Partido p USING(id_partido)
        WHERE e.ano=? AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
          AND c.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR c.uf=?)
        ORDER BY p.sigla
