WITH votes AS (
 SELECT v.id_partido,SUM(v.votos_nominais) nominais,SUM(v.votos_legenda) legenda
 FROM {db}.main.Votos_Partido_Municipio v
 JOIN {db}.main.Eleicao e USING(id_eleicao)
 JOIN {db}.main.Municipio m USING(id_municipio)
 WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND v.turno=1
 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND (?='' OR m.uf=?) GROUP BY 1
), candidates AS (
 SELECT c.id_candidatura,c.id_partido,r.resultado
 FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
 LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
 WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1
 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND (?='' OR c.uf=?)
 QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado)=1
), seats AS (
 SELECT id_partido,COUNT(*) candidaturas,
 COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%') eleitos,
 COUNT(*) FILTER(WHERE UPPER(resultado) LIKE 'ELEITO%' OR UPPER(resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE')) definidos
 FROM candidates GROUP BY 1
) SELECT p.sigla partido,v.nominais,v.legenda,v.nominais+v.legenda votos,
 s.candidaturas,s.eleitos,s.definidos,100.0*s.eleitos/NULLIF(s.definidos,0) taxa
 FROM votes v JOIN {db}.main.Partido p USING(id_partido) LEFT JOIN seats s USING(id_partido)
 ORDER BY votos DESC
