"""Regressões de inicialização; não usam rede ou credenciais reais."""
import os
import sys
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
import app

SHARE = 'md:_share/test_database/00000000-0000-0000-0000-000000000001'


class MotherDuckConnectionTests(unittest.TestCase):
    def setUp(self):
        self.cache = patch.object(app, '_con', None)
        self.cache.start()
        self.env = patch.dict(os.environ, {'MOTHERDUCK_TOKEN': 'test-token', 'MOTHERDUCK_SHARE_URL': SHARE})
        self.env.start()
        self.con = Mock()
        self.con.execute.return_value.fetchall.return_value = []
        self.connection = patch('duckdb.connect', return_value=self.con)
        self.connect = self.connection.start()
        self.addCleanup(self.cache.stop)
        self.addCleanup(self.env.stop)
        self.addCleanup(self.connection.stop)

    def test_auto_attached_share_does_not_repeat_attach(self):
        for path in [SHARE, SHARE.removeprefix('md:')]:
            with self.subTest(path=path):
                app._con = None
                self.con.reset_mock()
                self.con.execute.return_value.fetchall.return_value = [(1, 'v4', path)]
                self.assertIs(app._open(), self.con)
                self.con.execute.assert_called_once_with('PRAGMA database_list')

    def test_parallel_requests_create_one_connection_and_attach_once(self):
        with ThreadPoolExecutor(max_workers=4) as pool:
            connections = list(pool.map(lambda _: app._open(), range(8)))
        self.assertTrue(all(con is self.con for con in connections))
        self.connect.assert_called_once_with('md:')
        attaches = [call for call in self.con.execute.call_args_list if call.args[0].startswith('ATTACH ')]
        self.assertEqual(len(attaches), 1)
        self.assertIn('(READ_ONLY)', attaches[0].args[0])

    def test_wrong_database_under_v4_is_not_reused(self):
        self.con.execute.return_value.fetchall.return_value = [(1, 'v4', '_share/other/other-id')]
        with self.assertRaisesRegex(RuntimeError, 'outro banco'):
            app._open()
        self.con.close.assert_called_once()
        self.assertIsNone(app._con)

    def test_failed_attachment_closes_connection_and_allows_retry(self):
        self.con.execute.side_effect = [Mock(fetchall=lambda: []), RuntimeError('attach failed')]
        with self.assertRaisesRegex(RuntimeError, 'attach failed'):
            app._open()
        self.con.close.assert_called_once()
        self.assertIsNone(app._con)
        self.con.execute.side_effect = None
        self.assertIs(app._open(), self.con)
        self.assertEqual(self.connect.call_count, 2)

    def test_invalid_share_is_rejected_before_connecting(self):
        with patch.dict(os.environ, {'MOTHERDUCK_SHARE_URL': "md:_share/invalid'; DROP DATABASE v4;"}):
            with self.assertRaisesRegex(RuntimeError, 'inválida'):
                app._open()
        self.connect.assert_not_called()
