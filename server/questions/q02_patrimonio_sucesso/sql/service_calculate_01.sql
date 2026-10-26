, valid AS (SELECT *,CASE WHEN situacao='ELEITO' THEN 1 ELSE 0 END eleito FROM scoped WHERE patrimonio>=0 AND isfinite(patrimonio) AND situacao<>'INDEFINIDO'),
     cuts AS (SELECT QUANTILE_CONT(patrimonio,.25) q1,QUANTILE_CONT(patrimonio,.5) q2,QUANTILE_CONT(patrimonio,.75) q3 FROM valid WHERE patrimonio>0),
     grouped AS (SELECT *,CASE WHEN patrimonio=0 THEN 0 WHEN patrimonio<=q1 THEN 1 WHEN patrimonio<=q2 THEN 2 WHEN patrimonio<=q3 THEN 3 ELSE 4 END faixa FROM valid CROSS JOIN cuts)
     SELECT faixa,COUNT(*) candidaturas,SUM(eleito) eleitos,MIN(patrimonio) minimo,MAX(patrimonio) maximo,MEDIAN(patrimonio) mediana FROM grouped GROUP BY faixa ORDER BY faixa
