"""Testes unitários para o módulo da Questão 1 (server/questao1.py)."""
import unittest
import sys
from pathlib import Path
from fastapi import HTTPException

# Adicionar diretório server ao path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
import app
from questao1 import get_overview, get_ranking, get_dispersao, get_dossie, _valida_recorte


class Questao1Tests(unittest.TestCase):
    def setUp(self):
        self.old_rows = app._rows
        self.captured_queries = []

        def mock_rows(sql, params=()):
            self.assertEqual(sql.count('?'), len(params), "Número de '?' no SQL deve bater com len(params)")
            self.assertTrue(sql.lstrip().upper().startswith(('SELECT', 'WITH')), "Apenas consultas SELECT ou WITH são permitidas")
            self.assertNotIn('DELETE ', sql.upper())
            self.assertNotIn('DROP ', sql.upper())
            self.assertNotIn('UPDATE ', sql.upper())
            self.assertIn('v4.main.', sql)
            self.captured_queries.append((sql, list(params)))

            # Retorno simulado realista
            if 'total_candidaturas' in sql and 'gasto_por_cadeira' in sql:
                return [{
                    'total_candidaturas': 84953,
                    'candidaturas_com_gasto': 84366,
                    'candidaturas_gasto_zero': 21928,
                    'candidaturas_gasto_positivo': 62438,
                    'eleitos': 13139,
                    'nao_eleitos': 51079,
                    'com_votos': 81409,
                    'total_despesas': 676566596.81,
                    'gasto_por_cadeira': 51493.01,
                    'mediana_gastos_eleitos': 3819.3,
                    'mediana_gastos_nao_eleitos': 1600.0,
                    'mediana_votos_eleitos': 524.0,
                    'mediana_votos_nao_eleitos': 82.0,
                    'mediana_custo_voto_eleitos': 12.5,
                    'mediana_custo_voto_nao_eleitos': 25.0
                }]
            if 'total_encontrado' in sql:
                return [{
                    'id': 'abc123',
                    'nome': 'CANDIDATO TESTE',
                    'numero': 12345,
                    'partido': 'PART',
                    'uf': 'RS',
                    'municipio': 'Porto Alegre',
                    'cargo': 'VEREADOR',
                    'ano': 2024,
                    'gastos': 10000.0,
                    'votos': 1000,
                    'resultado': 'ELEITO',
                    'eleito': 1,
                    'custo_voto': 10.0,
                    'total_encontrado': 1
                }]
            if 'validos_scatter' in sql:
                return [{
                    'total_universo': 84953,
                    'validos_scatter': 61530,
                    'excluidos_zero_ou_nulo': 23423,
                    'r_linear': 0.6331,
                    'r_log': 0.4562,
                    'r2_log': 0.2081,
                    'mediana_gastos_scatter': 2500.0,
                    'mediana_votos_scatter': 150.0
                }]
            if 'cota_eleitos' in sql or 'rn <=' in sql:
                return [{
                    'id': 'p1',
                    'nome': 'PONTO ELEITO',
                    'numero': 10100,
                    'partido': 'PART',
                    'uf': 'RS',
                    'municipio': 'Porto Alegre',
                    'gastos': 5000.0,
                    'votos': 800,
                    'resultado': 'ELEITO',
                    'eleito': 1,
                    'custo_voto': 6.25
                }]
            if 'b1' in sql and 'b7' in sql:
                return [{'b1': 100, 'b2': 200, 'b3': 150, 'b4': 80, 'b5': 30, 'b6': 10, 'b7': 5}]
            return []

        app._rows = mock_rows

    def tearDown(self):
        app._rows = self.old_rows

    def test_valida_recorte_e_anos_compativeis(self):
        # Válidos
        ano, cargo, uf, mun = _valida_recorte(2024, 'VEREADOR', 'RS')
        self.assertEqual((ano, cargo, uf), (2024, 'VEREADOR', 'RS'))

        ano, cargo, uf, _ = _valida_recorte(2022, 'DEPUTADO FEDERAL', 'RJ')
        self.assertEqual((ano, cargo, uf), (2022, 'DEPUTADO FEDERAL', 'RJ'))

        # Incompatibilidade de anos para o cargo
        with self.assertRaises(HTTPException):
            _valida_recorte(2018, 'VEREADOR')  # Vereador apenas 2020 e 2024
        with self.assertRaises(HTTPException):
            _valida_recorte(2024, 'DEPUTADO FEDERAL')  # Deputado apenas 2018 e 2022

        # UF fora da cobertura
        with self.assertRaises(HTTPException):
            _valida_recorte(2024, 'VEREADOR', 'SP')

    def test_overview_parametrizacao_e_formula(self):
        res = get_overview(ano=2024, cargo='VEREADOR', uf='RS')
        self.assertEqual(res['ano'], 2024)
        self.assertEqual(res['cargo'], 'VEREADOR')
        self.assertEqual(res['uf'], 'RS')
        self.assertIn('gasto_por_cadeira', res['data'])

        # Verificar se exclui eleições suplementares e aplica a fórmula correta
        overview_sql, params = self.captured_queries[0]
        self.assertIn("e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%'", overview_sql)
        self.assertIn("SUM(c.gastos_campanha_total) / NULLIF(COUNT(*) FILTER (WHERE UPPER(r.resultado) LIKE 'ELEITO%'), 0)", overview_sql)
        self.assertEqual(params, [2024, 'VEREADOR', 'RS'])

    def test_ranking_ordem_custo_voto_filtra_positivos(self):
        res = get_ranking(ano=2024, cargo='VEREADOR', uf='CE', ordem='custo_voto', filtro_resultado='eleitos')
        self.assertEqual(len(res['rows']), 1)
        self.assertEqual(res['rows'][0]['custo_voto'], 10.0)

        # Checar cláusulas do ranking
        rank_sql, params = self.captured_queries[0]
        self.assertIn("c.gastos_campanha_total IS NOT NULL AND c.gastos_campanha_total > 0", rank_sql)
        self.assertIn("r.votos IS NOT NULL AND r.votos > 0", rank_sql)
        self.assertIn("UPPER(r.resultado) LIKE 'ELEITO%'", rank_sql)
        self.assertIn("LIMIT ? OFFSET ?", rank_sql)

    def test_ranking_ordem_gastos_e_votos(self):
        get_ranking(ano=2022, cargo='DEPUTADO ESTADUAL', uf='RJ', ordem='gastos', filtro_resultado='nao_eleitos')
        rank_sql, _ = self.captured_queries[0]
        self.assertIn("c.gastos_campanha_total DESC NULLS LAST", rank_sql)
        self.assertIn("UPPER(r.resultado) IN ('NÃO ELEITO', 'NAO ELEITO', 'SUPLENTE')", rank_sql)

    def test_dispersao_calcula_estatisticas_e_amostra(self):
        res = get_dispersao(ano=2024, cargo='VEREADOR', uf='RS', max_pontos=500)
        self.assertIn('correlacao', res)
        self.assertIn('r_log', res['correlacao'])
        self.assertIn('r2_log', res['correlacao'])
        self.assertIn('aviso_causalidade', res['correlacao'])
        self.assertIn('medianas', res)

        # Checar que consulta stats usa log10 e Pearson
        stats_sql, _ = self.captured_queries[0]
        self.assertIn("CORR(log10(c.gastos_campanha_total), log10(r.votos))", stats_sql)

    def test_dossie_retorna_agregacoes_dos_sete_graficos(self):
        res = get_dossie(ano=2024, cargo='VEREADOR', uf='CE')
        self.assertEqual(res['ano'], 2024)
        self.assertEqual(res['cargo'], 'VEREADOR')
        self.assertEqual(res['uf'], 'CE')
        self.assertIn('por_partido', res)
        self.assertIn('por_uf', res)
        self.assertIn('comparacao_cargos', res)
        self.assertEqual(len(res['histograma_eleitos']), 7)

    def test_presidente_anos_e_endpoints(self):
        ano, cargo, uf, mun = _valida_recorte(2022, 'PRESIDENTE')
        self.assertEqual((ano, cargo, uf, mun), (2022, 'PRESIDENTE', '', ''))
        ano, cargo, uf, mun = _valida_recorte(2018, 'PRESIDENTE')
        self.assertEqual((ano, cargo, uf, mun), (2018, 'PRESIDENTE', '', ''))
        with self.assertRaises(HTTPException):
            _valida_recorte(2024, 'PRESIDENTE')
        with self.assertRaises(HTTPException):
            _valida_recorte(2020, 'PRESIDENTE')
        ov = get_overview(ano=2022, cargo='PRESIDENTE')
        self.assertEqual(ov['cargo'], 'PRESIDENTE')
        self.assertEqual(ov['data']['eleitos'], 1)
        self.assertGreater(ov['data']['total_despesas'], 300000000)
        rk = get_ranking(ano=2022, cargo='PRESIDENTE', ordem='gastos')
        self.assertGreaterEqual(rk['total'], 11)
        self.assertEqual(rk['rows'][0]['partido'], 'PT')
        dp = get_dispersao(ano=2022, cargo='PRESIDENTE')
        self.assertEqual(dp['total_exibido'], len(dp['pontos']))
        ds = get_dossie(ano=2022, cargo='PRESIDENTE')
        self.assertIn('por_partido', ds)
        self.assertIn('por_uf', ds)
        self.assertIn('comparacao_cargos', ds)
        self.assertEqual(len(ds['histograma_eleitos']), 7)

    def test_bloqueia_parametros_maliciosos(self):
        with self.assertRaises(HTTPException):
            get_ranking(partido="PT'; DROP TABLE Candidatura;--")
        with self.assertRaises(HTTPException):
            get_ranking(municipio_id="123'; SELECT 1;--")
        with self.assertRaises(HTTPException):
            get_ranking(filtro_resultado="invalido")


if __name__ == '__main__':
    unittest.main()
