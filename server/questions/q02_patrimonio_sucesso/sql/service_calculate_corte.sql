, valid AS (SELECT * FROM scoped WHERE patrimonio>=0 AND isfinite(patrimonio) AND situacao<>'INDEFINIDO')
     SELECT QUANTILE_CONT(patrimonio,?) corte FROM valid WHERE patrimonio>0
