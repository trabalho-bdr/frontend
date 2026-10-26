from test_catalog import CatalogTests,scope
import catalogo as c
class PartyOverviewTests(CatalogTests):
 def test_overview_counts_people_and_candidates(self):
  result=c.party_overview(ano=2024,cargo='VEREADOR')
  self.assertEqual(result['resumo']['candidaturas'],2)
  self.assertEqual(result['resumo']['pessoas'],2)
  self.assertEqual(result['resumo']['eleitos'],1)
  self.assertEqual(result['resumo']['votos_nominais'],120)
  self.assertEqual(result['resumo']['registros_com_votos'],1)
  self.assertEqual(result['resumo']['despesas'],100)
 def test_party_territory_scope(self):
  result=c.party_overview(ano=2024,cargo='VEREADOR',uf='CE',municipio='1',partido='PB')
  self.assertEqual(result['resumo']['pessoas'],1)
  self.assertEqual([r['uf'] for r in result['territorios']],['CE'])
 def test_missing_totals_remain_unknown(self):
  result=c.party_overview(ano=2024,cargo='VEREADOR',uf='RJ',partido='PA')
  self.assertIsNone(result['resumo']['votos_nominais'])
  self.assertIsNone(result['resumo']['despesas'])
 def test_last_round_only(self):
  result=c.party_overview(ano=2024,cargo='PREFEITO')
  self.assertEqual(result['resumo']['candidaturas'],1)
  self.assertEqual(result['resumo']['votos_nominais'],200)
 def test_state_contest_rejects_municipality(self):
  from fastapi import HTTPException
  with self.assertRaises(HTTPException):c.party_overview(ano=2022,cargo='DEPUTADO FEDERAL',uf='CE',municipio='1')
