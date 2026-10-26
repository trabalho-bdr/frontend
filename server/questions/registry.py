"""Dispatch by the stable research-question identifier."""
from importlib import import_module

MODULES={1: 'q01_custo_cadeira', 2: 'q02_patrimonio_sucesso', 3: 'q03_territorio_voto_abstencao', 4: 'q04_escolaridade', 5: 'q05_votos_legenda', 6: 'q06_eleitorado_jovem', 7: 'q07_mudancas_partidarias', 8: 'q08_financiamento', 9: 'q09_publicidade', 10: 'q10_trajetorias'}

def module(number):
    return import_module('questions.'+MODULES[number]+'.service')
def calculate(number,f,context,**settings):
    service=module(number)
    arguments={3:('metric','target'),4:('universe',),5:('historico',),6:('youth',)}.get(number,())
    return service.calculate(f,context,**{key:settings[key] for key in arguments})
def municipalities(number,f,context):
    return module(number).municipalities(f,context)
