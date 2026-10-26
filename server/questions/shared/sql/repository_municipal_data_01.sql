WITH profile AS (
      SELECT id_municipio,SUM(quantidade_eleitores) eleitores,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria NOT IN ('INVÁLIDA','INVÁLIDO')) idade_conhecida,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria IN ('16 ANOS','17 ANOS')) jovens_16_17,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria IN ('18 ANOS','19 ANOS','20 ANOS','21 A 24 ANOS')) jovens_18_24,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria='25 A 29 ANOS') jovens_25_29,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria NOT IN ('16 ANOS','17 ANOS','INVÁLIDA','INVÁLIDO') AND (__SQL_fragment_0__) IN ('ANALFABETO','LEEESCREVE','FUNDAMENTALINCOMPLETO','FUNDAMENTALCOMPLETO','MEDIOINCOMPLETO','MEDIOCOMPLETO','SUPERIORINCOMPLETO','SUPERIORCOMPLETO')) instrucao_conhecida_18,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria NOT IN ('16 ANOS','17 ANOS','INVÁLIDA','INVÁLIDO') AND (__SQL_fragment_1__)='SUPERIORCOMPLETO') superior_18,
      SUM(quantidade_eleitores) FILTER(WHERE faixa_etaria IN ('INVÁLIDA','INVÁLIDO')) idade_invalida
      FROM __SQL_fragment_2__.main.Perfil_Eleitorado_Municipio WHERE ano=? GROUP BY id_municipio
    ), turnout AS (
      SELECT id_municipio,MAX(eleitorado_apto) aptos,MAX(abstencoes) abstencoes,
      COUNT(DISTINCT eleitorado_apto) denominadores,COUNT(DISTINCT abstencoes) numeradores
      FROM __SQL_fragment_3__.main.Participacao_Eleitoral WHERE ano_participacao=? AND (cargo IS NULL OR UPPER(cargo)=?) GROUP BY id_municipio
    ), votes AS (
      SELECT v.id_municipio,SUM(v.votos_nominais+v.votos_legenda) votos,
      SUM(v.votos_nominais+v.votos_legenda) FILTER(WHERE p.sigla=?) votos_partido
      FROM __SQL_fragment_4__.main.Votos_Partido_Municipio v JOIN __SQL_fragment_5__.main.Eleicao e USING(id_eleicao)
      JOIN __SQL_fragment_6__.main.Partido p USING(id_partido) WHERE e.ano=? AND UPPER(e.cargo)=? AND e.turno=1 AND v.turno=1
      AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' GROUP BY v.id_municipio
    ) SELECT m.id_municipio id,m.nome,m.uf,p.*,t.aptos,t.denominadores,t.numeradores,
      CASE WHEN t.denominadores=1 AND t.numeradores=1 AND t.aptos>0 THEN 100.0*t.abstencoes/t.aptos END abstencao,
      CASE WHEN v.votos>0 AND ?<>'' THEN 100.0*COALESCE(v.votos_partido,0)/v.votos END participacao_partido,
      c.populacao,c10.idhm,c.idade_mediana,c.indice_envelhecimento
      FROM __SQL_fragment_7__.main.Municipio m LEFT JOIN profile p USING(id_municipio) LEFT JOIN turnout t USING(id_municipio)
      LEFT JOIN votes v USING(id_municipio) LEFT JOIN __SQL_fragment_8__.main.Censo_Municipio c ON c.id_municipio=m.id_municipio AND c.ano_referencia=2022
      LEFT JOIN __SQL_fragment_9__.main.Censo_Municipio c10 ON c10.id_municipio=m.id_municipio AND c10.ano_referencia=2010
      WHERE m.uf IN ('CE','MA','MS','RJ','RN','RS') AND (?='' OR m.uf=?) AND (?='' OR m.id_municipio=?) ORDER BY m.uf,m.nome
