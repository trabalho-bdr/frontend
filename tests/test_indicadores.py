"""Testes da camada central de indicadores e diagnóstico."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import duckdb

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
import indicadores as ind


class IndicadoresTests(unittest.TestCase):
    def setUp(self):
        self.con = duckdb.connect(':memory:')
        self.con.execute('''
            CREATE TABLE Municipio(id_municipio VARCHAR, nome VARCHAR, uf VARCHAR);
            CREATE TABLE Partido(id_partido VARCHAR, sigla VARCHAR);
            CREATE TABLE Eleicao(id_eleicao VARCHAR, ano INTEGER, cargo VARCHAR, turno INTEGER, tipo_eleicao VARCHAR, data DATE);
            CREATE TABLE Candidato(id_candidato VARCHAR, dt_nascimento DATE);
            CREATE TABLE Candidatura(id_candidatura VARCHAR, id_candidato VARCHAR, id_eleicao VARCHAR, id_municipio VARCHAR, id_partido VARCHAR, uf VARCHAR, escolaridade_candidatura VARCHAR, patrimonio DOUBLE, gastos_campanha_total DOUBLE);
            CREATE TABLE Resultado_Candidatura(id_resultado VARCHAR, id_candidatura VARCHAR, turno INTEGER, resultado VARCHAR, votos BIGINT);
            CREATE TABLE Votos_Partido_Municipio(id_eleicao VARCHAR, id_municipio VARCHAR, id_partido VARCHAR, turno INTEGER, votos_nominais BIGINT, votos_legenda BIGINT);
            CREATE TABLE Censo_Municipio(id_municipio VARCHAR, ano_referencia INTEGER, populacao BIGINT, idhm DOUBLE, pib DOUBLE);
            CREATE TABLE Participacao_Eleitoral(id_municipio VARCHAR, ano_participacao INTEGER, eleitorado_apto BIGINT, abstencoes BIGINT, taxa_abstencao DOUBLE);
            CREATE TABLE Despesa_Candidatura(id_despesa VARCHAR, id_candidatura VARCHAR, categoria VARCHAR, valor DOUBLE);
            CREATE TABLE Cargo(id_cargo VARCHAR, nome VARCHAR, id_candidatura VARCHAR);
            CREATE TABLE Patrimonio_Candidato(ano INTEGER, cd_eleicao VARCHAR, uf VARCHAR, sq_candidato VARCHAR, numero_candidato INTEGER, nome_candidato VARCHAR, tipo_bem VARCHAR, descricao_bem VARCHAR, valor_bem DOUBLE);

            INSERT INTO Municipio VALUES ('1', 'Cidade A', 'CE'), ('2', 'Cidade B', 'CE');
            INSERT INTO Partido VALUES ('p_a', 'PARTIDO_A'), ('p_b', 'PARTIDO_B');
            INSERT INTO Eleicao VALUES ('e20', 2020, 'Vereador', 1, 'ORDINÁRIA', '2020-11-15'), ('e24', 2024, 'Vereador', 1, 'ORDINÁRIA', '2024-10-06');
            INSERT INTO Candidato VALUES ('cand_1', '2000-01-01'), ('cand_2', '1985-05-10');
            INSERT INTO Candidatura VALUES 
                ('c1', 'cand_1', 'e20', '1', 'p_a', 'CE', 'SUPERIOR COMPLETO', 50000.0, 12000.0),
                ('c2', 'cand_2', 'e20', '1', 'p_b', 'CE', 'ENSINO MÉDIO COMPLETO', 200000.0, 30000.0),
                ('c3', 'cand_1', 'e24', '1', 'p_b', 'CE', 'SUPERIOR COMPLETO', 80000.0, 15000.0);
            INSERT INTO Resultado_Candidatura VALUES 
                ('r1', 'c1', 1, 'ELEITO', 1200),
                ('r2', 'c2', 1, 'NÃO ELEITO', 800),
                ('r3', 'c3', 1, 'ELEITO', 1500);
            INSERT INTO Votos_Partido_Municipio VALUES 
                ('e20', '1', 'p_a', 1, 1200, 100),
                ('e20', '1', 'p_b', 1, 800, 50),
                ('e24', '1', 'p_b', 1, 1500, 150);
            INSERT INTO Censo_Municipio VALUES ('1', 2022, 25000, 0.72, 500000000.0);
            INSERT INTO Participacao_Eleitoral VALUES ('1', 2024, 20000, 3000, 0.15);
            INSERT INTO Despesa_Candidatura VALUES ('d1', 'c1', 'SANTINHOS', 5000.0), ('d2', 'c2', 'ADESIVOS', 8000.0);
        ''')

        def fake_rows(sql, params=()):
            clean_sql = sql.replace('pipeline_bdr_der_completo_v4.main.', '').replace('strip_accents', '')
            cur = self.con.execute(clean_sql, list(params))
            cols = [c[0] for c in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

        self.mock_runner = patch.object(ind, '_get_runner', return_value=(fake_rows, 'pipeline_bdr_der_completo_v4'))
        self.mock_runner.start()

    def tearDown(self):
        self.mock_runner.stop()
        self.con.close()

    def test_diagnostico_base(self):
        diag = ind.diagnostico_base()
        self.assertEqual(diag['status'], 'conectado')
        self.assertFalse(diag['receitas_eleitorais']['disponiveis'])
        self.assertEqual(diag['tabelas_principais']['Municipio'], 2)
        self.assertEqual(diag['tabelas_principais']['Candidatura'], 3)

    def test_indicador_resultado(self):
        res = ind.indicador_resultado(2020, 'VEREADOR', 'CE')
        resumo = res['resumo']
        self.assertEqual(resumo['total_candidaturas'], 2)
        self.assertEqual(resumo['eleitos'], 1)
        self.assertEqual(resumo['nao_eleitos'], 1)
        self.assertEqual(resumo['taxa_eleicao_pct'], 50.0)

    def test_indicador_gastos(self):
        g = ind.indicador_gastos(2020, 'VEREADOR', 'CE')
        resumo = g['resumo']
        self.assertEqual(resumo['candidaturas_analisadas'], 2)
        self.assertEqual(resumo['gasto_total_declarado'], 42000.0)
        self.assertEqual(resumo['gasto_agregado_por_cadeira'], 42000.0)
        self.assertEqual(resumo['mediana_eleitos'], 12000.0)
        self.assertEqual(resumo['mediana_nao_eleitos'], 30000.0)

    def test_indicador_patrimonio(self):
        p = ind.indicador_patrimonio(2020, 'VEREADOR', 'CE')
        cob = p['cobertura']
        self.assertEqual(cob['total'], 2)
        self.assertEqual(cob['validos'], 2)
        self.assertEqual(cob['mediana_eleitos'], 50000.0)
        self.assertEqual(cob['mediana_nao_eleitos'], 200000.0)

    def test_indicador_receitas_declarado_indisponivel(self):
        rec = ind.indicador_receitas()
        self.assertEqual(rec['status'], 'indisponivel')
        self.assertFalse(rec['disponivel'])
        self.assertIn('Despesa_Candidatura', rec['mensagem'])


if __name__ == '__main__':
    unittest.main()

