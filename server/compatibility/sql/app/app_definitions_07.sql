WITH votos AS(SELECT e.ano,v.id_municipio,v.id_partido,SUM(v.votos_nominais+v.votos_legenda) total
       FROM __SQL_fragment_0__.main.Votos_Partido_Municipio v JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
       WHERE e.ano IN(2020,2024) AND UPPER(e.cargo)='VEREADOR' AND v.turno=1 GROUP BY 1,2,3),
       top AS(SELECT *,ROW_NUMBER() OVER(PARTITION BY ano,id_municipio ORDER BY total DESC,id_partido) rn FROM votos),
       prev AS(SELECT id_municipio,id_partido FROM top WHERE ano=2020 AND rn=1),
       curr AS(SELECT id_municipio,id_partido FROM top WHERE ano=2024 AND rn=1)
       SELECT COUNT(*) municipios,COUNT(*) FILTER(WHERE prev.id_partido=curr.id_partido) estaveis,
       ROUND(100.0*COUNT(*) FILTER(WHERE prev.id_partido=curr.id_partido)/NULLIF(COUNT(*),0),2) pct_estaveis
       FROM prev JOIN curr USING(id_municipio)
