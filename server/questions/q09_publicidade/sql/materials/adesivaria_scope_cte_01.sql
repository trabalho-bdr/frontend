WITH scoped AS (
      SELECT c.id_candidatura id,c.nome_urna nome,c.numero_urna numero,c.uf,pt.sigla partido,
       e.ano,UPPER(e.cargo) cargo,CASE WHEN UPPER(e.cargo) IN ('VEREADOR','PREFEITO') THEN m.nome END municipio,
       CASE WHEN UPPER(e.cargo) IN ('VEREADOR','PREFEITO') THEN CAST(c.id_municipio AS VARCHAR) END municipio_id,
       c.gastos_campanha_total gastos,c.patrimonio
      FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
      LEFT JOIN __SQL_fragment_2__.main.Partido pt USING(id_partido) LEFT JOIN __SQL_fragment_3__.main.Municipio m USING(id_municipio)
      WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
       AND c.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR c.uf=?)
       AND (?='' OR UPPER(pt.sigla)=UPPER(?)) AND (?='' OR CAST(c.id_municipio AS VARCHAR)=?)
    ), raw AS (
      SELECT d.id_despesa,d.id_candidatura id,d.categoria,d.valor,__SQL_fragment_4__ tipo
      FROM __SQL_fragment_5__.main.Despesa_Candidatura d WHERE EXISTS(SELECT 1 FROM scoped s WHERE s.id=d.id_candidatura)
    ), selected AS (SELECT * FROM raw WHERE tipo IS NOT NULL AND (?='' OR tipo=?)),
    expense AS (
      SELECT id,COUNT(*) lancamentos,COUNT(valor) valores_informados,ROUND(SUM(valor),2) gastos_classificados
      FROM selected GROUP BY id
    ), result AS (
      SELECT r.id_candidatura id,
       CASE WHEN COUNT(DISTINCT r.votos)=1 THEN MAX(r.votos) END votos,
       CASE WHEN COUNT(DISTINCT r.resultado)=1 THEN MAX(r.resultado) END resultado,
       COUNT(DISTINCT r.votos)>1 OR COUNT(DISTINCT r.resultado)>1 conflito_resultado
      FROM __SQL_fragment_6__.main.Resultado_Candidatura r WHERE r.turno=1 AND EXISTS(SELECT 1 FROM scoped s WHERE s.id=r.id_candidatura)
      GROUP BY r.id_candidatura
    ), enriched AS (
      SELECT s.*,x.gastos_classificados,COALESCE(x.lancamentos,0) lancamentos,
       COALESCE(x.valores_informados,0) valores_informados,r.votos,r.resultado,
       COALESCE(r.conflito_resultado,FALSE) conflito_resultado
      FROM scoped s LEFT JOIN expense x USING(id) LEFT JOIN result r USING(id)
    ), ranked AS (
      SELECT *,CASE WHEN gastos_classificados IS NOT NULL THEN ROW_NUMBER() OVER(ORDER BY gastos_classificados DESC NULLS LAST,nome,id) END posicao_gastos,
       CASE WHEN votos IS NOT NULL THEN ROW_NUMBER() OVER(ORDER BY votos DESC NULLS LAST,nome,id) END posicao_votos
      FROM enriched
    )
