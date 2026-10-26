SELECT COUNT(*) missing_people FROM __SQL_database__.main.Candidatura c
 WHERE NOT EXISTS(SELECT 1 FROM __SQL_database__.main.Candidato p WHERE p.id_candidato=c.id_candidato)
