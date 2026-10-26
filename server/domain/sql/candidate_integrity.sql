SELECT COUNT(*) registros, COUNT(*)-COUNT(DISTINCT id_candidatura) duplicate_ids,
 COUNT(*) FILTER(WHERE id_candidato IS NULL) missing_person,
 COUNT(*) FILTER(WHERE patrimonio IS NULL) unknown_wealth,
 COUNT(*) FILTER(WHERE patrimonio=0) zero_wealth,
 COUNT(*) FILTER(WHERE patrimonio<0) negative_wealth,
 COUNT(*) FILTER(WHERE gastos_campanha_total IS NULL) unknown_expenses,
 COUNT(*) FILTER(WHERE gastos_campanha_total=0) zero_expenses
 FROM __SQL_database__.main.Candidatura
