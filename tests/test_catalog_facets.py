import sys,unittest
from pathlib import Path
import duckdb
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from catalog_facets import *
class FacetTests(unittest.TestCase):
 def test_accents(self):self.assertEqual(facet_options('ocupacao',['MEDICO','MÉDICO']),['Médico'])
 def test_punctuation(self):self.assertEqual(len(facet_options('ocupacao',['ESTUDANTE,BOLSISTA','ESTUDANTE, BOLSISTA'])),1)
 def test_distinct_professions(self):self.assertEqual(len(facet_options('ocupacao',['BIÓLOGO','BIOMÉDICO','BIÓLOGO E BIOMÉDICO'])),3)
 def test_school(self):self.assertEqual(facet_options('escolaridade',['MÉDIO COMPLETO','ENSINO MÉDIO COMPLETO']),['Médio completo'])
 def test_missing(self):self.assertEqual(facet_options('raca',['#NE','#NE#',None,'NÃO INFORMADO','NÃO DIVULGÁVEL']),['Não divulgável','Sem informação na fonte'])
 def test_query_matches_display(self):
  values=['#NE#',None,'MÉDICO','MEDICO','Não divulgável','ESTUDANTE,BOLSISTA','ESTUDANTE, BOLSISTA']
  with duckdb.connect(':memory:') as db:
   for value in values:
    actual=db.execute('SELECT '+facet_sql('ocupacao')+' FROM (SELECT ?::VARCHAR ocupacao)',[value]).fetchone()[0]
    self.assertEqual(actual,facet_key('ocupacao',value))
