SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_catalog=current_database() ORDER BY table_name,ordinal_position
