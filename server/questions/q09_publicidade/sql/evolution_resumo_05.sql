WITH base AS (__SQL_fragment_0__)
        SELECT DISTINCT d.categoria FROM base JOIN __SQL_fragment_1__ d USING(id_candidatura)
