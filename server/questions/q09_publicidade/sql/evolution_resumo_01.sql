SELECT c.id_candidatura,c.id_candidato,c.uf,c.id_municipio,e.ano,p.sigla partido,
        coalesce(c.id_candidato,c.id_candidatura) pessoa
        FROM __SQL_fragment_0__ c JOIN __SQL_fragment_1__ e USING(id_eleicao)
        LEFT JOIN __SQL_fragment_2__ p USING(id_partido)
        WHERE e.ano IN (2018,2020,2022,2024) AND upper(strip_accents(trim(e.cargo)))=?
        AND c.uf IN ('CE','MA','MS','RJ','RN','RS') AND (? IS NULL OR c.uf=?) AND c.__SQL_fragment_3__=?
