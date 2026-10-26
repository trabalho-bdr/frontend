from unittest.mock import patch
import unittest
import test_pesquisa as fixtures
import pesquisa as p
class ExplorationTests(unittest.TestCase):
 setUp=fixtures.ResearchTests.setUp
 prepare=fixtures.ResearchTests.prepare
 query=fixtures.ResearchTests.query
 def test_municipal_cost_does_not_turn_absence_into_zero(self):
  with patch.object(p,'read',side_effect=self.query):
   result=p.research_municipalities(1,2024,'VEREADOR','','','')
  a=next(r for r in result['rows'] if r['id']=='1');b=next(r for r in result['rows'] if r['id']=='2')
  self.assertEqual(a['valor'],100);self.assertIsNone(b['valor']);self.assertIsNone(b['despesas'])
 def test_municipal_wealth_unknown_does_not_receive_success_rate(self):
  with patch.object(p,'read',side_effect=self.query):result=p.research_municipalities(2,2024,'VEREADOR','','','')
  b=next(r for r in result['rows'] if r['id']=='2');self.assertIsNone(b['valor']);self.assertIsNone(b['taxa_eleicao'])
 def test_municipal_party_ratio_uses_same_party_denominator(self):
  self.prepare()
  with patch.object(p,'read',side_effect=self.query):result=p.research_municipalities(5,2024,'VEREADOR','CE','PB','')
  self.assertEqual(len(result['rows']),1);self.assertEqual(result['rows'][0]['total_selecionado'],60);self.assertAlmostEqual(result['rows'][0]['valor'],100/3)
