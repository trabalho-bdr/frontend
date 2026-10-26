SELECT id_despesa id,categoria,tipo,valor FROM selected WHERE id=?
      ORDER BY valor DESC NULLS LAST,id_despesa LIMIT ? OFFSET ?
