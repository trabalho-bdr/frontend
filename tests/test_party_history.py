import sys,unittest
from pathlib import Path
import duckdb
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import catalogo as c
class PartyHistoryTests(unittest.TestCase):
 def rows(self,party,historical):
  condition,params=c.where({'partido':party,'partido_historico':historical})
  with duckdb.connect(':memory:') as db:
   return db.execute("SELECT partido,ano FROM (VALUES ('PMDB',2016),('MDB',2020),('PSC',2020),('PODE',2024),('PTN',2016),('PL',2002),('PR',2010),('PL',2024)) b(partido,ano) WHERE "+condition,params).fetchall()
 def test_exact(self):self.assertEqual(self.rows('MDB',''),[('MDB',2020)])
 def test_names(self):self.assertEqual(self.rows('MDB','1'),[('PMDB',2016),('MDB',2020)])
 def test_no_incorporation(self):self.assertEqual(self.rows('PODE','1'),[('PODE',2024),('PTN',2016)])
 def test_old_pl_separate(self):self.assertEqual(self.rows('PL','1'),[('PR',2010),('PL',2024)])
