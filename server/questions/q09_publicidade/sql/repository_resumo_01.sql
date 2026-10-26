WITH recorte AS (
        SELECT c.id_candidatura,d.categoria,
            CASE WHEN isfinite(d.valor) THEN try_cast(d.valor AS DECIMAL(24,2)) END valor_centavos
        FROM __SQL_fragment_0__ WHERE __SQL_fragment_1__
    ) SELECT id_candidatura,categoria,count(*) registros,
        coalesce(sum(valor_centavos),0) valor,
        count(*) FILTER (WHERE valor_centavos IS NULL) sem_valor,
        count(*) FILTER (WHERE valor_centavos<0) ajustes_negativos
        FROM recorte GROUP BY id_candidatura,categoria
