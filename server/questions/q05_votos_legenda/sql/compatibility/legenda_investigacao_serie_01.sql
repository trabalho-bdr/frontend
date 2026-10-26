SELECT e.ano, SUM(v.votos_legenda) legenda,
      SUM(v.votos_nominais) nominais,
      SUM(v.votos_legenda + v.votos_nominais) total,
      100.0*SUM(v.votos_legenda)/NULLIF(SUM(v.votos_legenda + v.votos_nominais),0) percentual,
      COUNT(DISTINCT v.id_municipio) municipios
      FROM {db}.main.Votos_Partido_Municipio v
      JOIN {db}.main.Eleicao e USING(id_eleicao)
      JOIN {db}.main.Municipio m USING(id_municipio)
      JOIN {db}.main.Partido p USING(id_partido)
      WHERE e.ano IN (?,?) AND UPPER(e.cargo)=? AND e.turno=1 AND v.turno=1
      AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND m.uf IN ('CE','MA','MS','RJ','RN','RS')
      AND (?='' OR m.uf=?) AND (?='' OR p.sigla=?)
      AND (?='' OR CAST(m.id_municipio AS VARCHAR)=?)
      GROUP BY e.ano ORDER BY e.ano
