"""Run the Atlas endpoint against local DuckDB with all real mesh IDs.

Only geographic records are inserted. Empty indicator tables check that the
joins retain every municipality and return nulls rather than invented zeroes.
No MotherDuck credentials or network connection are required.
"""
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import duckdb
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
import app


class AtlasLoadingTests(unittest.TestCase):
    def setUp(self):
        self.con = duckdb.connect(':memory:')
        self.con.execute("ATTACH ':memory:' AS pipeline_bdr_der_completo_v4")
        self.con.execute('CREATE TABLE pipeline_bdr_der_completo_v4.main.Municipio(id_municipio VARCHAR,nome VARCHAR,uf VARCHAR,regiao VARCHAR)')
        self.con.execute('CREATE TABLE pipeline_bdr_der_completo_v4.main.Censo_Municipio(id_municipio VARCHAR,ano_referencia INTEGER,populacao DOUBLE,idhm DOUBLE,pib DOUBLE)')
        self.con.execute('CREATE TABLE pipeline_bdr_der_completo_v4.main.Participacao_Eleitoral(id_municipio VARCHAR,ano_participacao INTEGER,taxa_abstencao DOUBLE)')
        self.counts = {}
        for uf in ['CE', 'MA', 'MS', 'RJ', 'RN', 'RS']:
            features = json.loads((ROOT / 'public/maps' / f'{uf}.geojson').read_text(encoding='utf-8'))['features']
            self.counts[uf] = len(features)
            records = [(str(f['properties']['codarea']), f['properties']['nome'], uf, None) for f in features]
            self.con.executemany('INSERT INTO pipeline_bdr_der_completo_v4.main.Municipio VALUES (?,?,?,?)', records)
        self.client = TestClient(app.app)

    def tearDown(self):
        self.client.close()
        self.con.close()

    def rows(self, sql, params=()):
        result = self.con.execute(sql, list(params))
        columns = [c[0] for c in result.description]
        return [dict(zip(columns, row)) for row in result.fetchall()]

    def test_each_uf_returns_every_municipality_even_without_indicators(self):
        with patch.object(app, '_rows', self.rows):
            for uf, expected in self.counts.items():
                with self.subTest(uf=uf):
                    response = self.client.get('/api/municipios', params={'uf': uf, 'limit': 1500})
                    self.assertEqual(response.status_code, 200)
                    rows = response.json()
                    self.assertEqual(len(rows), expected)
                    self.assertEqual(len({r['id'] for r in rows}), expected)
                    self.assertTrue(all(r['uf'] == uf for r in rows))
                    self.assertTrue(all(r[key] is None for r in rows for key in ['populacao', 'idhm', 'pib_per_capita', 'abstencao_2024']))

    def test_six_state_coverage_fits_the_existing_endpoint_limit(self):
        with patch.object(app, '_rows', self.rows):
            response = self.client.get('/api/municipios', params={'uf': '', 'limit': 1500})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json()), 1236)

    def test_limit_is_validated_by_the_endpoint(self):
        self.assertEqual(self.client.get('/api/municipios', params={'limit': 1501}).status_code, 422)
