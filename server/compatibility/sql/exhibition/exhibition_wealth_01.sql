WITH b AS (
      SELECT c.id_candidatura,c.patrimonio,
      CASE WHEN UPPER(r.resultado) LIKE 'ELEITO%' THEN 1 WHEN UPPER(r.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 0 END eleito
      FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
      LEFT JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
      WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND (?='' OR c.uf=?)
      QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado)=1
    ), q AS (SELECT *,NTILE(4) OVER(ORDER BY patrimonio,id_candidatura) quartil FROM b WHERE patrimonio>=0 AND eleito IS NOT NULL)
    SELECT quartil,COUNT(*) candidaturas,SUM(eleito) eleitos,100.0*AVG(eleito) taxa,MEDIAN(patrimonio) mediana FROM q GROUP BY 1 ORDER BY 1
