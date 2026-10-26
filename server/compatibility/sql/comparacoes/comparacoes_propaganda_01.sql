WITH base AS (
      SELECT e.ano,CASE WHEN UPPER(TRIM(d.categoria)) LIKE 'SANTINH%' THEN 'Santinhos'
       WHEN UPPER(TRIM(d.categoria)) LIKE 'ADESIV%' THEN 'Adesivos'
       WHEN UPPER(TRIM(d.categoria)) LIKE 'BANDEIRA%' THEN 'Bandeiras' END serie,d.valor
      FROM __SQL_fragment_0__.main.Despesa_Candidatura d
      JOIN __SQL_fragment_1__.main.Candidatura c USING(id_candidatura)
      JOIN __SQL_fragment_2__.main.Eleicao e USING(id_eleicao)
      JOIN __SQL_fragment_3__.main.Partido p USING(id_partido)
      WHERE e.ano IN (?,?) AND UPPER(e.cargo)=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
        AND (?='' OR c.uf=?) AND (?='' OR p.sigla=?)
    ) SELECT ano,serie,COUNT(*) lancamentos,ROUND(SUM(valor),2) valor
      FROM base WHERE serie IS NOT NULL GROUP BY 1,2 ORDER BY 1,2
