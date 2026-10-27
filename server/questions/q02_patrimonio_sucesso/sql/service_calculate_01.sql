, valid AS (SELECT *,CASE WHEN situacao='ELEITO' THEN 1 ELSE 0 END eleito FROM scoped WHERE patrimonio>=0 AND isfinite(patrimonio) AND situacao<>'INDEFINIDO'__SQL_fragment_0__),
     grouped AS (SELECT *, __SQL_fragment_1__ AS faixa FROM valid)
     SELECT faixa,COUNT(*) candidaturas,SUM(eleito) eleitos,MIN(patrimonio) minimo,MAX(patrimonio) maximo,MEDIAN(patrimonio) mediana FROM grouped GROUP BY faixa ORDER BY faixa
