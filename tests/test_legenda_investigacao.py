"""Q5: mesma disputa em dois anos e percentual ponderado pelos votos."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import duckdb
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
import app
import legenda_investigacao as q5


class LegendaInvestigation(unittest.TestCase):
    def setUp(self):
        self.con = duckdb.connect(':memory:')
        self.con.execute("ATTACH ':memory:' AS pipeline_bdr_der_completo_v4")
        self.con.execute('CREATE TABLE pipeline_bdr_der_completo_v4.main.Eleicao(id_eleicao VARCHAR,ano INTEGER,cargo VARCHAR,turno INTEGER,tipo_eleicao VARCHAR)')
        self.con.execute('CREATE TABLE pipeline_bdr_der_completo_v4.main.Municipio(id_municipio VARCHAR,nome VARCHAR,uf VARCHAR)')
        self.con.execute('CREATE TABLE pipeline_bdr_der_completo_v4.main.Partido(id_partido INTEGER,sigla VARCHAR)')
        self.con.execute('CREATE TABLE pipeline_bdr_der_completo_v4.main.Votos_Partido_Municipio(id_eleicao VARCHAR,id_municipio VARCHAR,id_partido INTEGER,turno INTEGER,votos_legenda INTEGER,votos_nominais INTEGER)')
        self.con.execute("INSERT INTO pipeline_bdr_der_completo_v4.main.Eleicao VALUES ('a',2020,'VEREADOR',1,'ORDINÁRIA'),('b',2024,'VEREADOR',1,'ORDINÁRIA'),('c',2022,'DEPUTADO FEDERAL',1,'ORDINÁRIA'),('s',2024,'VEREADOR',1,'SUPLEMENTAR')")
        self.con.execute("INSERT INTO pipeline_bdr_der_completo_v4.main.Municipio VALUES ('1','Um','CE'),('2','Dois','CE'),('3','Três','RJ'),('4','Quatro','SP')")
        self.con.execute("INSERT INTO pipeline_bdr_der_completo_v4.main.Partido VALUES (1,'PT'),(2,'PL')")
        self.con.execute("INSERT INTO pipeline_bdr_der_completo_v4.main.Votos_Partido_Municipio VALUES ('a','1',1,1,10,90),('a','2',1,1,90,10),('b','1',1,1,10,90),('b','2',1,1,10,890),('b','3',2,1,20,80),('b','4',1,1,1000,0),('s','1',1,1,1000,0),('c','1',1,1,900,100)")

    def tearDown(self):
        self.con.close()

    def rows(self, sql, params):
        cursor = self.con.execute(sql, params)
        return [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

    def test_series_are_separate_and_weighted(self):
        with patch.object(app, '_rows', self.rows):
            result = q5.serie()
            ce = q5.serie(uf='CE', partido='PT')
            town = q5.serie(uf='CE', municipio='1')
        self.assertEqual([row['ano'] for row in result['rows']], [2020, 2024])
        self.assertEqual(result['rows'][0]['percentual'], 50)
        self.assertAlmostEqual(result['rows'][1]['percentual'], 40 / 1100 * 100)
        self.assertEqual(ce['rows'][1]['percentual'], 2)
        self.assertEqual(town['rows'][1]['percentual'], 10)
        self.assertEqual(result['database'], 'pipeline_bdr_der_completo_v4')

    def test_invalid_comparisons_are_rejected(self):
        for kwargs in [{'cargo': 'PRESIDENTE'}, {'uf': 'SP'}, {'municipio': '1'}, {'cargo': 'VEREADOR; DROP TABLE'}]:
            with self.subTest(kwargs=kwargs), self.assertRaises(HTTPException):
                q5.serie(**kwargs)


if __name__ == '__main__':
    unittest.main()
