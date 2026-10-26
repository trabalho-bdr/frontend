WITH base AS (
      SELECT c.id_candidatura,c.uf,COALESCE(NULLIF(TRIM(c.escolaridade_candidatura),''),'NÃO INFORMADA') serie,
        MAX(CASE WHEN UPPER(TRIM(r.resultado)) LIKE 'ELEITO%' THEN 1 ELSE 0 END) eleita,
        MAX(CASE WHEN UPPER(TRIM(r.resultado)) LIKE 'ELEITO%'
          OR UPPER(TRIM(r.resultado)) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 1 ELSE 0 END) definida
      FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
      LEFT JOIN __SQL_fragment_2__.main.Resultado_Candidatura r USING(id_candidatura)
      WHERE e.ano=? AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        AND (c.uf IN ('CE','MA','MS','RJ','RN','RS') OR c.uf='BR')
      GROUP BY 1,2,3
    ), grupos AS (
      SELECT CASE WHEN ?='' THEN 'SEIS UFS' ELSE uf END uf,serie,
        COUNT(*) candidaturas,SUM(eleita) eleitos,SUM(definida) definidos,
        COUNT(*)-SUM(definida) excluidos
      FROM base WHERE ?='' OR uf=? GROUP BY 1,2
    ) SELECT uf,serie,candidaturas,eleitos,definidos,excluidos,
      ROUND(100.0*eleitos/NULLIF(definidos,0),2) valor
      FROM grupos ORDER BY candidaturas DESC,serie
