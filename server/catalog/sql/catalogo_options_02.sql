SELECT 'partido' campo,partido valor FROM b WHERE __SQL_fragment_0__ AND partido IS NOT NULL GROUP BY 2
      UNION ALL SELECT 'escolaridade',escolaridade FROM b WHERE __SQL_fragment_1__ GROUP BY 2
      UNION ALL SELECT 'genero',genero FROM b WHERE __SQL_fragment_2__ GROUP BY 2
      UNION ALL SELECT 'raca',raca FROM b WHERE __SQL_fragment_3__ GROUP BY 2
      UNION ALL SELECT 'ocupacao',ocupacao FROM b WHERE __SQL_fragment_4__ GROUP BY 2 ORDER BY 1,2
