WITH ultimo AS (
    SELECT id_candidatura, resultado
    FROM "Resultado_Candidatura"
    QUALIFY row_number() OVER (PARTITION BY id_candidatura ORDER BY turno DESC) = 1
), base AS (
    SELECT c.id_candidatura, c.id_municipio, c.uf, c.patrimonio,
           CASE WHEN starts_with(upper(u.resultado), 'ELEITO') THEN 1
                WHEN upper(u.resultado) IN (__SQL_fragment_0__) THEN 0
           END AS eleito
    FROM "Candidatura" c
    JOIN "Cargo" cg ON cg.id_candidatura = c.id_candidatura
    JOIN "Eleicao" e ON e.id_eleicao = c.id_eleicao
    LEFT JOIN ultimo u ON u.id_candidatura = c.id_candidatura
    WHERE __SQL_fragment_1__
)
