"""Regression for the monetary types returned by the portal query adapter."""
import sys
import unittest
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from bdr_paineis import q9_evolucao as evolution

class EvolutionMoneyTests(unittest.TestCase):
 def test_evolution_accepts_float_and_decimal_money_without_losing_cents(self):
  rows=[]
  for year,amounts in [(2020,[Decimal('0.10'),0.2]),(2024,[0.4,Decimal('0.60')])]:
   for index,amount in enumerate(amounts):
    rows.append(dict(id_candidatura=str(year),id_candidato='person',pessoa='person',uf='CE',id_municipio='1',ano=year,partido='PT',eleito=1,resultado='ELEITO',grupo=['A','B'][index],publicidade=amount,total_campanha=amount,em_revisao=0.0,despesas=1,sem_valor=0))
  def query(sql,params=()):
   if 'SELECT id_partido,sigla,nome' in sql:return [dict(id_partido='party',sigla='PT',nome='Partido')]
   if 'SELECT DISTINCT e.ano' in sql:return [dict(ano=2020),dict(ano=2024)]
   if 'SELECT DISTINCT d.categoria' in sql:return [dict(categoria='ADESIVOS')]
   if 'GROUP BY ALL' in sql:return rows
   self.fail('Unexpected query')
  refs={name:name for name in ['candidatura','eleicao','partido','candidato','resultado_candidatura','despesa_candidatura']}
  with patch.object(evolution.q9,'_fontes',return_value=refs),patch.object(evolution.q9,'_normalizacao',return_value=([[],[],[],[],[],[]],'teste')):
   result=evolution.resumo(query,'VEREADOR','CE',id_partido='party')
  self.assertEqual([r['publicidade'] for r in result['serie']],[0.3,1.0])
  self.assertEqual([r['candidaturas'] for r in result['serie']],[1,1])
  self.assertEqual(result['comparacoes'][0]['coorte']['pares'],1)
