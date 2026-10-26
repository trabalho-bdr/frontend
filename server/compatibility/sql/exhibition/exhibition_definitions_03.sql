WITH votes AS (
 SELECT e.ano,v.id_municipio,v.id_partido,SUM(v.votos_nominais+v.votos_legenda) total
 FROM {db}.main.Votos_Partido_Municipio v JOIN {db}.main.Eleicao e USING(id_eleicao)
 WHERE e.ano IN (2020,2024) AND UPPER(e.cargo)='VEREADOR' AND e.turno=1 AND v.turno=1
 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' GROUP BY 1,2,3
), ranked AS (SELECT *,DENSE_RANK() OVER(PARTITION BY ano,id_municipio ORDER BY total DESC) pos FROM votes WHERE total>0),
 leaders AS (SELECT *,COUNT(*) OVER(PARTITION BY ano,id_municipio) leader_count FROM ranked WHERE pos=1)
 SELECT m.id_municipio id,m.nome,m.uf,p.sigla origem,q.sigla destino
 FROM leaders a JOIN leaders b ON a.id_municipio=b.id_municipio AND a.ano=2020 AND b.ano=2024
 JOIN {db}.main.Municipio m ON m.id_municipio=a.id_municipio
 JOIN {db}.main.Partido p ON p.id_partido=a.id_partido JOIN {db}.main.Partido q ON q.id_partido=b.id_partido
 WHERE a.leader_count=1 AND b.leader_count=1 AND (?='' OR m.uf=?) ORDER BY m.uf,m.nome
