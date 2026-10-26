SELECT f.imagem,f.mime_type,f.sha256,f.url_fonte FROM __SQL_fragment_0__.main.Foto_Candidato f
      JOIN __SQL_fragment_1__.main.Candidatura c ON c.id_candidato=f.id_candidato AND c.uf=f.uf AND c.sequencial=f.sq_candidato
      JOIN __SQL_fragment_2__.main.Eleicao e ON e.id_eleicao=c.id_eleicao AND e.ano=f.ano_foto
      WHERE c.id_candidatura=? AND __SQL_fragment_3__ ORDER BY f.coletada_em DESC LIMIT 1
