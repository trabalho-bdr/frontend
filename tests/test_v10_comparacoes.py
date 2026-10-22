"""As comparações só executam consultas SQL fixas com parâmetros; sem token remoto."""
import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app
from comparacoes import legenda,abstencao,cadeiras,escolaridade,propaganda,patrimonio
from fastapi import HTTPException

class ComparisonsTests(unittest.TestCase):
 def setUp(self):
  self.old=app._rows
  self.queries=[]
  def fake(sql,params=()):
   self.assertEqual(sql.count('?'),len(params))
   self.assertTrue(sql.lstrip().upper().startswith(('SELECT','WITH')))
   self.assertNotIn('DELETE ',sql.upper())
   self.assertIn('v4.main.',sql)
   self.queries.append((sql,params))
   return [{'ano':2024,'serie':'Teste','valor':10}]
  app._rows=fake
 def tearDown(self):app._rows=self.old
 def test_comparacao_de_partidos_parametrizada(self):
  r=legenda(cargo='VEREADOR',uf='RS',primeiro='PL',segundo='PT')
  self.assertEqual(r['rows'][0]['valor'],10)
  self.assertEqual(self.queries[0][1],['VEREADOR',2020,2024,'RS','RS','PL','PT'])
  self.assertIn("v.turno=1",self.queries[0][0])
 def test_ufs_da_abstencao_e_denominador(self):
  abstencao(ufs='RS,RJ')
  self.assertIn('SUM(p.abstencoes)/NULLIF(SUM(p.eleitorado_apto)',self.queries[0][0])
  self.assertEqual(self.queries[0][1],['RS','RJ'])
 def test_cadeiras_fixa_anos_e_cargo(self):
  cadeiras(cargo='DEPUTADO ESTADUAL',uf='CE')
  self.assertEqual(self.queries[0][1],[2018,2022,'DEPUTADO ESTADUAL','CE','CE'])
 def test_escolaridade_denominador_nao_inclui_indefinidos(self):
  escolaridade(ano=2024,cargo='VEREADOR',uf='RS')
  self.assertIn("'SUPLENTE'",self.queries[0][0])
  self.assertEqual(self.queries[0][1],[2024,'VEREADOR','RS','RS','RS'])
 def test_gastos_prop_sem_tudo_e_filtro_de_partido(self):
  propaganda(cargo='VEREADOR',uf='RJ',partido='PL')
  self.assertIn("LIKE 'ADESIV%'",self.queries[0][0])
  self.assertEqual(self.queries[0][1],[2020,2024,'VEREADOR','RJ','RJ','PL','PL'])
 def test_quartis_patrimonio_condicionam_resultado(self):
  patrimonio(ano=2024,cargo='VEREADOR',uf='')
  self.assertIn('NTILE(4)',self.queries[0][0]);self.assertIn('eleito IS NOT NULL',self.queries[0][0])
 def test_presidente_anos_e_restricoes(self):
  cadeiras(cargo='PRESIDENTE')
  self.assertEqual(self.queries[0][1],[2018,2022,'PRESIDENTE','',''])
  escolaridade(ano=2022,cargo='PRESIDENTE')
  patrimonio(ano=2018,cargo='PRESIDENTE')
  with self.assertRaises(HTTPException):escolaridade(ano=2024,cargo='PRESIDENTE')
  with self.assertRaises(HTTPException):patrimonio(ano=2020,cargo='PRESIDENTE')
  with self.assertRaises(HTTPException):legenda(cargo='PRESIDENTE')
 def test_bloqueia_sql_livre_e_ufs_fora_do_acervo(self):
  with self.assertRaises(HTTPException):legenda(uf='SP')
  with self.assertRaises(HTTPException):legenda(primeiro="PT'); DROP TABLE --")
  with self.assertRaises(HTTPException):escolaridade(ano=2018,cargo='VEREADOR')
  self.assertEqual(len(self.queries),0)
if __name__=='__main__':unittest.main()
