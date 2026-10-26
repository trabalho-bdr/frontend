"""Organizational events; never infer individual migration from a renamed sigla."""

from domain.normalization import PARTY_CONTRACT

RENAMES = PARTY_CONTRACT["renames"]
EVENTS = {key: tuple(value) for key, value in PARTY_CONTRACT["events"].items()}


def canonical_party(sigla, year):
    if sigla == "PL" and year < 2006:
        return "PL-HISTORICO"
    if sigla == "PR":
        return "PL"
    if sigla == "PSD" and year < 2011:
        return "PSD-HISTORICO"
    return RENAMES.get(sigla, sigla)


def transition_kind(origin, destination, year):
    if origin == destination:
        return "Mesma organização"
    seen = set()
    current = origin
    while current in EVENTS and current not in seen:
        seen.add(current)
        next_party, event_year = EVENTS[current]
        if year < event_year:
            break
        if next_party == destination:
            return "Fusão/incorporação"
        current = next_party
    return "Mudança entre organizações"
