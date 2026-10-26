, safe AS (SELECT id_candidato FROM __SQL_fragment_0__.main.Candidato GROUP BY id_candidato HAVING COUNT(DISTINCT dt_nascimento)<=1 AND COUNT(DISTINCT NULLIF(TRIM(titulo_eleitoral),''))<=1),
      cohort AS (SELECT DISTINCT id_candidato FROM scoped JOIN safe USING(id_candidato)),
      history AS (SELECT b.*,(__SQL_fragment_1__) organizacao FROM b JOIN cohort USING(id_candidato)),
      offices AS (SELECT id_candidato,COUNT(DISTINCT cargo) cargos FROM history GROUP BY id_candidato),
      dedup AS (SELECT * FROM history QUALIFY ROW_NUMBER() OVER(PARTITION BY id_candidato,ano ORDER BY id)=1),
      lags AS (SELECT *,LAG(ano) OVER(PARTITION BY id_candidato ORDER BY ano) anterior,LAG(organizacao) OVER(PARTITION BY id_candidato ORDER BY ano) anterior_partido FROM dedup),
      people AS (SELECT id_candidato,COUNT(*) participacoes,COUNT(*) FILTER(WHERE anterior IS NOT NULL AND ano-anterior>4) intervalos,
        COUNT(*) FILTER(WHERE anterior IS NOT NULL AND ano-anterior<=4) consecutivas,
        MAX(CASE WHEN anterior_partido IS NOT NULL AND organizacao IS NOT NULL AND anterior_partido<>organizacao AND NOT (__SQL_fragment_2__) THEN 1 ELSE 0 END) mudanca_organizacional,
        COUNT(*) FILTER(WHERE situacao='ELEITO') vitorias,MIN(ano) primeiro,MAX(ano) ultimo FROM lags GROUP BY id_candidato)
      SELECT CASE WHEN participacoes=1 THEN 'Uma eleição observada' WHEN intervalos>0 THEN 'Retorno com intervalo maior que quatro anos' ELSE 'Sequência sem intervalo maior que quatro anos' END grupo,
      COUNT(*) pessoas,COUNT(*) FILTER(WHERE vitorias>0) com_vitoria,COUNT(*) FILTER(WHERE cargos>1) mais_de_um_cargo,SUM(mudanca_organizacional) mudanca_organizacional,MIN(primeiro) primeiro,MAX(ultimo) ultimo
      FROM people JOIN offices USING(id_candidato) GROUP BY 1 ORDER BY 1
