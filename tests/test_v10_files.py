"""Conferência de instalação do módulo de comparação no projeto."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class IntegrationTests(unittest.TestCase):
 def test_backend_mounts_comparison_router(self):
  import sys
  sys.path.insert(0,str(ROOT/'server'))
  import app
  paths={route.path for r in app.app.routes for route in (r.original_router.routes if hasattr(r, 'original_router') else [r])}
  for kind in ['legenda','abstencao','cadeiras','escolaridade','propaganda','patrimonio']:
   self.assertIn('/api/comparacoes/'+kind,paths)
 def test_pages_reuse_panel_without_new_menu(self):
  cases={
    'src/pages/Atlas.jsx':['topic="atlas"'],
    'src/pages/PrestacaoDeContas.jsx':['topic="campanhas"'],
    'src/pages/Adesivaria.jsx':['topic="adesivos"'],
    'src/pages/MuralCampanhas.jsx':['topic="partidos"']
  }
  for f,markers in cases.items():
   txt=(ROOT/f).read_text(encoding='utf-8')
   for marker in markers:self.assertIn(marker,txt)
if __name__=='__main__':unittest.main()
