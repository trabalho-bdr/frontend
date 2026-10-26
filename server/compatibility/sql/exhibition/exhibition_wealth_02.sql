SELECT COUNT(*) total,COUNT(*) FILTER(WHERE patrimonio>=0) conhecidos,
     100.0*COUNT(*) FILTER(WHERE patrimonio>=0)/NULLIF(COUNT(*),0) cobertura_pct FROM b
