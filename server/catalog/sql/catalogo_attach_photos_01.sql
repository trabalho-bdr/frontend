WITH ranked AS (
      SELECT f.id_candidato,c.id_candidatura foto_id,f.ano_foto,
        ROW_NUMBER() OVER (PARTITION BY f.id_candidato
          ORDER BY f.ano_foto DESC,f.coletada_em DESC NULLS LAST,c.id_candidatura,f.sha256) photo_rank
      FROM __SQL_fragment_0__.main.Foto_Candidato f
      JOIN __SQL_fragment_1__.main.Candidatura c ON c.id_candidato=f.id_candidato AND c.uf=f.uf AND c.sequencial=f.sq_candidato
      JOIN __SQL_fragment_2__.main.Eleicao e ON e.id_eleicao=c.id_eleicao AND e.ano=f.ano_foto
      WHERE f.id_candidato IN (__SQL_fragment_3__) AND __SQL_fragment_4__
        AND NOT EXISTS (SELECT 1 FROM __SQL_fragment_5__.main.Candidato identity_row
          WHERE identity_row.id_candidato=f.id_candidato
          HAVING COUNT(DISTINCT NULLIF(TRIM(identity_row.titulo_eleitoral),''))>1
            OR COUNT(DISTINCT identity_row.dt_nascimento)>1)
    ) SELECT id_candidato,foto_id,ano_foto FROM ranked WHERE photo_rank=1
