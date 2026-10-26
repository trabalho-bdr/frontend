SELECT DISTINCT e.ano, upper(strip_accents(trim(e.cargo))) cargo
        FROM __SQL_fragment_0__ d JOIN __SQL_fragment_1__ c USING(id_candidatura)
        JOIN __SQL_fragment_2__ e USING(id_eleicao)
        WHERE e.ano IN (2018,2020,2022,2024) AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
        AND nullif(trim(e.cargo),'') IS NOT NULL ORDER BY e.ano DESC,cargo
