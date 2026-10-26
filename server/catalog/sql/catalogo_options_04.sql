SELECT MIN(ano) primeiro_ano,MAX(ano) ultimo_ano,COUNT(*) candidaturas,
      COUNT(DISTINCT id_candidato) pessoas FROM b
