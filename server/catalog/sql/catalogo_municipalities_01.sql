SELECT id_municipio id,nome,uf,regiao FROM __SQL_fragment_0__.main.Municipio
      WHERE uf=? AND strip_accents(nome) ILIKE strip_accents(?) ORDER BY nome,id_municipio LIMIT ? OFFSET ?
