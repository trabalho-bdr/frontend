SELECT sql FROM duckdb_views()
        WHERE database_name=current_database() AND schema_name=?
        AND lower(view_name)='vw_q9_categorias'
