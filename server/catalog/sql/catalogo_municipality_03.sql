SELECT ano_participacao ano,cargo,eleitorado_apto,comparecimento,abstencoes,
      100.0*abstencoes/NULLIF(eleitorado_apto,0) abstencao_pct FROM __SQL_fragment_0__.main.Participacao_Eleitoral
      WHERE id_municipio=? ORDER BY ano_participacao,cargo
