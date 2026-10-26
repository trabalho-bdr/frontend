SELECT categoria,COUNT(*) registros,ROUND(SUM(valor),2) total
       FROM __SQL_fragment_0__.main.Despesa_Candidatura
       WHERE categoria ILIKE '%SANTINH%' OR categoria ILIKE '%ADESIV%'
       OR categoria ILIKE '%BANDEIRA%' OR categoria ILIKE '%IMPRESS%'
       GROUP BY 1 ORDER BY total DESC LIMIT 24
