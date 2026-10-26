SELECT 'despesas' ranking,* FROM (
       SELECT * FROM ranked WHERE posicao_gastos IS NOT NULL ORDER BY posicao_gastos LIMIT ? OFFSET ?)
      UNION ALL SELECT 'votos' ranking,* FROM (
       SELECT * FROM ranked WHERE posicao_votos IS NOT NULL ORDER BY posicao_votos LIMIT ? OFFSET ?)
      UNION ALL SELECT 'podio' ranking,* FROM (
       SELECT * FROM ranked WHERE posicao_gastos IS NOT NULL ORDER BY posicao_gastos LIMIT 3)
