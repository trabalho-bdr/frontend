import unittest
import sys
from dotenv import load_dotenv

load_dotenv('server/.env')
sys.path.insert(0, 'server')


class TestQuestao2API(unittest.TestCase):
    def test_questao2_module_import(self):
        import questao2
        self.assertTrue(hasattr(questao2, 'opcoes_q2'))
        self.assertTrue(hasattr(questao2, 'municipios_q2'))
        self.assertTrue(hasattr(questao2, 'patrimonio_q2'))

    def test_questao2_validation(self):
        import questao2
        from fastapi import HTTPException
        with self.assertRaises(HTTPException):
            questao2._validar(1990, 'VEREADOR', None, None)
        with self.assertRaises(HTTPException):
            questao2._validar(2024, 'CARGO_INVALIDO', None, None)
        with self.assertRaises(HTTPException):
            questao2._validar(2024, 'VEREADOR', 'XX', None)

    def test_questao2_presidencia_recorte(self):
        import questao2
        # Presidente deve ser suportado em 2018 e 2022
        res2022 = questao2.patrimonio_q2(2022, 'PRESIDENTE', None, None)
        self.assertIn('resumo_situacao', res2022)
        self.assertEqual(res2022['cargo'], 'PRESIDENTE')
        self.assertEqual(res2022['ano'], 2022)
        self.assertEqual(res2022['cobertura']['total'], 11)


if __name__ == '__main__':
    unittest.main()
