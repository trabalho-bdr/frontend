"""Testes unitários para o módulo da Questão 6 (server/questao6.py)."""
import unittest
import sys
from pathlib import Path
from fastapi import HTTPException

# Adicionar diretório server ao path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
import app
from questao6 import (
    get_overview,
    get_partidos,
    get_municipios,
    get_evolucao,
    get_candidatos,
    _valida_recorte
)


class Questao6Tests(unittest.TestCase):
    def setUp(self):
        self.old_rows = app._rows
        self.captured_queries = []

        def mock_rows(sql, params=()):
            self.assertEqual(sql.count('?'), len(params), "Número de '?' no SQL deve bater com len(params)")
            self.assertTrue(sql.lstrip().upper().startswith(('SELECT', 'WITH')), "Apenas consultas SELECT ou WITH são permitidas")
            self.assertNotIn('DELETE ', sql.upper())
            self.assertNotIn('DROP ', sql.upper())
            self.assertNotIn('UPDATE ', sql.upper())
            self.assertIn('v3.main.', sql)
            self.captured_queries.append((sql, list(params)))

            # Mock para overview
            if 'faixas AS (' in sql:
                return [
                    {'faixa': '18 a 29 anos', 'ordem': 1, 'candidaturas': 5796, 'definidos': 5563, 'eleitos': 851, 'taxa_eleicao': 15.30, 'media_votos': 275.5, 'mediana_idade_faixa': 26.0},
                    {'faixa': '30 a 44 anos', 'ordem': 2, 'candidaturas': 31231, 'definidos': 30185, 'eleitos': 5549, 'taxa_eleicao': 18.38, 'media_votos': 370.5, 'mediana_idade_faixa': 38.0},
                    {'faixa': '45 a 59 anos', 'ordem': 3, 'candidaturas': 35454, 'definidos': 34411, 'eleitos': 5394, 'taxa_eleicao': 15.68, 'media_votos': 330.0, 'mediana_idade_faixa': 51.0},
                    {'faixa': '60 anos ou mais', 'ordem': 4, 'candidaturas': 12462, 'definidos': 11995, 'eleitos': 1345, 'taxa_eleicao': 11.21, 'media_votos': 283.2, 'mediana_idade_faixa': 65.0},
                    {'faixa': 'Sem idade válida', 'ordem': 5, 'candidaturas': 10, 'definidos': 9, 'eleitos': 0, 'taxa_eleicao': 0.0, 'media_votos': 329.7, 'mediana_idade_faixa': None}
                ]

            # Mock para partidos
            if 'agrupado AS (' in sql:
                return [
                    {
                        'sigla': 'PSOL',
                        'partido_nome': 'Partido Socialismo e Liberdade',
                        'total_candidaturas': 835,
                        'validas': 835,
                        'jovens': 110,
                        'adultos_30_44': 284,
                        'maduros_45_59': 310,
                        'idosos_60_mais': 131,
                        'sem_idade': 0,
                        'pct_jovens': 13.17,
                        'pct_adultos': 34.01,
                        'pct_maduros': 37.13,
                        'pct_idosos': 15.69,
                        'eleitos_total': 21,
                        'jovens_eleitos': 3,
                        'jovens_definidos': 102,
                        'taxa_eleicao_jovens': 2.94,
                        'taxa_eleicao_geral': 2.51
                    }
                ]

            # Mock para municipios
            if 'mun AS (' in sql:
                return [
                    {
                        'id_municipio': '2111029',
                        'municipio_nome': 'São João do Carú',
                        'uf': 'MA',
                        'total_candidaturas': 40,
                        'validas': 40,
                        'jovens': 13,
                        'pct_jovens': 32.5,
                        'total_eleitos': 11,
                        'jovens_eleitos': 3,
                        'jovens_definidos': 13,
                        'taxa_eleicao_jovens': 23.08,
                        'populacao': 12345
                    },
                    {
                        'id_municipio': '2100055',
                        'municipio_nome': 'Açailândia',
                        'uf': 'MA',
                        'total_candidaturas': 100,
                        'validas': 100,
                        'jovens': 10,
                        'pct_jovens': 10.0,
                        'total_eleitos': 17,
                        'jovens_eleitos': 1,
                        'jovens_definidos': 10,
                        'taxa_eleicao_jovens': 10.0,
                        'populacao': 106000
                    }
                ]

            # Mock para evolucao
            if 'pct_candidaturas_jovens' in sql:
                return [
                    {
                        'ano': 2020,
                        'candidaturas': 107890,
                        'validas': 107806,
                        'jovens': 9659,
                        'pct_candidaturas_jovens': 8.96,
                        'total_eleitos': 13205,
                        'eleitos_validos': 13202,
                        'jovens_eleitos': 986,
                        'pct_eleitos_jovens': 7.47,
                        'jovens_definidos': 9360,
                        'taxa_eleicao_jovens': 10.53
                    },
                    {
                        'ano': 2024,
                        'candidaturas': 84953,
                        'validas': 84943,
                        'jovens': 5796,
                        'pct_candidaturas_jovens': 6.82,
                        'total_eleitos': 13139,
                        'eleitos_validos': 13139,
                        'jovens_eleitos': 851,
                        'pct_eleitos_jovens': 6.48,
                        'jovens_definidos': 5563,
                        'taxa_eleicao_jovens': 15.30
                    }
                ]

            # Mock para candidatos
            if 'total_encontrado' in sql:
                return [{
                    'id': 'cand1',
                    'nome': 'JOVEM CANDIDATO',
                    'numero': 13123,
                    'partido': 'PT',
                    'ano': 2024,
                    'cargo': 'VEREADOR',
                    'uf': 'RS',
                    'municipio': 'Porto Alegre',
                    'idade': 24,
                    'votos': 1500,
                    'resultado': 'ELEITO',
                    'gastos': 8000.0,
                    'total_encontrado': 1
                }]

            return []

        app._rows = mock_rows

    def tearDown(self):
        app._rows = self.old_rows

    def test_valida_recorte_e_incompatibilidades(self):
        # Válidos
        ano, cargo, uf = _valida_recorte(2024, 'VEREADOR', 'RS')
        self.assertEqual((ano, cargo, uf), (2024, 'VEREADOR', 'RS'))

        ano, cargo, uf = _valida_recorte(2022, 'DEPUTADO ESTADUAL', 'CE')
        self.assertEqual((ano, cargo, uf), (2022, 'DEPUTADO ESTADUAL', 'CE'))

        # Incompatibilidade de anos e cargos
        with self.assertRaises(HTTPException):
            _valida_recorte(2022, 'VEREADOR')  # Vereador não ocorre em 2022

        with self.assertRaises(HTTPException):
            _valida_recorte(2024, 'DEPUTADO FEDERAL')  # Deputado não ocorre em 2024

        with self.assertRaises(HTTPException):
            _valida_recorte(2024, 'VEREADOR', 'SP')  # SP fora das 6 UFs

    def test_overview_calcula_denominadores_corretos(self):
        data = get_overview(ano=2024, cargo='VEREADOR')
        totais = data['totais']
        self.assertEqual(totais['total_candidaturas'], 84953)
        self.assertEqual(totais['validas'], 84943)
        self.assertEqual(totais['sem_idade'], 10)
        self.assertEqual(totais['total_eleitos'], 13139)

        faixas = {f['faixa']: f for f in data['faixas']}
        jovem = faixas['18 a 29 anos']

        # Participação entre candidaturas: 5796 / 84943 = 6.82%
        self.assertEqual(jovem['pct_candidaturas'], 6.82)
        # Participação entre eleitos: 851 / 13139 = 6.48%
        self.assertEqual(jovem['pct_eleitos'], 6.48)
        # Taxa de eleição: 851 / 5563 = 15.30%
        self.assertEqual(jovem['taxa_eleicao'], 15.30)
        # Participação entre eleitos != Taxa de eleição
        self.assertNotEqual(jovem['pct_eleitos'], jovem['taxa_eleicao'])

        # Sem idade válida fica fora do total válido
        sem_idade = faixas['Sem idade válida']
        self.assertIsNone(sem_idade['pct_candidaturas'])
        self.assertIsNone(sem_idade['pct_eleitos'])

    def test_partidos_retorna_composicao(self):
        data = get_partidos(ano=2024, cargo='VEREADOR')
        self.assertEqual(data['total_partidos'], 1)
        partido = data['partidos'][0]
        self.assertEqual(partido['sigla'], 'PSOL')
        self.assertEqual(partido['pct_jovens'], 13.17)
        self.assertEqual(partido['jovens_eleitos'], 3)
        self.assertEqual(partido['taxa_eleicao_jovens'], 2.94)

    def test_municipios_calcula_media_ponderada(self):
        data = get_municipios(ano=2024, cargo='VEREADOR', uf='MA')
        self.assertEqual(data['total_municipios'], 2)
        # Total jovens = 13 + 10 = 23; Total validas = 40 + 100 = 140
        # Média ponderada = 23 / 140 * 100 = 16.43%
        self.assertEqual(data['media_ponderada_pct_jovens'], 16.43)

    def test_evolucao_calcula_variacao_pontos_percentuais(self):
        data = get_evolucao(cargo='VEREADOR')
        self.assertEqual(data['anos_comparados'], [2020, 2024])
        vars_pp = data['variacao_pontos_percentuais']
        # 6.82 - 8.96 = -2.14 p.p.
        self.assertEqual(vars_pp['pct_candidaturas_jovens'], -2.14)
        # 6.48 - 7.47 = -0.99 p.p.
        self.assertEqual(vars_pp['pct_eleitos_jovens'], -0.99)
        # 15.30 - 10.53 = +4.77 p.p.
        self.assertEqual(vars_pp['taxa_eleicao_jovens'], 4.77)

    def test_candidatos_paginacao_e_retorno(self):
        data = get_candidatos(ano=2024, cargo='VEREADOR', faixa='18_29')
        self.assertEqual(data['total'], 1)
        self.assertEqual(len(data['candidatos']), 1)
        cand = data['candidatos'][0]
        self.assertEqual(cand['nome'], 'JOVEM CANDIDATO')
        self.assertEqual(cand['idade'], 24)


if __name__ == '__main__':
    unittest.main()
