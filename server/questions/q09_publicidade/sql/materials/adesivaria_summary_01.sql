SELECT COUNT(*) candidaturas,COUNT(*) FILTER(WHERE lancamentos>0) candidaturas_material,
      COUNT(gastos_classificados) candidaturas_valor,COUNT(votos) candidaturas_votos,
      MAX(votos) maior_votacao,
      (SELECT id FROM ranked WHERE posicao_votos=1) lider_votos_id,
      (SELECT nome FROM ranked WHERE posicao_votos=1) lider_votos_nome,
      COUNT(*) FILTER(WHERE conflito_resultado) resultados_conflitantes,
      ROUND(SUM(gastos_classificados),2) valor,COALESCE(SUM(lancamentos),0) lancamentos,
      COALESCE(SUM(valores_informados),0) valores_informados,
      (SELECT COUNT(*) FROM raw) lancamentos_recorte,
      (SELECT COUNT(*) FROM raw WHERE tipo IS NULL) lancamentos_nao_classificados,
      (SELECT COUNT(*) FROM raw WHERE tipo IS NOT NULL) lancamentos_classificados,
      (SELECT COUNT(DISTINCT id) FROM raw WHERE tipo IS NOT NULL) candidaturas_classificadas,
      (SELECT COUNT(*) FROM (SELECT tipo,categoria FROM selected GROUP BY 1,2)) categorias
      FROM enriched
