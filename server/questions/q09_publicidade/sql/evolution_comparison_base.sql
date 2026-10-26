SELECT c.id_candidatura,c.id_candidato,c.uf,
 CASE WHEN upper(strip_accents(trim(e.cargo))) IN ('VEREADOR','PREFEITO') THEN c.id_municipio END id_municipio,
 e.ano,e.turno,c.nome_urna,p.sigla partido,coalesce(c.id_candidato,c.id_candidatura) pessoa
 FROM __SQL_fragment_0__ c JOIN __SQL_fragment_1__ e USING(id_eleicao)
 LEFT JOIN __SQL_fragment_2__ p USING(id_partido)
 WHERE e.ano IN (?,?) AND upper(strip_accents(trim(e.cargo)))=?
 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
 AND c.uf IN ('CE','MA','MS','RJ','RN','RS') AND (? IS NULL OR c.uf=?)
 AND (? IS NULL OR c.id_municipio=?) AND c.__SQL_fragment_3__=?
 QUALIFY row_number() OVER(PARTITION BY c.id_candidatura ORDER BY e.turno DESC)=1
