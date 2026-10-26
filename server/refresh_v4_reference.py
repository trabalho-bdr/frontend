"""Rebuild offline references from the configured v4 share using read-only SQL."""

import ast
import json
import re
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / "server/.env")
import app
import exhibition as e
import questao2 as q2
import questao1 as q1


def main():
    con = app._open()
    database = con.execute("SELECT current_database()").fetchone()[0]
    if database != app.DB:
        raise RuntimeError("A conexão não corresponde ao compartilhamento v4")
    data = {
        name: fn()
        for name, fn in {
            "partidos": e.parties,
            "territorio": e.territory,
            "transicoes": e.transitions,
            "continuidade": e.continuity,
            "gastos": e.spending,
            "escolaridade": e.schooling,
            "patrimonio": e.wealth,
            "proporcional": e.proportional,
        }.items()
    }
    stamp = datetime.now(timezone.utc).isoformat()
    for result in data.values():
        result.update(
            source="snapshot", database="pipeline_bdr_der_completo_v4", extracted_at=stamp
        )
    maps = {"": q2.municipios_q2(2024, "VEREADOR", None)}
    summaries = {"": q2.patrimonio_q2(2024, "VEREADOR", None, None)}
    for uf in e.UFS:
        maps[uf] = q2.municipios_q2(2024, "VEREADOR", uf)
        summaries[uf] = q2.patrimonio_q2(2024, "VEREADOR", uf, None)
    reference = {
        "database": "pipeline_bdr_der_completo_v4",
        "extracted_at": stamp,
        "overview": app.overview(),
        "wealthMaps": maps,
        "wealthSummaries": summaries,
        "wealthOptions": q2.opcoes_q2(),
        "q1Overview": q1.get_overview(2024, "VEREADOR", "", ""),
        "legenda": app.analysis(5),
    }
    original = (ROOT / "src/data/candidatos-amostra.js").read_text(encoding="utf-8-sig")
    ids = re.findall(r'"id"\s*:\s*"([^"]+)"', original)
    if not ids:
        raise RuntimeError("Amostra sem identificadores verificáveis")
    placeholders = ",".join("?" for _ in ids)
    candidates = app._rows(
        f"""SELECT c.id_candidatura id,c.nome_urna nome,c.numero_urna numero,p.sigla partido,
      c.uf,m.nome municipio,UPPER(e.cargo) cargo,e.ano,r.resultado,r.votos,c.gastos_campanha_total gastos,c.patrimonio
      FROM pipeline_bdr_der_completo_v4.main.Candidatura c JOIN pipeline_bdr_der_completo_v4.main.Eleicao e USING(id_eleicao)
      LEFT JOIN pipeline_bdr_der_completo_v4.main.Partido p USING(id_partido) LEFT JOIN pipeline_bdr_der_completo_v4.main.Municipio m USING(id_municipio)
      LEFT JOIN pipeline_bdr_der_completo_v4.main.Resultado_Candidatura r ON r.id_candidatura=c.id_candidatura AND r.turno=1
      WHERE c.id_candidatura IN ({placeholders}) AND e.ano=2024 AND UPPER(e.cargo)='VEREADOR' AND e.turno=1
      QUALIFY ROW_NUMBER() OVER(PARTITION BY c.id_candidatura ORDER BY r.id_resultado)=1""",
        ids,
    )
    expenses = {
        r["id"]: app._rows(
            "SELECT id_despesa id,categoria,valor FROM pipeline_bdr_der_completo_v4.main.Despesa_Candidatura WHERE id_candidatura=? ORDER BY valor DESC NULLS LAST,id_despesa LIMIT 12",
            [r["id"]],
        )
        for r in candidates
    }
    town_source = (ROOT / "src/data/municipios-amostra.js").read_text(encoding="utf-8")
    town_ids = set(re.findall(r"\['(\d{7})'", town_source))
    if not town_ids:
        town_ids = set(re.findall(r'"id"\s*:\s*"(\d{7})"', town_source))
    towns = [
        {
            "id": r["id"],
            "nome": r["nome"],
            "uf": r["uf"],
            "populacao": r["populacao"],
            "idhm": r["idhm"],
            "pib_per_capita": r["pib_per_capita"],
            "abstencao_2024": r["abstencao"],
        }
        for r in data["territorio"]["rows"]
        if r["id"] in town_ids
    ]
    discovery = app.descobertas(2024, "VEREADOR", None)

    # Extract everything before writing; do not leave partially refreshed files on query failure.
    def encode(value):
        return json.dumps(value, ensure_ascii=False, allow_nan=False, indent=2)

    files = {
        "src/data/exhibitionSnapshot.json": encode(data),
        "src/data/v4Reference.json": encode(reference),
        "src/data/exhibitionFacts.js": "export default "
        + encode({"school": data["escolaridade"], "medians": data["gastos"]["summary"]})
        + ";\n",
        "src/data/candidatos-amostra.js": f"// Amostra real reconsultada na v4 em {stamp}; não é ranking completo.\nexport const sampleCandidates = "
        + encode(candidates)
        + ";\n",
        "src/data/despesas-amostra.js": f"// Lançamentos parciais reais da v4, extração {stamp}.\nexport const sampleExpenses = "
        + encode(expenses)
        + ";\n",
        "src/data/municipios-amostra.js": f"// Municípios reconsultados na v4 em {stamp}; IDHM de 2010.\nexport const municipiosAmostra = "
        + encode(towns)
        + ";\n",
    }
    for name, text in files.items():
        (ROOT / name).write_text(text, encoding="utf-8")
    (ROOT / "src/data/v4Discoveries.json").write_text(encode(discovery), encoding="utf-8")
    print(
        json.dumps(
            {
                "database": reference["database"],
                "rows": {name: len(result["rows"]) for name, result in data.items()},
                "sample_candidates": len(candidates),
                "sample_towns": len(towns),
                "extracted_at": stamp,
            }
        )
    )


if __name__ == "__main__":
    main()
