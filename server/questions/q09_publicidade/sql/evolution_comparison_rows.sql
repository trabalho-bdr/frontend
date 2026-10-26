WITH base AS (__SQL_fragment_0__), final AS (
 SELECT * FROM base QUALIFY row_number() OVER(
  PARTITION BY pessoa,uf,id_municipio,ano ORDER BY turno DESC,id_candidatura)=1
), ultimo AS (
 SELECT b.pessoa,b.uf,b.id_municipio,b.ano,r.resultado,r.votos
 FROM base b JOIN __SQL_fragment_1__ r USING(id_candidatura)
 QUALIFY dense_rank() OVER(PARTITION BY b.pessoa,b.uf,b.id_municipio,b.ano ORDER BY r.turno DESC)=1
), resultados AS (
 SELECT pessoa,uf,id_municipio,ano,
 CASE WHEN count(DISTINCT resultado)=1 THEN max(resultado) END resultado,
 CASE WHEN count(DISTINCT votos)=1 THEN max(votos) END votos
 FROM ultimo GROUP BY ALL
), classificacao AS (
 SELECT unnest(?::VARCHAR[]) categoria,unnest(?::VARCHAR[]) padronizada,
 unnest(?::VARCHAR[]) grupo,unnest(?::BOOLEAN[]) publicidade,
 unnest(?::VARCHAR[]) status,unnest(?::BOOLEAN[]) revisar
), despesas_unicas AS (
 SELECT b.pessoa,b.uf,b.id_municipio,b.ano,d.id_despesa,d.categoria,
 CASE WHEN isfinite(d.valor) THEN try_cast(d.valor AS DECIMAL(24,2)) END dinheiro
 FROM base b JOIN __SQL_fragment_2__ d USING(id_candidatura)
 QUALIFY row_number() OVER(PARTITION BY d.id_despesa ORDER BY d.id_candidatura)=1
), despesas AS (
 SELECT d.*,n.grupo,n.revisar,
 (n.publicidade IS TRUE AND (?='sugeridas' OR (n.status='ALIAS_EXPLICITO' AND NOT n.revisar))) elegivel
 FROM despesas_unicas d LEFT JOIN classificacao n ON d.categoria IS NOT DISTINCT FROM n.categoria
)
SELECT b.id_candidatura,b.id_candidato,b.pessoa,b.uf,b.id_municipio,b.ano,b.nome_urna nome,b.partido,
 r.resultado,r.votos,
 CASE WHEN starts_with(upper(r.resultado),'ELEITO') THEN 1
 WHEN upper(r.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE') THEN 0 END eleito,
 CASE WHEN d.elegivel THEN d.grupo END grupo,
 sum(d.dinheiro) FILTER(WHERE d.elegivel) publicidade,
 sum(d.dinheiro) total_campanha,
 coalesce(sum(d.dinheiro) FILTER(WHERE d.elegivel AND d.revisar),0) em_revisao,
 count(d.id_despesa) despesas,
 count(d.id_despesa) FILTER(WHERE d.dinheiro IS NOT NULL) com_valor,
 count(d.id_despesa) FILTER(WHERE d.dinheiro IS NULL) sem_valor,
 count(d.id_despesa) FILTER(WHERE d.elegivel AND d.dinheiro IS NULL) publicidade_sem_valor,
 count(d.id_despesa) FILTER(WHERE d.elegivel AND d.dinheiro<0) ajustes_negativos
 FROM final b LEFT JOIN resultados r ON r.pessoa=b.pessoa AND r.uf=b.uf AND r.ano=b.ano
 AND r.id_municipio IS NOT DISTINCT FROM b.id_municipio
 LEFT JOIN despesas d ON d.pessoa=b.pessoa AND d.uf=b.uf AND d.ano=b.ano
 AND d.id_municipio IS NOT DISTINCT FROM b.id_municipio
 GROUP BY ALL ORDER BY b.ano,b.pessoa,grupo
