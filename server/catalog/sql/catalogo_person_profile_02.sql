SELECT COUNT(*) n,COUNT(DISTINCT NULLIF(TRIM(titulo_eleitoral),'')) documentos,
      COUNT(DISTINCT dt_nascimento) nascimentos FROM __SQL_fragment_0__.main.Candidato WHERE id_candidato=?
