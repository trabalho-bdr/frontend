"""Organizational events; never infer individual migration from a renamed sigla."""
RENAMES={'PMDB':'MDB','PFL':'DEM','PPB':'PP','PTN':'PODE','PT DO B':'AVANTE','PSDC':'DC','SD':'SOLIDARIEDADE','PRB':'REPUBLICANOS','PPS':'CIDADANIA','PTC':'AGIR','PMN':'MOBILIZA','PMB':'DEMOCRATA'}
EVENTS={'DEM':('UNIÃO',2022),'PSL':('UNIÃO',2022),'PTB':('PRD',2023),'PATRIOTA':('PRD',2023),'PHS':('PODE',2019),'PSC':('PODE',2023),'PROS':('SOLIDARIEDADE',2023),'PPL':('PC DO B',2019),'PRP':('PATRIOTA',2019),'PAN':('PTB',2007),'PRONA':('PL',2006),'PGT':('PL-HISTORICO',2003),'PST':('PL-HISTORICO',2003),'PL-HISTORICO':('PL',2006)}
def canonical_party(sigla,year):
    if sigla=='PL' and year<2006:return 'PL-HISTORICO'
    if sigla=='PR':return 'PL'
    if sigla=='PSD' and year<2011:return 'PSD-HISTORICO'
    return RENAMES.get(sigla,sigla)
def transition_kind(origin,destination,year):
    if origin==destination:return 'Mesma organização'
    seen=set();current=origin
    while current in EVENTS and current not in seen:
        seen.add(current);next_party,event_year=EVENTS[current]
        if year<event_year:break
        if next_party==destination:return 'Fusão/incorporação'
        current=next_party
    return 'Mudança entre organizações'
