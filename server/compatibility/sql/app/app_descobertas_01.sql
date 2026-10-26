SELECT c.id_candidatura id,c.nome_urna nome,c.numero_urna numero,
        p.sigla partido,c.uf,e.ano,UPPER(e.cargo) cargo,r.votos,
        ROUND(c.gastos_campanha_total,2) gastos,r.resultado
        FROM __SQL_fragment_0__.main.Candidatura c
        JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
        JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
        LEFT JOIN __SQL_fragment_3__.main.Partido p USING(id_partido)
        WHERE e.ano=? AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        AND (? IS NULL OR c.uf=?) AND r.votos IS NOT NULL
        ORDER BY r.votos DESC,c.id_candidatura LIMIT 12
