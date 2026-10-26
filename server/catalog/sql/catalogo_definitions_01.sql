WITH contests AS (
 SELECT c.*,e.ano,UPPER(e.cargo) cargo,e.data data_eleicao,
 ROW_NUMBER() OVER(PARTITION BY COALESCE(c.id_candidato,c.id_candidatura),e.ano,UPPER(e.cargo),c.uf,
 CASE WHEN UPPER(e.cargo) IN ('VEREADOR','PREFEITO') THEN c.id_municipio ELSE '' END
 ORDER BY e.turno DESC,c.id_candidatura) contest_rank
 FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING(id_eleicao)
 WHERE e.ano BETWEEN 2002 AND 2024 AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
 AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'
), last_results AS (
 SELECT * FROM __SQL_fragment_2__.main.Resultado_Candidatura
 QUALIFY DENSE_RANK() OVER(PARTITION BY id_candidatura ORDER BY turno DESC)=1
), results AS (
 SELECT id_candidatura,CASE WHEN COUNT(DISTINCT resultado)=1 THEN MAX(resultado) END resultado,
 CASE WHEN COUNT(DISTINCT votos)=1 THEN MAX(votos) END votos FROM last_results GROUP BY 1
), b0 AS (
 SELECT c.id_candidatura id,c.id_candidato,c.nome_urna nome,p.nome_civil,c.numero_urna numero,
 c.ano,c.cargo,c.uf,CASE WHEN c.cargo IN ('VEREADOR','PREFEITO') THEN c.id_municipio END municipio_id,
 CASE WHEN c.cargo IN ('VEREADOR','PREFEITO') THEN m.nome END municipio,
 pt.sigla partido,c.escolaridade_candidatura escolaridade,c.situacao_registro,
 p.genero,p.raca,p.ocupacao,c.patrimonio,c.gastos_campanha_total gastos,r.votos,r.resultado,
 CASE WHEN UPPER(r.resultado) IN ('ELEITO','ELEITO POR QP','ELEITO POR MÉDIA') THEN 'ELEITO'
 WHEN UPPER(r.resultado) IN ('NÃO ELEITO','NAO ELEITO') THEN 'NAO_ELEITO'
 WHEN UPPER(r.resultado)='SUPLENTE' THEN 'SUPLENTE' ELSE 'INDEFINIDO' END situacao,
 CASE WHEN p.dt_nascimento<=c.data_eleicao THEN date_diff('year',p.dt_nascimento,c.data_eleicao)
 -CASE WHEN strftime(c.data_eleicao,'%m-%d')<strftime(p.dt_nascimento,'%m-%d') THEN 1 ELSE 0 END END idade,
 c.sequencial
 FROM contests c LEFT JOIN __SQL_fragment_3__.main.Candidato p USING(id_candidato)
 LEFT JOIN __SQL_fragment_4__.main.Partido pt USING(id_partido) LEFT JOIN __SQL_fragment_5__.main.Municipio m USING(id_municipio)
 LEFT JOIN results r ON r.id_candidatura=c.id_candidatura WHERE c.contest_rank=1
), b AS (SELECT *,MIN(ano) OVER(PARTITION BY COALESCE(id_candidato,id)) primeiro_ano,
 COUNT(*) OVER(PARTITION BY COALESCE(id_candidato,id)) candidaturas_observadas FROM b0)
