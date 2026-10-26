SELECT ano,COUNT(*) registros,COUNT(DISTINCT fonte) fontes,
      COUNT(*) FILTER(WHERE quantidade_eleitores IS NULL OR quantidade_eleitores<0) invalidos
      FROM __SQL_fragment_0__.main.Perfil_Eleitorado_Municipio WHERE id_municipio=? GROUP BY ano ORDER BY ano
