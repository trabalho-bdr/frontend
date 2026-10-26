SELECT m.uf,COUNT(*) municipios,
            ROUND(100.0*SUM(p.abstencoes)/NULLIF(SUM(p.eleitorado_apto),0),2) percentual
            FROM __SQL_fragment_0__.main.Participacao_Eleitoral p JOIN __SQL_fragment_1__.main.Municipio m USING(id_municipio)
            WHERE p.ano_participacao=? AND (? IS NULL OR m.uf=?) GROUP BY m.uf ORDER BY percentual DESC
