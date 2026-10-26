import unittest,tempfile,json
from pathlib import Path
from unittest.mock import patch
import test_catalog as fixtures
import pesquisa as p
from party_events import canonical_party,transition_kind

class ResearchTests(unittest.TestCase):
 setUp=fixtures.CatalogTests.setUp
 def prepare(self):
  self.con.execute('''CREATE TABLE Perfil_Eleitorado_Municipio(id_municipio VARCHAR,ano INTEGER,faixa_etaria VARCHAR,genero VARCHAR,grau_instrucao VARCHAR,quantidade_eleitores BIGINT);
   INSERT INTO Perfil_Eleitorado_Municipio VALUES ('1',2024,'18 ANOS','MASCULINO','SUPERIOR COMPLETO',30),('1',2024,'30 A 34 ANOS','FEMININO','ENSINO MÉDIO COMPLETO',70),('1',2024,'INVÁLIDA','FEMININO','ENSINO MÉDIO COMPLETO',5),('2',2024,'18 ANOS','FEMININO','SUPERIOR COMPLETO',40),('2',2024,'40 A 44 ANOS','MASCULINO','ENSINO MÉDIO COMPLETO',60);
   CREATE TABLE Censo_Municipio(id_municipio VARCHAR,ano_referencia INTEGER,populacao BIGINT,idhm DOUBLE,idade_mediana DOUBLE,indice_envelhecimento DOUBLE);
   INSERT INTO Censo_Municipio VALUES ('1',2022,1000,.6,30,20),('2',2022,2000,.7,35,30);
   CREATE TABLE Participacao_Eleitoral(id_municipio VARCHAR,ano_participacao INTEGER,cargo VARCHAR,eleitorado_apto BIGINT,abstencoes BIGINT);
   INSERT INTO Participacao_Eleitoral VALUES ('1',2024,NULL,105,21),('2',2024,NULL,100,30);
   CREATE TABLE Votos_Partido_Municipio(id_eleicao VARCHAR,id_partido VARCHAR,id_municipio VARCHAR,turno INTEGER,votos_nominais BIGINT,votos_legenda BIGINT);
   INSERT INTO Votos_Partido_Municipio VALUES ('20','a','1',1,70,10),('20','b','1',1,15,5),('24','a','1',1,30,10),('24','b','1',1,40,20),('24','a','2',1,80,20);
   UPDATE Candidatura SET escolaridade_candidatura='SUPERIOR COMPLETO' WHERE id_candidatura='c24';
   UPDATE Candidatura SET escolaridade_candidatura='ENSINO MÉDIO COMPLETO' WHERE id_candidatura='other';''')
 def scoped(self,**kwargs):return p.scope_filter(2024,'VEREADOR',kwargs.get('uf',''),kwargs.get('partido',''),kwargs.get('municipio',''))
 def query(self,sql,params=()):
  result=self.con.execute(sql,list(params));return [dict(zip([c[0] for c in result.description],row)) for row in result.fetchall()]
 def test_cost_counts_last_round_once_and_undefined_denominator(self):
  with patch.object(p,'read',side_effect=self.query):
   data=p.cost(self.scoped());self.assertEqual(data['summary']['eleitos'],1);self.assertEqual(data['summary']['valor'],100)
   data=p.cost(self.scoped(uf='RJ'));self.assertIsNone(data['summary']['valor'])
 def test_wealth_excludes_unknown_and_does_not_split_equal_values(self):
  self.con.execute("UPDATE Candidatura SET patrimonio=500 WHERE id_candidatura='other'")
  with patch.object(p,'read',side_effect=self.query):
   data=p.wealth(self.scoped());self.assertEqual(len(data['rows']),1);self.assertEqual(data['rows'][0]['candidaturas'],1)
 def test_school_aggregate_before_join(self):
  self.prepare()
  with patch.object(p,'read',side_effect=self.query):
   data=p.electorate(self.scoped(),4,'16_24','18mais')
  self.assertEqual(data['summary']['candidatos_conhecidos'],2);self.assertEqual(data['summary']['eleitores_conhecidos'],200)
  high=next(row for row in data['rows'] if row['grupo']=='Superior completo')
  self.assertEqual(high['valor'],50);self.assertEqual(high['referencia'],35)
  town=next(row for row in data['points'] if row['id']=='1');self.assertEqual(town['y'],100);self.assertEqual(town['x'],30)
 def test_youth_is_voters_and_invalid_age_is_excluded(self):
  self.prepare()
  with patch.object(p,'read',side_effect=self.query):
   data=p.electorate(self.scoped(),6,'16_24','18mais')
  first=next(r for r in data['rows'] if r['id']=='1');self.assertEqual(first['x'],30);self.assertEqual(first['idade_invalida'],5)
 def test_turnout_without_office_is_not_lost(self):
  self.prepare()
  with patch.object(p,'read',side_effect=self.query):
   rows=p.municipal_data(self.scoped())
  self.assertEqual(next(r for r in rows if r['id']=='1')['abstencao'],20)
 def test_conflicting_turnout_does_not_produce_rate(self):
  self.prepare();self.con.execute("INSERT INTO Participacao_Eleitoral VALUES ('1',2024,NULL,999,50)")
  with patch.object(p,'read',side_effect=self.query):rows=p.municipal_data(self.scoped())
  self.assertIsNone(next(r for r in rows if r['id']=='1')['abstencao'])
 def test_historical_electorate_is_not_published_as_validated(self):
  f=self.scoped();f['ano']=2022
  self.assertEqual(p.electorate(f,6,'16_24','18mais')['status'],'em_validacao')
 def test_party_ratio_aggregates_counts_before_division(self):
  self.prepare()
  with patch.object(p,'read',side_effect=self.query):data=p.party_series(self.scoped(),5)
  row=next(r for r in data['rows'] if r['ano']==2024);self.assertEqual(row['valor'],25)
 def test_party_volatility_and_transition(self):
  self.prepare()
  with patch.object(p,'read',side_effect=self.query):data=p.party_series(self.scoped(),7)
  self.assertEqual(data['rows'][0]['valor'],40);self.assertEqual(data['summary']['Mudança entre organizações'],1)
 def test_party_events_do_not_invent_migration(self):
  self.assertEqual(canonical_party('PMDB',2016),canonical_party('MDB',2020))
  self.assertNotEqual(canonical_party('PL',2002),canonical_party('PL',2024))
  self.assertEqual(transition_kind('DEM','UNIÃO',2024),'Fusão/incorporação')
 def test_trajectory_categories_are_exclusive(self):
  with patch.object(p,'read',side_effect=self.query):data=p.trajectories(self.scoped())
  self.assertEqual(data['summary']['pessoas'],2);self.assertAlmostEqual(sum(r['valor'] for r in data['rows']),100)
 def test_receipts_missing_link_is_not_zero_financing(self):
  with tempfile.TemporaryDirectory() as folder:
   path=Path(folder);(path/'receitas-manifest.json').write_text(json.dumps({'years':{'2024':{'status':'loaded'}},'method':'fixture'}))
   self.con.execute("COPY (SELECT 2024 ano,'24' sequencial,'CE' uf,'VEREADOR' cargo,100 total,75 publico,25 privado,0 nao_classificado) TO '"+str(path/'receitas-candidatos.parquet').replace('\\','/')+"' (FORMAT PARQUET)")
   with patch.object(p,'read',side_effect=self.query),patch.object(p,'DATA',path):data=p.financing(self.scoped())
  self.assertEqual(data['summary']['candidaturas'],2);self.assertEqual(data['summary']['com_receita_final'],1);self.assertEqual(data['rows'][0]['valor'],100)
 def test_association_null_for_constant_and_tied_ranks(self):
  self.assertIsNone(p.correlation([{'x':1,'y':v} for v in [1,2,3]],'x','y')['pearson'])
  self.assertAlmostEqual(p.correlation([{'x':v,'y':v} for v in [1,1,2,3]],'x','y')['spearman'],1)

 def test_selected_party_series_keeps_numerator_and_denominator(self):
  self.prepare()
  with patch.object(p,'read',side_effect=self.query):data=p.party_series(self.scoped(partido='PB',uf='CE'),5)
  row=next(r for r in data['rows'] if r['ano']==2024);self.assertAlmostEqual(row['valor'],100/3)
 def test_party_renaming_is_optional_and_mergers_are_not_joined(self):
  self.prepare();self.con.execute("UPDATE Partido SET sigla='PMDB' WHERE id_partido='a'; UPDATE Partido SET sigla='MDB' WHERE id_partido='b'")
  with patch.object(p,'read',side_effect=self.query):
   raw=p.party_series(self.scoped(partido='MDB',uf='CE'),5)
   merged=p.party_series(self.scoped(partido='MDB',uf='CE'),5,True)
  self.assertAlmostEqual(next(r for r in raw['rows'] if r['ano']==2024)['valor'],100/3)
  self.assertEqual(next(r for r in merged['rows'] if r['ano']==2024)['valor'],30)

 def test_idhm_is_read_from_actual_2010_reference(self):
  self.prepare();self.con.execute("INSERT INTO Censo_Municipio VALUES ('1',2010,NULL,.5,NULL,NULL)")
  with patch.object(p,'read',side_effect=self.query):data=p.territory(self.scoped(),'idhm','abstencao')
  first=next(r for r in data['rows'] if r['id']=='1');self.assertEqual(first['x'],.5)
