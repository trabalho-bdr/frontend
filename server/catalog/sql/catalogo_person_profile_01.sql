SELECT categoria,COUNT(*) registros,SUM(valor) valor FROM __SQL_fragment_0__.main.Despesa_Candidatura
      WHERE id_candidatura=? GROUP BY categoria ORDER BY valor DESC NULLS LAST,categoria LIMIT 20
