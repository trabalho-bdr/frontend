"""Actual SQL on synthetic DuckDB fixtures; no test records enter the product."""
import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import duckdb
from fastapi import HTTPException
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app
import adesivaria as api


class AdesivariaRanking(unittest.TestCase):
    def setUp(self):
        self.con=duckdb.connect(':memory:');self.con.execute("ATTACH ':memory:' AS v4")
        self.con.execute('CREATE TABLE v4.main.Eleicao(id_eleicao VARCHAR,ano INTEGER,cargo VARCHAR,tipo_eleicao VARCHAR,turno INTEGER)')
        self.con.execute("""INSERT INTO v4.main.Eleicao VALUES('v',2024,'VEREADOR','ORDINÁRIA',1),
         ('p1',2024,'PREFEITO','ORDINÁRIA',1),('p2',2024,'PREFEITO','ORDINÁRIA',2),
         ('f',2022,'DEPUTADO FEDERAL','ORDINÁRIA',1),('s',2024,'VEREADOR','SUPLEMENTAR',1)""")
        self.con.execute('CREATE TABLE v4.main.Municipio(id_municipio VARCHAR,nome VARCHAR,uf VARCHAR)')
        self.con.execute("INSERT INTO v4.main.Municipio VALUES('2304400','Fortaleza','CE'),('2303709','Caucaia','CE'),('3304557','Rio de Janeiro','RJ')")
        self.con.execute('CREATE TABLE v4.main.Partido(id_partido INTEGER,sigla VARCHAR)')
        self.con.execute("INSERT INTO v4.main.Partido VALUES(1,'PT'),(2,'PL')")
        self.con.execute('''CREATE TABLE v4.main.Candidatura(id_candidatura VARCHAR,nome_urna VARCHAR,numero_urna INTEGER,
          id_partido INTEGER,id_eleicao VARCHAR,id_municipio VARCHAR,uf VARCHAR,patrimonio DOUBLE,gastos_campanha_total DOUBLE)''')
        self.con.execute('CREATE TABLE v4.main.Resultado_Candidatura(id_candidatura VARCHAR,turno INTEGER,resultado VARCHAR,votos BIGINT)')
        self.con.execute('CREATE TABLE v4.main.Despesa_Candidatura(id_despesa VARCHAR,id_candidatura VARCHAR,categoria VARCHAR,valor DOUBLE)')
        for i in range(40):
            self.person(i,town='2304400' if i<20 else '2303709' if i<30 else '3304557',uf='CE' if i<30 else 'RJ',votes=None if i==39 else 1000-i)
            if i!=38:self.expense(str(i),i,'ADESIVO PERFURADO',None if i==37 else -12 if i==36 else i*10)
        self.con.execute('INSERT INTO v4.main.Resultado_Candidatura VALUES(?,?,?,?),(?,?,?,?),(?,?,?,?)',
         [self.cid(0),1,'ELEITO',1000,self.cid(0),2,'ELEITO',999999,self.cid(1),1,'NÃO ELEITO',9999])
        self.expense('equal-value-distinct-id',2,'ADESIVO PERFURADO',20)
        self.expense('mixed',3,'ADESIVOS E BANDEIRAS',1000000)
        self.expense('service',4,'INSTALAÇÃO DE ADESIVOS',2000000)
        self.expense('santinho',5,'AQUISIÇÃO DE SANTINHOS',40)
        self.expense('bandeira',6,'CONFECÇÃO DE BANDEIRAS',60)
        self.expense('unknown',7,None,30)
        for i,office,amount in [(60,'p1',100),(61,'p2',9000000),(70,'f',1234),(71,'s',99999999)]:
            self.person(i,office=office,votes=777);self.expense(str(i),i,'ADESIVOS',amount)
        self.person(72,uf='SP');self.expense('outside',72,'ADESIVOS',99999999)

    @staticmethod
    def cid(i):return f'{i:032x}'

    def person(self,i,office='v',town='2304400',uf='CE',votes=100):
        self.con.execute('INSERT INTO v4.main.Candidatura VALUES(?,?,?,?,?,?,?,?,?)',[self.cid(i),f'Nome {i:02}',10000+i,1+i%2,office,town,uf,None,50000])
        self.con.execute('INSERT INTO v4.main.Resultado_Candidatura VALUES(?,?,?,?)',[self.cid(i),2 if office=='p2' else 1,'ELEITO',votes])

    def expense(self,id,i,category,value):
        self.con.execute('INSERT INTO v4.main.Despesa_Candidatura VALUES(?,?,?,?)',[id,self.cid(i),category,value])

    def tearDown(self):self.con.close()

    def rows(self,sql,args=()):
        self.assertTrue(sql.lstrip().upper().startswith(('WITH','SELECT')))
        self.assertEqual(re.sub(r"'(?:[^']|'')*'","''",sql).count('?'),len(args))
        cursor=self.con.execute(sql,args)
        return [dict(zip([col[0] for col in cursor.description],row)) for row in cursor.fetchall()]

    def summary(self,**kw):
        with patch.object(app,'_rows',self.rows):return api.summary(material='adesivos',**kw)

    def test_global_rankings_and_independent_pagination(self):
        result=self.summary();page=self.summary(offset=12,offset_votos=12)
        self.assertEqual(result['stats']['candidaturas'],40)
        self.assertEqual(len(result['candidates']),12)
        self.assertEqual(result['podium'][0]['id'],self.cid(39))
        self.assertEqual(result['votes'][0]['id'],self.cid(0))
        self.assertNotIn(self.cid(0),[row['id'] for row in result['candidates']])
        self.assertEqual(result['votes'][0]['votos'],1000)
        self.assertEqual(result['stats']['lider_votos_id'],self.cid(0))
        self.assertEqual(result['stats']['maior_votacao'],1000)
        self.assertEqual(page['candidates'][0]['posicao_gastos'],13)
        self.assertEqual(page['votes'][0]['posicao_votos'],13)
        self.assertEqual(page['podium'],result['podium']);self.assertEqual(page['stats'],result['stats'])

    def test_results_never_multiply_expenses_and_conflicts_stay_missing(self):
        expected=sum(i*10 for i in range(40) if i not in [36,37,38])-12+20
        result=self.summary()
        self.assertEqual(result['stats']['valor'],expected)
        self.assertEqual(sum(row['valor'] for row in result['parties']),expected)
        self.assertEqual(result['stats']['resultados_conflitantes'],1)
        with patch.object(app,'_rows',self.rows):detail=api.candidate(self.cid(1),material='adesivos')
        self.assertIsNone(detail['candidate']['votos']);self.assertIsNone(detail['candidate']['resultado'])
        self.assertTrue(detail['candidate']['conflito_resultado']);self.assertEqual(detail['candidate']['gastos_classificados'],10)
        mayor=self.summary(cargo='PREFEITO')
        self.assertEqual(mayor['stats']['candidaturas'],1);self.assertEqual(mayor['stats']['valor'],100)
        self.assertEqual(mayor['votes'][0]['votos'],777)

    def test_zero_negative_and_missing_values_remain_distinct(self):
        with patch.object(app,'_rows',self.rows):
            zero=api.candidate(self.cid(0),material='adesivos');missing=api.candidate(self.cid(37),material='adesivos')
            none=api.candidate(self.cid(38),material='adesivos');negative=api.candidate(self.cid(36),material='adesivos')
        self.assertEqual(zero['candidate']['gastos_classificados'],0);self.assertIsNotNone(zero['candidate']['posicao_gastos'])
        self.assertEqual(missing['total'],1);self.assertIsNone(missing['candidate']['gastos_classificados'])
        self.assertIsNone(missing['candidate']['posicao_gastos']);self.assertEqual(none['total'],0)
        self.assertIsNone(none['candidate']['gastos_classificados']);self.assertEqual(negative['candidate']['gastos_classificados'],-12)

    def test_scope_and_validation_reject_arbitrary_municipal_attribution(self):
        self.assertEqual(self.summary(uf='CE',abrangencia='estado')['stats']['candidaturas'],30)
        self.assertEqual(self.summary(uf='CE',abrangencia='municipio',municipio='2304400')['stats']['candidaturas'],20)
        self.assertEqual(self.summary(partido='pt')['stats']['candidaturas'],20)
        self.assertIsNone(self.summary(ano=2022,cargo='DEPUTADO FEDERAL',uf='CE')['podium'][0]['municipio'])
        for kw in [dict(ano=2023),dict(uf='SP'),dict(material='fake'),dict(abrangencia='municipio',uf='CE',municipio='3304557'),
          dict(abrangencia='municipio',uf='CE',municipio='2304400',cargo='DEPUTADO FEDERAL'),
          dict(abrangencia='municipio',uf='CE',municipio='2304400',ano=2022),dict(abrangencia='seis_estados',uf='CE'),
          dict(municipio="' OR 1=1 --"),dict(limit=25),dict(offset=-1)]:
            with self.subTest(kw=kw),patch.object(app,'_rows',self.rows),self.assertRaises(HTTPException):api.summary(**kw)
        self.assertEqual(self.summary(partido="' OR 1=1 --")['stats']['candidaturas'],0)

    def test_materials_ledger_and_category_pagination_are_auditable(self):
        result=self.summary();self.assertEqual(result['stats']['lancamentos_nao_classificados'],3)
        with patch.object(app,'_rows',self.rows):
            all_types=api.summary(material='todos');detail=api.candidate(self.cid(2),material='adesivos',limit=1)
            page=api.candidate(self.cid(2),material='adesivos',limit=1,offset=1);empty=api.summary(partido='MISSING')
        self.assertEqual(all_types['stats']['valor'],result['stats']['valor']+100)
        self.assertEqual(detail['candidate']['gastos_classificados'],40);self.assertEqual(detail['candidate']['gastos'],50000)
        self.assertEqual(detail['total'],2);self.assertNotEqual(detail['entries'][0]['id'],page['entries'][0]['id'])
        self.assertEqual(empty['stats']['candidaturas'],0);self.assertIsNone(empty['stats']['valor'])
        with patch.object(app,'_rows',self.rows),self.assertRaises(HTTPException):api.candidate(self.cid(0),uf='RJ')
        for i in range(30):self.expense(f'category-{i}',2,f'ADESIVO MODELO {i:02}',1)
        first=self.summary();second=self.summary(offset_categorias=25)
        self.assertEqual(len(first['categories']),25);self.assertGreater(len(second['categories']),0)
        self.assertFalse(set(row['categoria'] for row in first['categories'])&set(row['categoria'] for row in second['categories']))

    def test_classifier_rejects_services_mixed_products_and_generic_materials(self):
        for description in ['SANTINHOS E BANNERS','ADESIVOS E BANDEIRAS','BANDEIRAS - LOCAÇÃO','RETIRADA DE ADESIVOS','MATERIAL GRÁFICO','ADESIVAGEM']:
            self.assertIsNone(self.con.execute(f'SELECT {api.MATERIAL_CASE} FROM (SELECT ? categoria) d',[description]).fetchone()[0])
        for description,kind in [('ADESIVO PERFURADO','Adesivos'),('CONFECÇÃO DE SANTINHOS','Santinhos'),('BANDEIRAS DE TECIDO','Bandeiras')]:
            self.assertEqual(self.con.execute(f'SELECT {api.MATERIAL_CASE} FROM (SELECT ? categoria) d',[description]).fetchone()[0],kind)
