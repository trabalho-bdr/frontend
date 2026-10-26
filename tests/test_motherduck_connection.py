"""Read-only isolation tests without network."""
import os,sys,unittest
from pathlib import Path
from unittest.mock import Mock,patch
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from core import database as app
class MotherDuckConnectionTests(unittest.TestCase):
 def setUp(self):
  self.con=Mock()
  self.patches=[patch.object(app,'_con',None),patch.dict(os.environ,{'MOTHERDUCK_TOKEN':'test','MOTHERDUCK_DATABASE':'md:pipeline_bdr_der_completo_v4'}),patch('duckdb.connect',return_value=self.con)]
  self.started=[p.start() for p in self.patches]
  for p in self.patches:self.addCleanup(p.stop)
  app._query_cache.clear()
 def test_single_read_only_connection_under_concurrency(self):
  with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(lambda _:app._open(),range(8)))
  self.assertTrue(all(c is self.con for c in results))
  self.started[-1].assert_called_once_with('md:pipeline_bdr_der_completo_v4?attach_mode=single',read_only=True)
 def test_other_database_rejected(self):
  with patch.dict(os.environ,{'MOTHERDUCK_DATABASE':'md:old_v3'}):
   with self.assertRaises(RuntimeError):app._open()
  self.started[-1].assert_not_called()
 def test_missing_token_rejected(self):
  with patch.dict(os.environ,{'MOTHERDUCK_TOKEN':''}):
   with self.assertRaises(RuntimeError):app._open()
  self.started[-1].assert_not_called()
 def test_mutations_rejected(self):
  for sql in ['DELETE FROM x','UPDATE x SET y=1','DROP TABLE x']:
   with self.assertRaises(RuntimeError):app._rows(sql)
  self.started[-1].assert_not_called()
