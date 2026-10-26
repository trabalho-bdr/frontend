SELECT DISTINCT e.ano AS ano, upper(cg.nome) AS cargo
FROM __SQL_fragment_0__.main.Candidatura c
JOIN __SQL_fragment_1__.main.Cargo cg ON cg.id_candidatura = c.id_candidatura
JOIN __SQL_fragment_2__.main.Eleicao e ON e.id_eleicao = c.id_eleicao
WHERE upper(cg.nome) IN (__SQL_fragment_3__) AND e.ano IN (__SQL_fragment_4__)
