"""Real DuckDB SQL execution over a small, controlled fixture."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import duckdb
from fastapi import HTTPException
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import exhibition as e

class ExhibitionQueries(unittest.TestCase):
 def setUp(self):
  self.con=duckdb.connect()
  self.con.execute('''CREATE TABLE Candidato(id_candidato VARCHAR,dt_nascimento DATE);
   CREATE TABLE Candidatura(id_candidatura VARCHAR,id_candidato VARCHAR,id_eleicao VARCHAR,id_municipio VARCHAR,id_partido VARCHAR,uf VARCHAR,gastos_campanha_total DOUBLE);
   CREATE TABLE Eleicao(id_eleicao VARCHAR,ano INTEGER,cargo VARCHAR,turno INTEGER,tipo_eleicao VARCHAR,data DATE);
   CREATE TABLE Resultado_Candidatura(id_resultado VARCHAR,id_candidatura VARCHAR,turno INTEGER,resultado VARCHAR,votos BIGINT);
   CREATE TABLE Municipio(id_municipio VARCHAR,nome VARCHAR,uf VARCHAR);
   CREATE TABLE Partido(id_partido VARCHAR,sigla VARCHAR);
   CREATE TABLE Votos_Partido_Municipio(id_eleicao VARCHAR,id_municipio VARCHAR,id_partido VARCHAR,turno INTEGER,votos_nominais BIGINT,votos_legenda BIGINT);
   CREATE TABLE Censo_Municipio(id_municipio VARCHAR,ano_referencia INTEGER,populacao BIGINT,idhm DOUBLE,pib DOUBLE);
   CREATE TABLE Participacao_Eleitoral(id_municipio VARCHAR,ano_participacao INTEGER,eleitorado_apto BIGINT,abstencoes BIGINT,taxa_abstencao DOUBLE);
   INSERT INTO Municipio VALUES ('1','Cidade A','CE'),('2','Cidade B','CE');
   INSERT INTO Partido VALUES ('a','PA'),('b','PB');
   INSERT INTO Eleicao VALUES ('20',2020,'Vereador',1,'ORDINÁRIA','2020-11-15'),('24',2024,'Vereador',1,'ORDINÁRIA','2024-10-06');
   INSERT INTO Candidato VALUES ('p1','2000-01-01'),('p2','1980-01-01');
   INSERT INTO Candidatura VALUES ('a20','p1','20','1','a','CE',100),('b20','p2','20','1','b','CE',1000),('a24','p1','24','1','b','CE',200);
   INSERT INTO Resultado_Candidatura VALUES ('r1','a20',1,'ELEITO POR QP',300),('r2','b20',1,'SUPLENTE',500),('r3','a24',1,'ELEITO',400);
   INSERT INTO Votos_Partido_Municipio VALUES ('20','1','a',1,300,10),('20','1','b',1,200,20),('24','1','a',1,100,10),('24','1','b',1,400,20),('20','2','a',1,100,0),('20','2','b',1,100,0),('24','2','b',1,200,0);
   INSERT INTO Censo_Municipio VALUES ('1',2022,1000,0.6,100000);
   INSERT INTO Participacao_Eleitoral VALUES ('1',2024,800,80,0.1);''')
  def read(sql,params=()):
   cur=self.con.execute(sql.replace('{db}.main.',''),list(params));columns=[c[0] for c in cur.description];return [dict(zip(columns,row)) for row in cur.fetchall()]
  self.mock=patch.object(e,'read',side_effect=read);self.mock.start()
 def tearDown(self):self.mock.stop();self.con.close()
 def test_leader_transitions_exclude_tied_origin(self):
  rows=e.transitions()['rows'];self.assertEqual(len(rows),1);self.assertEqual((rows[0]['origem'],rows[0]['destino']),('PA','PB'))
 def test_cohort_denominator_includes_people_who_do_not_return(self):
  rows=e.continuity()['rows'];young=next(r for r in rows if r['faixa']=='18–29 anos');older=next(r for r in rows if r['faixa']=='30 anos ou mais');self.assertEqual(young['taxa'],100);self.assertEqual(older['taxa'],0);self.assertEqual(young['mudancas_partido'],1)
 def test_parties_do_not_duplicate_candidates_when_joining_votes(self):
  rows=e.parties(2024,'VEREADOR','CE')['rows'];self.assertEqual(sum(r['candidaturas'] or 0 for r in rows),1);self.assertEqual(sum(r['eleitos'] or 0 for r in rows),1)
 def test_spending_rates_and_medians(self):
  data=e.spending(2020,'VEREADOR','CE');self.assertEqual(sum(r['candidaturas'] for r in data['rows']),2);self.assertEqual(data['summary']['mediana_eleitos'],100);self.assertEqual(data['summary']['mediana_nao_eleitos'],1000)
 def test_territorial_units_are_percentages_and_census_reference_is_fixed(self):
  row=e.territory(2024,'CE')['rows'][0];self.assertEqual(row['abstencao'],10);self.assertEqual(row['pib_per_capita'],100)
 def test_out_of_scope_parameters_are_rejected(self):
  with self.assertRaises(HTTPException):e.parties(2024,'DEPUTADO FEDERAL','CE')
  with self.assertRaises(HTTPException):e.territory(2024,'SP')
  with self.assertRaises(HTTPException):e.continuity("CE' OR 1=1 --")

if __name__=='__main__':unittest.main()
