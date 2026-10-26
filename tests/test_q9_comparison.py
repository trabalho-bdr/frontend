"""Selected-election Q9 queries against local DuckDB fixtures; no remote writes."""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import duckdb
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from questions.q09_publicidade import evolution as e
from bdr_paineis import main as routes


class ComparisonTests(unittest.TestCase):
    def setUp(self):
        self.con = duckdb.connect()
        self.addCleanup(self.con.close)
        self.queries = []
        self.con.execute("""
          CREATE TABLE Candidatura(id_candidatura VARCHAR,id_candidato VARCHAR,uf VARCHAR,
            id_municipio VARCHAR,id_eleicao VARCHAR,id_partido VARCHAR,nome_urna VARCHAR);
          CREATE TABLE Eleicao(id_eleicao VARCHAR,ano INTEGER,cargo VARCHAR,turno INTEGER,tipo_eleicao VARCHAR);
          CREATE TABLE Partido(id_partido VARCHAR,sigla VARCHAR,nome VARCHAR);
          CREATE TABLE Candidato(id_candidato VARCHAR,nome_civil VARCHAR);
          CREATE TABLE Resultado_Candidatura(id_candidatura VARCHAR,turno INTEGER,resultado VARCHAR,votos INTEGER);
          CREATE TABLE Despesa_Candidatura(id_despesa VARCHAR,id_candidatura VARCHAR,categoria VARCHAR,valor DOUBLE);
          INSERT INTO Eleicao VALUES ('20',2020,'VEREADOR',1,'ORDINÁRIA'),('24',2024,'VEREADOR',1,'ORDINÁRIA'),
            ('m20a',2020,'PREFEITO',1,'ORDINÁRIA'),('m20b',2020,'PREFEITO',2,'ORDINÁRIA'),('m24',2024,'PREFEITO',1,'ORDINÁRIA');
          INSERT INTO Partido VALUES ('a','PA','Partido A'),('b','PB','Partido B');
          INSERT INTO Candidato VALUES ('p1','Ana'),('p2','Bia'),('p3','Caio'),('p4','Dani'),('p5','Eva'),('p6','Fábio'),('p7','Gabi');
          INSERT INTO Candidatura VALUES
            ('a20','p1','CE','1','20','a','Ana'),('a24','p1','CE','1','24','b','Ana'),
            ('b20','p2','CE','1','20','a','Bia'),('b24','p2','CE','1','24','a','Bia'),
            ('c24','p3','CE','1','24','a','Caio'),('d24','p4','CE','1','24','a','Dani'),
            ('e20','p5','CE','1','20','a','Eva'),
            ('f20','p6','CE','1','20','a','Fábio'),('f24','p6','CE','2','24','a','Fábio'),
            ('g20a','p7','CE','1','m20a','a','Gabi'),('g20b','p7','CE','1','m20b','a','Gabi'),('g24','p7','CE','1','m24','a','Gabi');
          INSERT INTO Resultado_Candidatura VALUES
            ('a20',1,'ELEITO',100),('a20',1,'ELEITO',100),('a24',1,'ELEITO POR QP',120),
            ('b20',1,'SUPLENTE',40),('b24',1,'NÃO ELEITO',30),('c24',1,NULL,NULL),('d24',1,'ELEITO',50),
            ('g20a',1,'2º TURNO',200),('g20b',2,'ELEITO',300),('g20b',2,'ELEITO',300),('g24',1,'NÃO ELEITO',100);
          INSERT INTO Despesa_Candidatura VALUES
            ('1','a20','ADESIVOS',100),('2','a20','SANTINHOS',50),('3','a20','SERVIÇOS',50),
            ('4','a24','ADESIVOS',80),('5','a24','INTERNET',120),('6','a24','SERVIÇOS',100),
            ('7','b20','SERVIÇOS',100),('8','b24','INTERNET',0.01),('9','b24','SERVIÇOS',99.99),
            ('10','c24','ADESIVOS',NULL),('11','e20','ADESIVOS',10),
            ('12','g20a','ADESIVOS',20),('13','g20b','INTERNET',30),('14','g24','ADESIVOS',40);
        """)
        self.refs = {
            name.lower(): name
            for name in (
                "Candidatura",
                "Eleicao",
                "Partido",
                "Candidato",
                "Resultado_Candidatura",
                "Despesa_Candidatura",
            )
        }

        def normalise(_, refs, categories):
            mapping = {
                "ADESIVOS": ("Adesivos", "Impressos", True),
                "SANTINHOS": ("Santinhos", "Impressos", True),
                "INTERNET": ("Internet", "Digital", True),
                "SERVIÇOS": ("Serviços", "Outros", False),
            }
            return [categories] + [[mapping[c][i] for c in categories] for i in range(3)] + [
                ["ALIAS_EXPLICITO"] * len(categories),
                [False] * len(categories),
            ], "fixture"

        self.patches = [
            patch.object(e.q9, "_fontes", return_value=self.refs),
            patch.object(e.q9, "_normalizacao", side_effect=normalise),
        ]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

    def query(self, sql, params=()):
        self.queries.append((sql, params))
        cur = self.con.execute(sql, list(params))
        return [dict(zip([c[0] for c in cur.description], row)) for row in cur.fetchall()]

    def compare(self, **kwargs):
        values = dict(
            cargo="VEREADOR",
            uf="CE",
            id_candidato="p1",
            id_municipio="1",
            ano_antes=2020,
            ano_depois=2024,
        )
        values.update(kwargs)
        return e.resumo(self.query, **values)

    def test_candidate_party_switch_groups_and_expenses_are_preserved(self):
        result = self.compare()
        a, b = result["serie"]
        self.assertEqual([a["publicidade"], b["publicidade"]], [150, 200])
        self.assertEqual([a["total_campanha"], b["total_campanha"]], [200, 300])
        self.assertEqual([a["candidato"]["partido"], b["candidato"]["partido"]], ["PA", "PB"])
        self.assertEqual([a["candidato"]["votos"], b["candidato"]["votos"]], [100, 120])
        self.assertEqual(len(a["grupos"]), 1)
        self.assertEqual(a["grupos"][0]["valor"], 150)
        self.assertEqual(sum(g["valor"] for g in b["grupos"]), b["publicidade"])
        self.assertEqual(result["comparacao"]["desempenho"], "Eleito novamente")
        self.assertFalse(result["comparacao"]["reeleicao"]["disponivel"])
        self.assertEqual(len(self.queries), 4)

    def test_party_counts_known_outcomes_mean_denominator_and_small_share(self):
        result = self.compare(id_candidato=None, id_partido="a")
        a, b = result["serie"]
        self.assertEqual(b["candidaturas"], 3)
        self.assertEqual(b["resultado"], {"analisadas": 2, "eleitas": 1, "taxa": 50})
        self.assertEqual(b["com_despesas"], 1)
        self.assertEqual(b["gasto_medio"], 100)
        self.assertEqual(b["sem_resultado"], 1)
        self.assertEqual(a["publicidade"], 160)
        self.assertIsNone(next(g for g in b["grupos"] if g["grupo"] == "Impressos")["valor"])
        self.assertEqual(b["total_campanha"], 100)

    def test_missing_candidacy_is_not_a_defeat_or_zero(self):
        result = self.compare(id_candidato="p5")
        self.assertFalse(result["comparacao"]["comparavel"])
        self.assertFalse(result["serie"][1]["presente"])
        self.assertIsNone(result["serie"][1]["publicidade"])
        self.assertIsNone(result["comparacao"]["publicidade"]["absoluta"])
        self.assertIn("não representa derrota", result["comparacao"]["desempenho"])

    def test_zero_base_unknown_result_and_tiny_share(self):
        result = self.compare(id_candidato="p2")
        self.assertEqual(result["serie"][0]["publicidade"], 0)
        self.assertTrue(result["comparacao"]["publicidade"]["sem_base"])
        self.assertEqual(result["comparacao"]["publicidade"]["absoluta"], 0.01)
        self.assertIsNone(result["comparacao"]["publicidade"]["percentual"])
        self.con.execute("INSERT INTO Despesa_Candidatura VALUES ('tiny','a24','SANTINHOS',0.001)")
        self.con.execute(
            "UPDATE Resultado_Candidatura SET resultado=NULL WHERE id_candidatura='a24'"
        )
        result = self.compare()
        self.assertEqual(result["serie"][1]["sem_resultado"], 1)
        self.assertIn("desconhecido", result["comparacao"]["desempenho"])

    def test_negative_adjustments_and_unknown_values_remain_visible(self):
        self.con.execute("INSERT INTO Despesa_Candidatura VALUES ('neg','a24','ADESIVOS',-100)")
        result = self.compare()
        b = result["serie"][1]
        self.assertEqual(b["publicidade"], 100)
        self.assertEqual(b["total_campanha"], 200)
        self.assertFalse(b["composicao_valida"])
        self.assertEqual(next(g["valor"] for g in b["grupos"] if g["grupo"] == "Impressos"), -20)
        self.assertEqual(b["cobertura"]["ajustes_negativos"], 1)
        unknown = self.compare(id_candidato="p3")["serie"][1]
        self.assertIsNone(unknown["publicidade"])
        self.assertIsNone(unknown["total_campanha"])

    def test_final_round_results_do_not_multiply_expenses(self):
        result = self.compare(cargo="PREFEITO", id_candidato="p7")
        a = result["serie"][0]
        self.assertEqual(a["candidaturas"], 1)
        self.assertEqual(a["publicidade"], 50)
        self.assertEqual(a["candidato"]["id_candidatura"], "g20b")
        self.assertEqual(a["candidato"]["votos"], 300)
        self.assertEqual(a["candidato"]["resultado"], "ELEITO")

    def test_territory_years_and_parameters_are_enforced(self):
        self.assertFalse(self.compare(id_candidato="p6")["comparacao"]["comparavel"])
        for values in [
            dict(ano_depois=2020),
            dict(ano_antes=2018),
            dict(id_municipio=None),
            dict(cargo="DEPUTADO FEDERAL", id_municipio="1"),
        ]:
            with self.assertRaises(HTTPException):
                self.compare(**values)
        for sql, args in self.queries:
            self.assertEqual(sql.count("?"), len(args))

    def test_parties_and_years_are_limited_to_territory(self):
        response = e.partidos(self.query, "VEREADOR", "CE", "1")
        self.assertEqual(response["anos"], [2020, 2024])
        self.assertEqual([p["sigla"] for p in response["partidos"]], ["PA", "PB"])

    def test_route_cache_keys_include_both_years_and_municipality(self):
        routes._evolucao_q9_cache.cache_clear()
        self.addCleanup(routes._evolucao_q9_cache.cache_clear)
        with patch.object(routes.q9_evolucao, "resumo", return_value={}) as service:
            for args in [
                (2020, 2024, "1"),
                (2020, 2024, "2"),
                (2018, 2022, "1"),
                (2020, 2024, "1"),
            ]:
                routes._evolucao_q9_cache(
                    "fixture", "VEREADOR", "CE", "a", None, "sugeridas", 1, *args
                )
            self.assertEqual(service.call_count, 3)


if __name__ == "__main__":
    unittest.main()
