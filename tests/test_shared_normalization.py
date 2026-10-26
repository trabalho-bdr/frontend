import json
import unittest
from domain.normalization import SHARED, source_value
from catalog_facets import facet_key, facet_sql
import duckdb

class SharedNormalization(unittest.TestCase):
    def test_python_sql_share_missing_and_restricted_semantics(self):
        cases = json.loads((SHARED / 'normalization-cases.json').read_text(encoding='utf8'))
        with duckdb.connect(':memory:') as connection:
            for case in cases:
                value = case['input']
                with self.subTest(value=value):
                    self.assertEqual(source_value(value), case['expected'])
                    actual = connection.execute('SELECT ' + facet_sql('ocupacao') +
                        ' FROM (SELECT ?::VARCHAR ocupacao)', [value]).fetchone()[0]
                    self.assertEqual(actual, facet_key('ocupacao', value))
