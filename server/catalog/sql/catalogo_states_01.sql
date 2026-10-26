SELECT m.uf,COUNT(DISTINCT m.id_municipio) municipios,a.candidaturas,a.pessoas,a.primeiro_ano,a.ultimo_ano
      FROM __SQL_fragment_0__.main.Municipio m LEFT JOIN (SELECT uf,COUNT(*) candidaturas,COUNT(DISTINCT id_candidato) pessoas,
      MIN(ano) primeiro_ano,MAX(ano) ultimo_ano FROM b GROUP BY uf) a ON a.uf=m.uf
      WHERE m.uf IN ('CE','MA','MS','RJ','RN','RS') GROUP BY ALL ORDER BY m.uf
