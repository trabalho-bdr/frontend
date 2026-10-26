SELECT COUNT(*) candidaturas,COUNT(DISTINCT id_candidato) pessoas,
      MIN(ano) primeiro_ano,MAX(ano) ultimo_ano FROM b WHERE municipio_id=? AND cargo IN ('VEREADOR','PREFEITO')
