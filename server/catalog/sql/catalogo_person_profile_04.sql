SELECT COUNT(*) candidaturas,MEDIAN(gastos) gasto_mediano,COUNT(gastos) despesas_conhecidas,
      MEDIAN(votos) votos_medianos,COUNT(votos) votos_conhecidos FROM b WHERE ano=? AND cargo=? AND uf=? AND __SQL_fragment_0__
