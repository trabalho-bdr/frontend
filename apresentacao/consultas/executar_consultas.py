#!/usr/bin/env python3
"""Script de auditoria e reprodução das evidências da apresentação.
Executa consultas somente de leitura via HTTP contra a API local (http://127.0.0.1:8000).
Não necessita de credenciais embutidas.
"""

import json
import urllib.request
import urllib.error
import sys

API_BASE = "http://127.0.0.1:8000"

ENDPOINTS = [
    ("Q01 - Custo por Cadeira (Vereador Geral)", f"{API_BASE}/api/pesquisa/1?ano=2024&cargo=VEREADOR"),
    ("Q01 - Custo por Cadeira (São Luís/MA)", f"{API_BASE}/api/pesquisa/1?ano=2024&cargo=VEREADOR&uf=MA&municipio=2111300"),
    ("Q01 - Custo por Cadeira (Deputado Federal)", f"{API_BASE}/api/pesquisa/1?ano=2022&cargo=DEPUTADO+FEDERAL"),
    ("Q02 - Patrimônio e Sucesso (Decis e Zero)", f"{API_BASE}/api/pesquisa/2?ano=2024&cargo=VEREADOR"),
    ("Q03 - Território: IDHM vs Abstenção", f"{API_BASE}/api/pesquisa/3?ano=2024&cargo=VEREADOR&metric=idhm&target=abstencao"),
    ("Q03 - Território: População vs Abstenção", f"{API_BASE}/api/pesquisa/3?ano=2024&cargo=VEREADOR&metric=populacao&target=abstencao"),
    ("Q04 - Escolaridade: Candidatos vs Eleitores 18+", f"{API_BASE}/api/pesquisa/4?ano=2024&cargo=VEREADOR"),
    ("Q05 - Votos de Legenda (Vereador Geral)", f"{API_BASE}/api/pesquisa/5?ano=2024&cargo=VEREADOR"),
    ("Q05 - Votos de Legenda (PT)", f"{API_BASE}/api/pesquisa/5?ano=2024&cargo=VEREADOR&partido=PT"),
    ("Q05 - Votos de Legenda (PL)", f"{API_BASE}/api/pesquisa/5?ano=2024&cargo=VEREADOR&partido=PL"),
    ("Q06 - Eleitorado Jovem (Faixa 16-24)", f"{API_BASE}/api/pesquisa/6?ano=2024&cargo=VEREADOR&youth=16_24"),
    ("Q07 - Mudanças Partidárias (2020 a 2024)", f"{API_BASE}/api/pesquisa/7?ano=2024&cargo=VEREADOR"),
    ("Q08 - Financiamento e Fundos Públicos", f"{API_BASE}/api/pesquisa/8?ano=2024&cargo=VEREADOR"),
    ("Q09 - Publicidade Eleitoral (Categorias)", f"{API_BASE}/api/bdr/q9/despesas?ano=2024&cargo=VEREADOR&criterio=sugeridas"),
    ("Q10 - Trajetórias Eleitorais (Carreiras)", f"{API_BASE}/api/pesquisa/10?ano=2024&cargo=VEREADOR"),
]

def main():
    print("=" * 70)
    print("ARQUIVO DA DEMOCRACIA — VERIFICAÇÃO DE CONSULTAS DA APRESENTAÇÃO")
    print("=" * 70)
    
    success_count = 0
    for name, url in ENDPOINTS:
        sys.stdout.write(f"Consultando {name}... ")
        sys.stdout.flush()
        try:
            req = urllib.request.urlopen(url, timeout=30)
            data = json.loads(req.read().decode("utf-8"))
            status = data.get("status", "ok")
            rows_count = len(data.get("rows", [])) if "rows" in data else len(data.get("grupos", []))
            print(f"[OK] (status: {status}, registros/grupos: {rows_count})")
            success_count += 1
        except urllib.error.URLError as e:
            print(f"[ERRO DE CONEXÃO: {e}]")
        except Exception as e:
            print(f"[FALHA: {e}]")
            
    print("=" * 70)
    print(f"Total executado: {len(ENDPOINTS)} | Sucesso: {success_count} | Falhas: {len(ENDPOINTS) - success_count}")
    print("=" * 70)

if __name__ == "__main__":
    main()
