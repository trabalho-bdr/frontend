"""Carrega as consultas nomeadas do painel de apuração."""

import re
from functools import lru_cache
from pathlib import Path


ARQUIVOS_SQL = (
    Path(__file__).with_name("consultas_q3.sql"),
    Path(__file__).with_name("consultas_q10.sql"),
)
MARCADOR = re.compile(r"^-- name: ([a-z][a-z0-9_]*)\s*$", re.MULTILINE)


@lru_cache(maxsize=1)
def carregar_consultas() -> dict[str, str]:
    """Reúne os blocos dos arquivos Q3 e Q10 pelo marcador ``-- name:``."""
    consultas: dict[str, str] = {}
    for arquivo in ARQUIVOS_SQL:
        conteudo = arquivo.read_text(encoding="utf-8")
        marcadores = list(MARCADOR.finditer(conteudo))
        if not marcadores:
            raise ValueError(f"Nenhuma consulta encontrada em {arquivo}")
        for indice, marcador in enumerate(marcadores):
            inicio = marcador.end()
            fim = marcadores[indice + 1].start() if indice + 1 < len(marcadores) else len(conteudo)
            nome = marcador.group(1)
            if nome in consultas:
                raise ValueError(f"Consulta SQL duplicada: {nome}")
            sql = conteudo[inicio:fim].strip()
            if not sql:
                raise ValueError(f"Consulta SQL vazia: {nome}")
            consultas[nome] = sql
    if not consultas:
        raise ValueError("Nenhuma consulta de apuração foi carregada")
    return consultas


def consulta(nome: str) -> str:
    """Obtém uma consulta nomeada ou falha com uma mensagem explícita."""
    try:
        return carregar_consultas()[nome]
    except KeyError as erro:
        raise KeyError(f"Consulta SQL desconhecida: {nome}") from erro
