WITH base AS (__SQL_fragment_0__), ultimo AS (
        SELECT r.turno,r.resultado,b.pessoa,b.uf,b.id_municipio,b.ano
        FROM __SQL_fragment_1__ r JOIN base b USING(id_candidatura)
        QUALIFY dense_rank() OVER (PARTITION BY b.pessoa,b.uf,b.id_municipio,b.ano ORDER BY r.turno DESC)=1
    ), resultado AS (
        SELECT pessoa,uf,id_municipio,ano,
            CASE WHEN count(DISTINCT resultado)=1 THEN max(resultado) END resultado
        FROM ultimo GROUP BY pessoa,uf,id_municipio,ano
    ), classificacao AS (
        SELECT unnest(?::VARCHAR[]) categoria,unnest(?::VARCHAR[]) padronizada,
            unnest(?::VARCHAR[]) grupo,unnest(?::BOOLEAN[]) publicidade,
            unnest(?::VARCHAR[]) status,unnest(?::BOOLEAN[]) revisar
    ), despesas AS (
        SELECT d.*,CASE WHEN isfinite(d.valor) THEN try_cast(d.valor AS DECIMAL(24,2)) END dinheiro,
            n.grupo,n.revisar,(n.publicidade IS TRUE AND (?='sugeridas' OR
            (n.status='ALIAS_EXPLICITO' AND NOT n.revisar))) elegivel
        FROM __SQL_fragment_2__ d JOIN base USING(id_candidatura)
        LEFT JOIN classificacao n ON d.categoria IS NOT DISTINCT FROM n.categoria
    ) SELECT min(b.id_candidatura) id_candidatura,b.id_candidato,b.uf,b.id_municipio,b.ano,b.pessoa,
        string_agg(DISTINCT b.partido,' / ' ORDER BY b.partido) partido,r.resultado,
        CASE WHEN starts_with(upper(r.resultado),'ELEITO') THEN 1
             WHEN upper(r.resultado) IN (__SQL_fragment_3__) THEN 0 END eleito,
        CASE WHEN d.elegivel THEN d.grupo END grupo,
        coalesce(sum(d.dinheiro) FILTER (WHERE d.elegivel),0) publicidade,
        coalesce(sum(d.dinheiro),0) total_campanha,
        coalesce(sum(d.dinheiro) FILTER (WHERE d.elegivel AND d.revisar),0) em_revisao,
        count(d.id_despesa) despesas,count(d.id_despesa) FILTER (WHERE d.dinheiro IS NULL) sem_valor
        FROM base b LEFT JOIN resultado r ON r.pessoa=b.pessoa AND r.uf=b.uf AND r.ano=b.ano
            AND r.id_municipio IS NOT DISTINCT FROM b.id_municipio
        LEFT JOIN despesas d USING(id_candidatura)
        GROUP BY ALL ORDER BY b.ano,b.pessoa,grupo
