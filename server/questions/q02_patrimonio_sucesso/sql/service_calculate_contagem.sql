, valid AS (SELECT * FROM scoped WHERE patrimonio>=0 AND isfinite(patrimonio) AND situacao<>'INDEFINIDO')
     SELECT COUNT(*) n FROM valid WHERE patrimonio>0
