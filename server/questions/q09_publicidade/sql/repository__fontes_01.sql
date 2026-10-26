SELECT table_catalog,table_schema,table_name
        FROM information_schema.tables WHERE table_catalog=current_database()
        AND table_schema IN ('main','der_bdr')
        AND lower(table_name) IN ('candidatura','candidato','municipio','partido','eleicao','despesa_candidatura','resultado_candidatura','vw_q9_categorias','vw_q9_regras_categorias','vw_q9_aliases_categorias')
