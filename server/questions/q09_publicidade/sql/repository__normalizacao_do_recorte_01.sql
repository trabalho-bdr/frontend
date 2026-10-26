WITH vw_q9_regras_categorias AS (SELECT * FROM __SQL_fragment_0__),
        vw_q9_aliases_categorias AS (SELECT * FROM __SQL_fragment_1__),
        distintas AS (SELECT DISTINCT categoria AS categoria_original,
            __SQL_fragment_2__.q9_normalizar_categoria(categoria) AS chave
            FROM unnest(?::VARCHAR[]) AS recorte(categoria)),
        chaves AS (__SQL_fragment_3__
