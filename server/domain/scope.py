from fastapi import HTTPException
from core.config import UFS
def validate_year(value):
    if value is not None and value not in range(2002,2025,2):raise HTTPException(400,'Ano não permitido')
    return value
def validate_uf(value):
    if value and value.upper() not in UFS:raise HTTPException(400,'UF fora da cobertura desta base')
    return value.upper() if value else None
