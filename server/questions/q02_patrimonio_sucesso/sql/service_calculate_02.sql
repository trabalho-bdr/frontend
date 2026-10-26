SELECT COUNT(*) candidaturas,COUNT(*) FILTER(WHERE patrimonio>=0 AND isfinite(patrimonio)) conhecidos,
      COUNT(*) FILTER(WHERE situacao<>'INDEFINIDO') definidos FROM scoped
