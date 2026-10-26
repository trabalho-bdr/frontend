SELECT COUNT(*) quantidade,ROUND(SUM(valor),2) total
        FROM __SQL_fragment_0__.main.Despesa_Candidatura WHERE id_candidatura=?
