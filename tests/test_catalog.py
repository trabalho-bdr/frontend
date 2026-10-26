"""Execute catalog SQL on controlled fixtures, keeping production free of mocks."""
import sys,unittest,hashlib
from pathlib import Path
from unittest.mock import patch
import duckdb
from fastapi import HTTPException
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import catalogo as c

def scope(**values):
    return {'q':'','ano':None,'uf':'','cargo':'','municipio':'','partido':'','resultado':'','escolaridade':'','genero':'','raca':'','ocupacao':'','idade_min':None,'idade_max':None,'gasto_min':None,'gasto_max':None,'patrimonio_min':None,'patrimonio_max':None,'recorrencia':'',**values}

class CatalogTests(unittest.TestCase):
 def setUp(self):
  self.con=duckdb.connect(':memory:')
  self.con.execute(f"ATTACH ':memory:' AS {c.DB}")
  self.con.execute(f'USE {c.DB}.main')
  self.con.execute('''CREATE TABLE Candidato(id_candidato VARCHAR,nome_civil VARCHAR,dt_nascimento DATE,titulo_eleitoral VARCHAR,genero VARCHAR,raca VARCHAR,ocupacao VARCHAR);
   CREATE TABLE Eleicao(id_eleicao VARCHAR,ano INTEGER,cargo VARCHAR,data DATE,turno INTEGER,tipo_eleicao VARCHAR);
   CREATE TABLE Candidatura(id_candidatura VARCHAR,id_candidato VARCHAR,id_eleicao VARCHAR,id_municipio VARCHAR,id_partido VARCHAR,uf VARCHAR,nome_urna VARCHAR,numero_urna INTEGER,escolaridade_candidatura VARCHAR,situacao_registro VARCHAR,patrimonio DOUBLE,gastos_campanha_total DOUBLE,sequencial VARCHAR);
   CREATE TABLE Municipio(id_municipio VARCHAR,nome VARCHAR,uf VARCHAR,regiao VARCHAR);
   CREATE TABLE Partido(id_partido VARCHAR,sigla VARCHAR);
   CREATE TABLE Resultado_Candidatura(id_candidatura VARCHAR,turno INTEGER,resultado VARCHAR,votos BIGINT);
   CREATE TABLE Despesa_Candidatura(id_candidatura VARCHAR,categoria VARCHAR,valor DOUBLE);
   CREATE TABLE Foto_Candidato(id_candidato VARCHAR,ano_foto INTEGER,uf VARCHAR,sq_candidato VARCHAR,mime_type VARCHAR,tamanho_bytes BIGINT,largura INTEGER,altura INTEGER,sha256 VARCHAR,url_fonte VARCHAR,imagem BLOB,coletada_em TIMESTAMP);
   INSERT INTO Candidato VALUES ('p1','José da Silva','1975-10-07','private-identity','MASCULINO','PARDA','PROFESSOR'),('p2','José da Silva','1995-01-01','another-private','MASCULINO','BRANCA','ESTUDANTE');
   INSERT INTO Municipio VALUES ('1','Cidade A','CE','Nordeste'),('2','Cidade B','RJ','Sudeste');
   INSERT INTO Partido VALUES ('a','PA'),('b','PB');
   INSERT INTO Eleicao VALUES ('02',2002,'DEPUTADO ESTADUAL','2002-10-06',1,'ORDINÁRIA'),('20',2020,'VEREADOR','2020-11-15',1,'ORDINÁRIA'),('24',2024,'VEREADOR','2024-10-06',1,'ORDINÁRIA'),('m1',2024,'PREFEITO','2024-10-06',1,'ORDINÁRIA'),('m2',2024,'PREFEITO','2024-10-27',2,'ORDINÁRIA');
   INSERT INTO Candidatura VALUES ('c02','p1','02','1','a','CE','José',101,'MÉDIO','APTO',NULL,NULL,'02'),('c20','p1','20','1','a','CE','José',101,'SUPERIOR','APTO',0,0,'20'),('c24','p1','24','1','b','CE','Professor José',101,'SUPERIOR','APTO',500,100,'24'),('other','p2','24','2','a','RJ','Outro José',101,'MÉDIO','APTO',NULL,NULL,'other'),('mayor1','p2','m1','2','a','RJ','Outro José',10,'MÉDIO','APTO',NULL,10,'m1'),('mayor2','p2','m2','2','a','RJ','Outro José',10,'MÉDIO','APTO',NULL,20,'m2');
   INSERT INTO Resultado_Candidatura VALUES ('c02',1,'NÃO ELEITO',100),('c20',1,'SUPLENTE',50),('c24',1,'ELEITO POR QP',120),('c24',1,'ELEITO POR QP',120),('other',1,NULL,NULL),('mayor1',1,'2º TURNO',100),('mayor2',2,'ELEITO',200);
   INSERT INTO Despesa_Candidatura VALUES ('c24','ADESIVOS',50),('c24','SANTINHOS',NULL);''')
  def query(sql,params=()):
   cur=self.con.execute(sql,list(params));names=[column[0] for column in cur.description]
   return [dict(zip(names,row)) for row in cur.fetchall()]
  self.patch=patch.object(c,'read',side_effect=query);self.patch.start();self.addCleanup(self.patch.stop);self.addCleanup(self.con.close)
 def test_name_search_finds_civil_and_ballot_names_without_accents(self):
  result=c.search(scope(q='jose'),limit=12,offset=0)
  self.assertEqual(result['total'],5)
  self.assertEqual(len({r['id'] for r in result['rows']}),5)
  self.assertEqual(len({r['id_candidato'] for r in result['rows']}),2)
 def test_combined_filters_age_money_schooling_party_and_result(self):
  result=c.search(scope(ano=2024,cargo='VEREADOR',uf='CE',municipio='1',partido='PB',escolaridade='SUPERIOR',genero='MASCULINO',idade_min=40,gasto_min=100,resultado='ELEITO',recorrencia='recorrente'),limit=12,offset=0)
  self.assertEqual(result['total'],1);self.assertEqual(result['rows'][0]['idade'],48)
 def test_last_round_and_duplicate_results_count_once(self):
  result=c.search(scope(ano=2024,cargo='PREFEITO',uf='RJ',municipio='2'),limit=12,offset=0)
  self.assertEqual(result['total'],1);self.assertEqual(result['rows'][0]['id'],'mayor2');self.assertEqual(result['rows'][0]['votos'],200)
 def test_missing_money_is_not_zero(self):
  self.assertEqual(c.search(scope(gasto_max=0),limit=12,offset=0)['total'],1)
  self.assertEqual(c.search(scope(patrimonio_max=0),limit=12,offset=0)['total'],1)
 def test_pagination_retains_total_even_beyond_last_page(self):
  self.assertEqual(len(c.search(scope(),limit=2,offset=0)['rows']),2)
  result=c.search(scope(),limit=2,offset=99);self.assertEqual(result['rows'],[]);self.assertEqual(result['total'],5)
 def test_number_and_vote_order_require_comparable_contest(self):
  with self.assertRaises(HTTPException):c.search(scope(q='101'),limit=12,offset=0)
  with self.assertRaises(HTTPException):c.search(scope(),ordem='votos',limit=12,offset=0)
  self.assertEqual(c.search(scope(q='101',ano=2024,cargo='VEREADOR',uf='CE',municipio='1'),limit=12,offset=0)['total'],1)
 def test_options_are_live_and_municipalities_respect_state_and_office(self):
  result=c.options(2024,'CE','VEREADOR');self.assertEqual([r['id'] for r in result['municipios']],['1'])
  self.assertEqual(c.options(2002,'CE','DEPUTADO ESTADUAL')['municipios'],[])
 def test_person_profile_keeps_homonyms_separate_and_hides_documents(self):
  result=c.person_profile('p1','c20');self.assertEqual(result['resumo']['candidaturas'],3);self.assertEqual(result['selecionada']['patrimonio'],0)
  self.assertEqual(result['resumo']['vitorias'],1);self.assertTrue(result['resumo']['retornou_apos_derrota'])
  self.assertNotIn('private-identity',str(result));self.assertNotIn('titulo_eleitoral',str(result));self.assertNotIn('dt_nascimento',str(result))
  with self.assertRaises(HTTPException):c.person_profile('p1','other')
 def test_conflicting_identity_is_not_merged(self):
  self.con.execute("INSERT INTO Candidato VALUES ('p1','Outra pessoa','1980-01-01','conflict','M','P','X')")
  with self.assertRaises(HTTPException) as error:c.person_profile('p1')
  self.assertEqual(error.exception.status_code,409)
 def test_photo_with_invalid_hash_is_not_served(self):
  self.con.execute("INSERT INTO Foto_Candidato VALUES ('p1',2024,'CE','24','image/jpeg',10,2,2,?,'https://divulgacandcontas.tse.jus.br/photo',?,CURRENT_TIMESTAMP)",['0'*64,b'\xff\xd8\xffinvalid'])
  with self.assertRaises(HTTPException) as error:c.photo('c24')
  self.assertEqual(error.exception.status_code,404)
 def test_optional_photo_table_absence_does_not_break_catalog(self):
  self.con.execute('DROP TABLE Foto_Candidato')
  result=c.search(scope(ano=2024,cargo='VEREADOR'),limit=12,offset=0)
  self.assertGreater(result['total'],0);self.assertTrue(all(row['foto_url'] is None for row in result['rows']))
 def test_vote_ranking_does_not_mix_first_and_second_rounds(self):
  with self.assertRaises(HTTPException):c.search(scope(ano=2024,cargo='PREFEITO',uf='RJ',municipio='2'),ordem='votos',limit=12,offset=0)


 def add_official_photo(self,person='p1',year=2024,uf='CE',sequence='24'):
  blob=b'\xff\xd8\xffofficial-portrait'
  self.con.execute("INSERT INTO Foto_Candidato VALUES (?,?,?,?, 'image/jpeg',?,2,2,?,'https://divulgacandcontas.tse.jus.br/photo',?,CURRENT_TIMESTAMP)",[person,year,uf,sequence,len(blob),hashlib.sha256(blob).hexdigest(),blob])
  return blob
 def test_same_person_uses_one_official_photo_across_elections(self):
  blob=self.add_official_photo()
  rows=c.search(scope(q='jose',uf='CE'),limit=12,offset=0)['rows']
  self.assertEqual({row['foto_url'] for row in rows},{'/api/catalogo/fotos/c24'})
  older=next(row for row in rows if row['ano']==2020)
  self.assertEqual(older['foto_ano'],2024);self.assertTrue(older['foto_referencia'])
  self.assertFalse(next(row for row in rows if row['ano']==2024)['foto_referencia'])
  self.assertEqual(c.photo('c24').body,blob)
 def test_photo_is_available_when_search_is_filtered_to_an_older_election(self):
  self.add_official_photo()
  row=c.search(scope(ano=2020),limit=1,offset=0)['rows'][0]
  self.assertEqual(row['foto_url'],'/api/catalogo/fotos/c24')
  self.assertEqual(row['foto_ano'],2024)
 def test_historical_profile_keeps_the_same_portrait_when_selection_changes(self):
  self.add_official_photo()
  profile=c.person_profile('p1','c20')
  self.assertEqual(profile['selecionada']['foto_url'],'/api/catalogo/fotos/c24')
  self.assertTrue(all(row['foto_url']=='/api/catalogo/fotos/c24' for row in profile['candidaturas']))
 def test_homonyms_do_not_share_portraits(self):
  self.add_official_photo()
  other=c.search(scope(ano=2024,cargo='VEREADOR',uf='RJ'),limit=12,offset=0)['rows'][0]
  self.assertIsNone(other['foto_url']);self.assertIsNone(other['foto_ano'])
 def test_portrait_selection_uses_latest_linked_photo_and_excludes_conflicting_identity(self):
  self.add_official_photo(year=2020,sequence='20');self.add_official_photo()
  row=c.search(scope(ano=2020),limit=1,offset=0)['rows'][0]
  self.assertEqual(row['foto_url'],'/api/catalogo/fotos/c24')
  self.con.execute("INSERT INTO Candidato VALUES ('p1','Conflito','1980-01-01','conflicting-document','M','P','X')")
  self.assertIsNone(c.search(scope(ano=2020),limit=1,offset=0)['rows'][0]['foto_url'])
 def test_unlinked_photo_is_not_used_as_a_portrait(self):
  self.add_official_photo(year=2024,sequence='different-candidate')
  self.assertIsNone(c.search(scope(ano=2020),limit=1,offset=0)['rows'][0]['foto_url'])

 def test_bulk_portraits_apply_to_multiple_people_and_keep_same_names_separate(self):
  self.add_official_photo()
  self.add_official_photo(person='p2',uf='RJ',sequence='other')
  result=c.search(scope(q='jose'),limit=12,offset=0)['rows']
  by_person={}
  for row in result:by_person.setdefault(row['id_candidato'],set()).add(row['foto_url'])
  self.assertEqual(by_person,{'p1':{'/api/catalogo/fotos/c24'},'p2':{'/api/catalogo/fotos/other'}})
  self.assertEqual(c.person_profile('p1','c02')['selecionada']['foto_url'],'/api/catalogo/fotos/c24')
  self.assertEqual(c.person_profile('p2','mayor2')['selecionada']['foto_url'],'/api/catalogo/fotos/other')

 def test_people_search_groups_before_pagination_and_preserves_homonyms(self):
  result=c.people_search(scope(q='jose'),limit=1,offset=0)
  self.assertEqual(result['total'],2);self.assertEqual(result['candidaturas_no_recorte'],5)
  other=c.people_search(scope(q='jose'),limit=1,offset=1)
  self.assertNotEqual(result['rows'][0]['id_candidato'],other['rows'][0]['id_candidato'])
  beyond=c.people_search(scope(q='jose'),limit=1,offset=20)
  self.assertEqual(beyond['rows'],[]);self.assertEqual(beyond['total'],2)
 def test_people_search_keeps_full_history_when_filtered_to_an_old_election(self):
  row=c.people_search(scope(ano=2020),limit=12,offset=0)['rows'][0]
  self.assertEqual(row['id'],'c20');self.assertEqual(row['ano'],2020)
  self.assertEqual(row['matches_count'],1);self.assertEqual(row['participacoes'],3)
  self.assertEqual(row['anos'],[2002,2020,2024]);self.assertEqual(row['vitorias'],1)
  self.assertEqual(row['ultimo_registro'],2024);self.assertEqual(row['ultima_candidatura_id'],'c24')
  self.assertEqual(row['nome_pessoa'],'Professor José');self.assertEqual(row['gastos'],0)
 def test_people_search_finds_a_person_by_old_party_without_losing_newer_elections(self):
  result=c.people_search(scope(partido='PA',uf='CE'),limit=12,offset=0)
  self.assertEqual(result['total'],1)
  row=result['rows'][0];self.assertEqual(row['partido'],'PA');self.assertEqual(row['ultima_sigla'],'PB')
  self.assertEqual(row['matches_count'],2);self.assertEqual(row['participacoes'],3)
 def test_people_search_does_not_sum_votes_or_expenses_across_elections(self):
  f=scope(ano=2024,cargo='VEREADOR',uf='CE',municipio='1')
  row=c.people_search(f,ordem='votos',limit=12,offset=0)['rows'][0]
  self.assertEqual(row['votos'],120);self.assertEqual(row['gastos'],100)
  with self.assertRaises(HTTPException):c.people_search(scope(),ordem='votos',limit=12,offset=0)
 def test_people_search_excludes_conflicting_identity_instead_of_merging_records(self):
  self.con.execute("INSERT INTO Candidato VALUES ('p1','Conflito','1980-01-01','conflict','M','P','X')")
  rows=c.people_search(scope(q='jose'),limit=12,offset=0)['rows']
  self.assertEqual([r['id_candidato'] for r in rows],['p2'])
 def test_people_search_uses_shared_official_portrait(self):
  self.add_official_photo()
  row=c.people_search(scope(ano=2020),limit=12,offset=0)['rows'][0]
  self.assertEqual(row['foto_url'],'/api/catalogo/fotos/c24')

if __name__=='__main__':unittest.main()

