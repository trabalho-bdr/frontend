SELECT c.id_candidatura id,c.id_candidato,c.id_municipio,c.nome_urna nome,c.numero_urna numero,p.sigla partido,
 UPPER(e.cargo) cargo,e.ano,c.uf,m.nome municipio,c.escolaridade_candidatura escolaridade,
 c.patrimonio patrimonio,c.gastos_campanha_total gastos,r.resultado resultado,r.votos votos,
 COUNT(*) OVER() total_encontrado
FROM __SQL_fragment_0__.main.Candidatura c
JOIN __SQL_fragment_1__.main.Eleicao e ON c.id_eleicao=e.id_eleicao
LEFT JOIN __SQL_fragment_2__.main.Partido p ON c.id_partido=p.id_partido
LEFT JOIN __SQL_fragment_3__.main.Municipio m ON c.id_municipio=m.id_municipio
LEFT JOIN __SQL_fragment_4__.main.Resultado_Candidatura r ON c.id_candidatura=r.id_candidatura
WHERE e.ano=? AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
  AND e.turno=1 AND (r.turno=1 OR r.turno IS NULL)
  AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
  AND (strip_accents(COALESCE(c.nome_urna,'')) ILIKE strip_accents(?) OR strip_accents(COALESCE(m.nome,'')) ILIKE strip_accents(?) OR strip_accents(COALESCE(p.sigla,'')) ILIKE strip_accents(?) OR CAST(c.numero_urna AS VARCHAR) ILIKE ?)
  AND (? IS NULL OR c.uf=?)
  AND (?='' OR UPPER(p.sigla)=UPPER(?))
  AND (?='' OR UPPER(e.cargo)=UPPER(?))
  AND (?='' OR (?='ELEITO' AND UPPER(COALESCE(r.resultado,'')) LIKE 'ELEITO%')
       OR (?='NÃO ELEITO' AND UPPER(COALESCE(r.resultado,'')) IN ('NÃO ELEITO','NAO ELEITO'))
       OR (?='SUPLENTE' AND UPPER(COALESCE(r.resultado,''))='SUPLENTE'))
AND (?='' OR c.id_municipio=?)
ORDER BY __SQL_fragment_5__,c.nome_urna,c.id_candidatura
LIMIT ? OFFSET ?
