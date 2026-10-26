"""Structural contracts of the incremental question migration."""
import unittest
from pathlib import Path
from questions.registry import MODULES, module
from questions.shared.context import ResearchContext

class QuestionModules(unittest.TestCase):
    def test_all_ten_questions_have_owned_services_and_sql(self):
        self.assertEqual(set(MODULES), set(range(1, 11)))
        root = Path(__file__).resolve().parents[1] / 'server/questions'
        for number, name in MODULES.items():
            with self.subTest(question=number):
                folder = root / name
                self.assertTrue((folder / 'README.md').is_file())
                self.assertTrue((folder / 'sql').is_dir())
                service = module(number)
                if number == 9:
                    self.assertTrue(callable(service.repository.resumo))
                else:
                    self.assertTrue(callable(service.calculate))

    def test_context_keeps_data_access_injectable(self):
        calls = []
        context = ResearchContext(lambda sql, params=(): calls.append((sql, params)) or [])
        self.assertEqual(context.query('SELECT ?', [0]), [])
        self.assertEqual(calls, [('SELECT ?', [0])])
