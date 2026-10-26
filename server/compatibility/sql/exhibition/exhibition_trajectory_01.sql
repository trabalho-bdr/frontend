SELECT c.id_candidatura id,e.ano,UPPER(e.cargo) cargo,p.sigla partido,c.uf,m.nome municipio,
      r.votos,r.resultado,c.gastos_campanha_total gastos,c.patrimonio,c.escolaridade_candidatura escolaridade,
      date_diff('year',person.dt_nascimento,e.data)-CASE WHEN strftime(e.data,'%m-%d')<strftime(person.dt_nascimento,'%m-%d') THEN 1 ELSE 0 END idade
      FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
      LEFT JOIN {db}.main.Candidato person USING(id_candidato)
      LEFT JOIN {db}.main.Partido p USING(id_partido) LEFT JOIN {db}.main.Municipio m USING(id_municipio)
      LEFT JOIN {db}.main.Resultado_Candidatura r USING(id_candidatura)
      WHERE c.id_candidato=(SELECT id_candidato FROM {db}.main.Candidatura WHERE id_candidatura=? LIMIT 1)
      AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND e.ano BETWEEN 2002 AND 2024
      QUALIFY ROW_NUMBER() OVER(PARTITION BY e.ano,e.cargo,c.uf,c.id_municipio ORDER BY e.turno DESC,r.turno DESC,c.id_candidatura)=1
      ORDER BY e.ano,e.cargo
