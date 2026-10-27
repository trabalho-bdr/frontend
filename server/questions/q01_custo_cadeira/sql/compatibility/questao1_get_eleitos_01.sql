SELECT DISTINCT c.id_candidatura id, c.id_candidato, c.id_municipio municipio_id, c.nome_urna nome, p.sigla partido,
        c.uf, m.nome municipio, r.votos, r.resultado,
        c.gastos_campanha_total gastos, c.patrimonio, c.idade_eleicao idade,
        c.escolaridade_candidatura escolaridade, c.sequencial, e.ano, UPPER(e.cargo) cargo
        FROM __SQL_fragment_0__.main.Candidatura c
        JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
        JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
        LEFT JOIN __SQL_fragment_3__.main.Partido p USING(id_partido)
        LEFT JOIN __SQL_fragment_4__.main.Municipio m USING(id_municipio)
        WHERE __SQL_fragment_5__
        ORDER BY r.votos DESC NULLS LAST, c.id_candidatura
        LIMIT ?
