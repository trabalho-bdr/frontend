SELECT m.uf, COUNT(DISTINCT m.id_municipio) municipios,
       COUNT(c.id_candidatura) candidaturas
FROM __SQL_fragment_0__.main.Municipio m
LEFT JOIN __SQL_fragment_1__.main.Candidatura c ON c.id_municipio = m.id_municipio
GROUP BY m.uf ORDER BY m.uf
