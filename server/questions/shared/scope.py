from core.config import DB,DATA_DIR
from catalogo import BASE,filters,where
PROPORTIONAL=('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL')
SCHOOLS=[('ANALFABETO', 'Analfabeto'), ('LEEESCREVE', 'Lê e escreve'), ('FUNDAMENTALINCOMPLETO', 'Fundamental incompleto'), ('FUNDAMENTALCOMPLETO', 'Fundamental completo'), ('MEDIOINCOMPLETO', 'Médio incompleto'), ('MEDIOCOMPLETO', 'Médio completo'), ('SUPERIORINCOMPLETO', 'Superior incompleto'), ('SUPERIORCOMPLETO', 'Superior completo')]

def scope_filter(ano, cargo, uf, partido, municipio):
    return filters(q='', ano=ano, cargo=cargo, uf=uf, partido=partido, municipio=municipio, idade_min=None, idade_max=None, gasto_min=None, gasto_max=None, patrimonio_min=None, patrimonio_max=None)

def candidate_scope(f):
    (condition, params) = where(f)
    return (BASE + ', scoped AS (SELECT * FROM b WHERE ' + condition + ') ', params)
