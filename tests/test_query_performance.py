"""Regression checks for caching concurrency and equivalent SQL reductions."""

import sys
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from core import database
import test_catalog
import test_exhibition
import catalogo
import exhibition


class QueryCacheTests(unittest.TestCase):
    def setUp(self):
        self.connection = Mock()
        self.connection.execute.return_value.description = [("value",)]
        self.connection.execute.return_value.fetchall.return_value = [(1,)]
        self.patcher = patch.object(database, "_con", self.connection)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        database._query_cache.clear()
        self.addCleanup(database._query_cache.clear)

    def test_concurrent_misses_execute_once_and_return_independent_results(self):
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: database._rows("SELECT 1"), range(8)))
        self.connection.execute.assert_called_once()
        results[0][0]["value"] = 9
        self.assertEqual(database._rows("SELECT 1"), [{"value": 1}])

    def test_valid_cache_hit_does_not_wait_for_database_lock(self):
        database._rows("SELECT 1")
        locked = threading.Event()
        release = threading.Event()

        def block_connection():
            with database._lock:
                locked.set()
                release.wait(5)

        with ThreadPoolExecutor(max_workers=2) as pool:
            blocking = pool.submit(block_connection)
            self.assertTrue(locked.wait(2))
            try:
                self.assertEqual(
                    pool.submit(database._rows, "SELECT 1").result(timeout=1), [{"value": 1}]
                )
            finally:
                release.set()
            blocking.result()

    def test_cache_expires_after_fifteen_minutes_and_empty_results_are_cached(self):
        self.connection.execute.return_value.fetchall.return_value = []
        now = time.monotonic()
        with patch.object(database.time, "monotonic", return_value=now):
            self.assertEqual(database._rows("SELECT 1"), [])
        with patch.object(database.time, "monotonic", return_value=now + 899):
            database._rows("SELECT 1")
        self.assertEqual(self.connection.execute.call_count, 1)
        with patch.object(database.time, "monotonic", return_value=now + 901):
            database._rows("SELECT 1")
        self.assertEqual(self.connection.execute.call_count, 2)


class OptionsEquivalenceTests(unittest.TestCase):
    setUp = test_catalog.CatalogTests.setUp

    def test_lightweight_options_preserve_original_payloads(self):
        for args in [
            (None, "", ""),
            (2024, "CE", "VEREADOR"),
            (2024, "RJ", "PREFEITO"),
            (2002, "", "DEPUTADO ESTADUAL"),
        ]:
            actual = catalogo.options(*args)
            with patch.object(catalogo, "OPTIONS_BASE", catalogo.BASE):
                expected = catalogo.options(*args)
            self.assertEqual(actual, expected)


class ProportionalEquivalenceTests(unittest.TestCase):
    setUp = test_exhibition.ExhibitionQueries.setUp
    tearDown = test_exhibition.ExhibitionQueries.tearDown

    def test_extremes_match_all_pairs_including_ties_and_statewide_contests(self):
        import random

        self.con.execute("ALTER TABLE Candidatura ADD COLUMN nome_urna VARCHAR DEFAULT 'Nome'")
        self.con.execute("ALTER TABLE Candidatura ADD COLUMN numero_urna INTEGER DEFAULT 1")
        self.con.execute(
            "INSERT INTO Eleicao VALUES ('dep',2022,'DEPUTADO FEDERAL',1,'ORDINÁRIA','2022-10-02')"
        )
        generator = random.Random(42)
        for i in range(150):
            election = "24" if i < 100 else "dep"
            self.con.execute(
                "INSERT INTO Candidatura VALUES (?,?,?,?,?,?,?,?,?)",
                [str(i), str(i), election, str(i % 3), "a", "CE", 0, "Nome", 1],
            )
            self.con.execute(
                "INSERT INTO Resultado_Candidatura VALUES (?,?,?,?,?)",
                [
                    str(i),
                    str(i),
                    1,
                    generator.choice(
                        ["ELEITO", "ELEITO POR QP", "NÃO ELEITO", "NAO ELEITO", "SUPLENTE", None]
                    ),
                    generator.choice([None, 0, 10, 10, 20, 100]),
                ],
            )
        optimized = exhibition.query_sql(
            "compatibility/sql/exhibition/exhibition_proportional_01.sql"
        )
        base = optimized[: optimized.index("), ranked AS")]
        brute = (
            base
            + """), pairs AS (
            SELECT a.id maior,b.id menor FROM base a JOIN base b
            ON a.id_eleicao=b.id_eleicao AND a.uf=b.uf
            AND (a.cargo<>'VEREADOR' OR a.id_municipio=b.id_municipio)
            WHERE UPPER(a.resultado) IN ('NÃO ELEITO','NAO ELEITO','SUPLENTE')
            AND UPPER(b.resultado) LIKE 'ELEITO%' AND a.votos>b.votos
            ORDER BY a.votos-b.votos DESC,a.id,b.id LIMIT 1)
            SELECT base.* FROM base JOIN pairs ON base.id IN (pairs.maior,pairs.menor) ORDER BY votos DESC"""
        )
        for year, office, town in [
            (2024, "VEREADOR", ""),
            (2024, "VEREADOR", "1"),
            (2022, "DEPUTADO FEDERAL", ""),
        ]:
            params = [year, office, "", "", town, town]
            self.assertEqual(exhibition.read(optimized, params), exhibition.read(brute, params))


if __name__ == "__main__":
    unittest.main()
