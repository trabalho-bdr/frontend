SELECT categoria, COUNT(*) quantidade, ROUND(SUM(valor),2) valor
        FROM __SQL_fragment_0__.main.Despesa_Candidatura WHERE id_candidatura=?
        GROUP BY categoria ORDER BY valor DESC NULLS LAST LIMIT 24
