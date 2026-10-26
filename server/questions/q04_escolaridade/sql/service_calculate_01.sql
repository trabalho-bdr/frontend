SELECT (__SQL_fragment_0__) chave,SUM(quantidade_eleitores) quantidade FROM __SQL_fragment_1__.main.Perfil_Eleitorado_Municipio p JOIN __SQL_fragment_2__.main.Municipio m USING(id_municipio)
      WHERE p.ano=? __SQL_fragment_3__ AND (?='' OR m.uf=?) AND (?='' OR p.id_municipio=?) GROUP BY 1
