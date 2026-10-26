SELECT DISTINCT c.id_candidatura,c.id_candidato,c.nome_urna,a.nome_civil,
        coalesce(nullif(trim(c.nome_urna),''),a.nome_civil,'Candidato sem nome') nome,
        upper(strip_accents(coalesce(nullif(trim(c.nome_urna),''),a.nome_civil,'Candidato sem nome'))) nome_ordem,
        c.numero_urna,c.uf,m.nome municipio,p.sigla partido,e.ano,
        upper(strip_accents(trim(e.cargo))) cargo
        FROM __SQL_fragment_0__ JOIN __SQL_fragment_1__ a USING(id_candidato)
        LEFT JOIN __SQL_fragment_2__ m ON m.id_municipio=c.id_municipio
        LEFT JOIN __SQL_fragment_3__ p ON p.id_partido=c.id_partido
        WHERE __SQL_fragment_4__ ORDER BY nome_ordem,nome,c.uf,municipio,c.id_candidatura LIMIT 21
