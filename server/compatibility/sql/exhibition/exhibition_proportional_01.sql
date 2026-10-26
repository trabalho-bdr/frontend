WITH base AS (SELECT c.id_candidatura id,c.id_candidato,c.id_eleicao,c.id_municipio,c.nome_urna nome,c.numero_urna numero,p.sigla partido,m.nome municipio,c.uf,e.ano,UPPER(e.cargo) cargo,
      r.votos,r.resultado,c.gastos_campanha_total gastos
      FROM {db}.main.Candidatura c JOIN {db}.main.Eleicao e USING(id_eleicao)
      JOIN {db}.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
      LEFT JOIN {db}.main.Municipio m USING(id_municipio) JOIN {db}.main.Partido p USING(id_partido)
      WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
      AND c.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR c.uf=?) AND (?='' OR c.id_municipio=?)
      QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado)=1
      ), ranked AS (
        SELECT *,CASE WHEN cargo='VEREADOR' THEN id_municipio ELSE '' END territory,
        ROW_NUMBER() OVER (
          PARTITION BY id_eleicao,uf,CASE WHEN cargo='VEREADOR' THEN id_municipio ELSE '' END,
            CASE WHEN UPPER(resultado) LIKE 'ELEITO%' THEN 1 ELSE 0 END
          ORDER BY CASE WHEN UPPER(resultado) LIKE 'ELEITO%' THEN votos END ASC NULLS LAST,
            CASE WHEN UPPER(resultado) NOT LIKE 'ELEITO%' THEN votos END DESC NULLS LAST,id
        ) selection_rank
        FROM base WHERE votos IS NOT NULL
        AND (cargo<>'VEREADOR' OR id_municipio IS NOT NULL)
        AND (UPPER(resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') OR UPPER(resultado) LIKE 'ELEITO%')
      ), pairs AS (
        SELECT a.id maior,b.id menor FROM ranked a JOIN ranked b
        ON a.id_eleicao=b.id_eleicao AND a.uf=b.uf AND a.territory=b.territory
        WHERE a.selection_rank=1 AND b.selection_rank=1
        AND UPPER(a.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE')
        AND UPPER(b.resultado) LIKE 'ELEITO%' AND a.votos>b.votos
        ORDER BY a.votos-b.votos DESC,a.id,b.id LIMIT 1)
      SELECT base.* FROM base JOIN pairs ON base.id IN (pairs.maior,pairs.menor) ORDER BY votos DESC
