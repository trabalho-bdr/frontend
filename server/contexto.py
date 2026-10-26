"""Small, live option lists for the shared investigation context."""
from fastapi import APIRouter,HTTPException
router=APIRouter(prefix='/api/contexto',tags=['contexto'])

@router.get('/opcoes')
def options(ano:int=2024,cargo:str='VEREADOR',uf:str=''):
    from core.dependencies import execute as _rows
    from core.config import DB
    from domain.scope import validate_uf as _uf, validate_year as _year
    _year(ano);_uf(uf)
    if cargo not in ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL'):
        raise HTTPException(422,'Selecione um cargo proporcional.')
    try:
        elections=_rows(f'''SELECT e.ano,UPPER(e.cargo) cargo,c.uf,COUNT(DISTINCT c.id_candidatura) candidaturas
          FROM {DB}.main.Candidatura c JOIN {DB}.main.Eleicao e USING(id_eleicao)
          WHERE e.ano IN (2018,2020,2022,2024) AND e.turno=1
          AND UPPER(e.cargo) IN ('VEREADOR','DEPUTADO ESTADUAL','DEPUTADO FEDERAL')
          AND e.tipo_eleicao NOT ILIKE '%SUPLEMENTAR%' AND c.uf IN ('CE','MA','MS','RJ','RN','RS')
          GROUP BY 1,2,3 ORDER BY 1,2,3''')
        parties=_rows(f'''SELECT DISTINCT p.sigla FROM {DB}.main.Partido p
          JOIN {DB}.main.Candidatura c USING(id_partido) JOIN {DB}.main.Eleicao e USING(id_eleicao)
          WHERE e.ano=? AND UPPER(e.cargo)=? AND (?='' OR c.uf=?) ORDER BY 1''',[ano,cargo,uf,uf])
        municipalities=_rows(f'''SELECT id_municipio id,nome,uf FROM {DB}.main.Municipio
          WHERE uf=? ORDER BY nome LIMIT 1500''',[uf]) if uf and cargo=='VEREADOR' else []
        return {'source':'live','database':'pipeline_bdr_der_completo_v4','eleicoes':elections,'partidos':parties,'municipios':municipalities}
    except Exception:
        raise HTTPException(503,'Opções do acervo indisponíveis. Tente novamente.')
