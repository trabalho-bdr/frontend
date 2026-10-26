SELECT id_despesa id,categoria,ROUND(valor,2) valor
        FROM __SQL_fragment_0__.main.Despesa_Candidatura WHERE id_candidatura=? AND (?='' OR categoria=?)
        ORDER BY valor DESC NULLS LAST,id_despesa LIMIT ? OFFSET ?
