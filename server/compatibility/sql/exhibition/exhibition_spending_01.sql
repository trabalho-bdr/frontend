SELECT MEDIAN(gastos) FILTER(WHERE eleito=1) mediana_eleitos,
     MEDIAN(gastos) FILTER(WHERE eleito=0) mediana_nao_eleitos,
     COUNT(*) FILTER(WHERE eleito=1) eleitos,COUNT(*) FILTER(WHERE eleito=0) nao_eleitos FROM valid
