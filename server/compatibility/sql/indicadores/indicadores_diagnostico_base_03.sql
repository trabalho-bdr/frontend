SELECT ano, UPPER(cargo) cargo, COUNT(*) pleitos
FROM __SQL_fragment_0__.main.Eleicao
WHERE tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
GROUP BY 1, 2 ORDER BY 1 DESC, 2
