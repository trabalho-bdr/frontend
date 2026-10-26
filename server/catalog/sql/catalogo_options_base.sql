WITH contests AS (
 SELECT c.*,e.ano,UPPER(e.cargo) cargo,e.data data_eleicao,
 ROW_NUMBER() OVER(PARTITION BY COALESCE(c.id_candidato,c.id_candidatura),e.ano,UPPER(e.cargo),c.uf,
 CASE WHEN UPPER(e.cargo) IN ('VEREADOR','PREFEITO') THEN c.id_municipio ELSE '' END
 ORDER BY e.turno DESC,c.id_candidatura) contest_rank
 FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
 WHERE e.ano BETWEEN 2002 AND 2024 AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
), b AS (
 SELECT c.id_candidatura id,c.id_candidato,c.ano,c.cargo,c.uf,pt.sigla partido,
 c.escolaridade_candidatura escolaridade,p.genero,p.raca,p.ocupacao
 FROM contests c LEFT JOIN __SQL_fragment_3__.main.Candidato p USING(id_candidato)
 LEFT JOIN __SQL_fragment_4__.main.Partido pt USING(id_partido)
 LEFT JOIN __SQL_fragment_5__.main.Municipio m USING(id_municipio)
 WHERE c.contest_rank=1
)
