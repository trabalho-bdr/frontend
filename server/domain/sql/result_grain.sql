SELECT COUNT(*) duplicate_groups FROM (
 SELECT id_candidatura,turno FROM __SQL_database__.main.Resultado_Candidatura
 GROUP BY id_candidatura,turno HAVING COUNT(*)>1)
