SELECT DISTINCT e.ano AS ano, upper(cg.nome) AS cargo
FROM "Candidatura" c
JOIN "Cargo" cg ON cg.id_candidatura = c.id_candidatura
JOIN "Eleicao" e ON e.id_eleicao = c.id_eleicao
WHERE upper(cg.nome) IN (__SQL_fragment_0__) AND e.ano IN (__SQL_fragment_1__)
