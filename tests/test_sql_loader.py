import unittest,tempfile
from pathlib import Path
from unittest.mock import patch
from core import sql
class SqlLoaderTests(unittest.TestCase):
 def test_path_cannot_escape_server(self):
  with self.assertRaises(ValueError):sql.query_sql('../README.md')
 def test_only_internal_fragments_are_rendered_and_values_stay_bound(self):
  with tempfile.TemporaryDirectory() as folder,patch.object(sql,'ROOT',Path(folder)):
   Path(folder,'query.sql').write_text('SELECT * FROM __SQL_table__ WHERE name=?')
   sql._read.cache_clear()
   self.assertEqual(sql.query_sql('query.sql',table='candidates'),'SELECT * FROM candidates WHERE name=?')
   with self.assertRaises(ValueError):sql.query_sql('query.sql')
   with self.assertRaises(ValueError):sql.query_sql('query.sql',unknown='x')
  sql._read.cache_clear()
