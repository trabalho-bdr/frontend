SELECT grupo_despesa, status_classificacao, requer_revisao,
            eh_publicidade_sugerida, registros_agregados, candidaturas,
            descricoes_originais, registros_com_valor_finito, valor_contratado
            FROM __SQL_fragment_0__.main.vw_q9_resumo_categorias
            ORDER BY valor_contratado DESC NULLS LAST
