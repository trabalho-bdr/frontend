import statistics
from questions.shared.repository import party_votes


def calculate(f, context):
    read = context.query
    votes = party_votes(f, read)
    from party_events import canonical_party, transition_kind

    grouped = {}
    for r in votes:
        if r["nominais"] is None or r["legenda"] is None:
            continue
        key = (r["ano"], r["id_municipio"])
        g = grouped.setdefault(key, {"nome": r["nome"], "uf": r["uf"], "votes": {}})
        label = canonical_party(r["partido"], r["ano"])
        g["votes"][label] = g["votes"].get(label, 0) + r["nominais"] + r["legenda"]
    pairs = []
    previous = {}
    for (year, town), g in sorted(grouped.items()):
        total = sum(g["votes"].values())
        if total <= 0:
            continue
        maximum = max(g["votes"].values())
        leaders = [p for (p, v) in g["votes"].items() if v == maximum]
        shares = {p: 100 * v / total for (p, v) in g["votes"].items()}
        old = previous.get(town)
        if old and year - old["year"] == 4:
            changes = (
                sum(
                    (
                        abs(shares.get(p, 0) - old["shares"].get(p, 0))
                        for p in set(shares) | set(old["shares"])
                    )
                )
                / 2
            )
            kind = (
                transition_kind(old["leader"], leaders[0], year)
                if len(leaders) == 1 and old["leader"]
                else "Empate"
            )
            pairs.append(
                {
                    "id": str(town) + ":" + str(year),
                    "municipio_id": town,
                    "nome": g["nome"],
                    "uf": g["uf"],
                    "inicio": old["year"],
                    "ano": year,
                    "origem": old["leader"] or "Empate",
                    "destino": leaders[0] if len(leaders) == 1 else "Empate",
                    "evento": kind,
                    "valor": changes,
                    "concentracao": sum(((v / 100) ** 2 for v in shares.values())),
                }
            )
        previous[town] = {
            "year": year,
            "shares": shares,
            "leader": leaders[0] if len(leaders) == 1 else None,
        }
    selected = [r for r in pairs if r["ano"] == f["ano"]]
    counts = {
        label: sum((r["evento"] == label for r in selected))
        for label in (
            "Mesma organização",
            "Mudança entre organizações",
            "Fusão/incorporação",
            "Empate",
        )
    }
    return dict(
        rows=selected,
        series=[
            {
                "grupo": str(y),
                "valor": statistics.mean((r["valor"] for r in pairs if r["ano"] == y)),
                "municipios": sum((r["ano"] == y for r in pairs)),
            }
            for y in sorted({r["ano"] for r in pairs})
        ],
        summary=counts,
        unit="volatility",
        method="Volatilidade = metade da soma das variações absolutas das parcelas partidárias (p.p.), em pares separados por quatro anos. Renomeações harmonizadas; fusões/incorporações identificadas como eventos.",
        limitations=[
            "Mudanças associadas a fusão/incorporação não são migração individual nem prova de mudança de preferência.",
            "Orientação é distribuição partidária; não há classificação ideológica validada. Cores não representam esquerda ou direita.",
            "Volatilidade pode refletir eventos partidários e candidaturas. Empates recebem categoria própria. Séries usam pares completos, não eleições suplementares.",
        ],
    )
