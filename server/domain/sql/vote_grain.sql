SELECT COUNT(*) duplicate_groups FROM (
 SELECT id_eleicao,id_partido,id_municipio,turno FROM __SQL_database__.main.Votos_Partido_Municipio
 GROUP BY id_eleicao,id_partido,id_municipio,turno HAVING COUNT(*)>1)
