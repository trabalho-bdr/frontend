WITH base AS (
 SELECT c.id_candidato,c.id_partido,e.cargo,
 date_diff('year',p.dt_nascimento,e.data)-CASE WHEN strftime(e.data,'%m-%d')<strftime(p.dt_nascimento,'%m-%d') THEN 1 ELSE 0 END idade,
 CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 'Eleitos' WHEN UPPER(r.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 'Não eleitos / suplentes' ELSE 'Indefinidos' END situacao
 FROM {db}.main.Candidatura c JOIN {db}.main.Candidato p USING(id_candidato)
 JOIN {db}.main.Eleicao e USING(id_eleicao)
 LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
 WHERE e.ano=2020 AND UPPER(e.cargo)='VEREADOR' AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
 AND (?='' OR c.uf=?)
 QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidato ORDER BY c.id_candidatura,r.id_resultado)=1
), future AS (
 SELECT DISTINCT c.id_candidato,c.id_partido,e.cargo FROM {db}.main.Candidatura c
 JOIN {db}.main.Eleicao e USING(id_eleicao)
 WHERE e.ano=2024 AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
), linked AS (
 SELECT b.*,EXISTS(SELECT 1 FROM future f WHERE f.id_candidato=b.id_candidato) voltou,
 EXISTS(SELECT 1 FROM future f WHERE f.id_candidato=b.id_candidato AND f.id_partido<>b.id_partido) trocou_partido,
 EXISTS(SELECT 1 FROM future f WHERE f.id_candidato=b.id_candidato AND UPPER(f.cargo)<>UPPER(b.cargo)) trocou_cargo
 FROM base b
) SELECT CASE WHEN idade BETWEEN 18 AND 29 THEN '18–29 anos' WHEN idade>=30 THEN '30 anos ou mais' ELSE 'Idade não informada' END faixa,
 situacao,COUNT(*) pessoas,COUNT(*) FILTER(WHERE voltou) retornos,
 COUNT(*) FILTER(WHERE trocou_partido) mudancas_partido,COUNT(*) FILTER(WHERE trocou_cargo) mudancas_cargo,
 100.0*COUNT(*) FILTER(WHERE voltou)/NULLIF(COUNT(*),0) taxa
 FROM linked GROUP BY 1,2 ORDER BY 1,2
