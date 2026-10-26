SELECT COUNT(*) n FROM information_schema.tables WHERE table_catalog=current_database()
      AND table_schema='main' AND table_name=?
