SELECT c.id_candidatura id,c.nome_urna nome,c.numero_urna numero,
       p.sigla partido,e.ano,UPPER(e.cargo) cargo,c.uf,m.nome municipio,
       c.gastos_campanha_total gastos,r.votos,r.resultado
       FROM __SQL_fragment_0__.main.Candidatura c JOIN __SQL_fragment_1__.main.Eleicao e USING (id_eleicao)
       LEFT JOIN __SQL_fragment_2__.main.Partido p USING (id_partido)
       LEFT JOIN __SQL_fragment_3__.main.Municipio m USING (id_municipio)
       LEFT JOIN __SQL_fragment_4__.main.Resultado_Candidatura r USING (id_candidatura)
       WHERE c.id_candidatura=? LIMIT 1
