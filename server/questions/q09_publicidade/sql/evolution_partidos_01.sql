SELECT DISTINCT p.id_partido,p.sigla,p.nome
        FROM __SQL_fragment_0__ c JOIN __SQL_fragment_1__ e USING(id_eleicao)
        JOIN __SQL_fragment_2__ p USING(id_partido)
        WHERE e.ano IN (2018,2020,2022,2024) AND upper(strip_accents(trim(e.cargo)))=?
        AND c.uf IN ('CE','MA','MS','RJ','RN','RS') AND (? IS NULL OR c.uf=?)
        AND (? IS NULL OR c.id_municipio=?)
        ORDER BY p.sigla,p.id_partido
