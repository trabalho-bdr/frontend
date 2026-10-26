/*
Questão 10
===========
Analisar a trajetória da mesma pessoa em diferentes eleições.

Regra de identidade:
- a consulta relaciona candidaturas exclusivamente por id_candidato;
- nome civil é apenas uma informação de exibição;
- nome de urna não é consultado nem exibido;
- o id_candidato já foi produzido pela etapa de identidade da pipeline.

Escopo geográfico:
- a UF informada identifica o conjunto inicial de candidatos;
- depois disso, são retornadas todas as candidaturas desses mesmos IDs,
  inclusive quando a pessoa concorreu em outra UF.
*/

-- name: q10_trajetorias
-- Objetivo: retornar os campos necessários para reconstruir a trajetória:
-- ID da pessoa, nome civil, ano, turno, cargo, partido, município/UF, votos e
-- resultado eleitoral completo.
-- Parâmetro: 1 = UF usada para localizar o conjunto inicial de candidatos.
WITH candidatos_da_uf AS (
    SELECT DISTINCT id_candidato
    FROM "Candidatura"
    WHERE uf = ?
)
SELECT
    ca.id_candidato,
    c.nome_civil,
    e.ano,
    e.turno,
    cg.nome AS cargo,
    -- A ordem permite desenhar mudanças de nível de cargo no gráfico.
    CASE upper(trim(cg.nome))
        WHEN 'VEREADOR' THEN 1
        WHEN 'PREFEITO' THEN 2
        WHEN 'VICE-PREFEITO' THEN 2
        WHEN 'DEPUTADO ESTADUAL' THEN 3
        WHEN 'DEPUTADO DISTRITAL' THEN 3
        WHEN 'DEPUTADO FEDERAL' THEN 4
        WHEN 'SENADOR' THEN 5
        WHEN '1º SUPLENTE SENADOR' THEN 5
        WHEN '2º SUPLENTE SENADOR' THEN 5
        WHEN 'GOVERNADOR' THEN 6
        WHEN 'VICE-GOVERNADOR' THEN 6
        WHEN 'PRESIDENTE' THEN 7
        WHEN 'VICE-PRESIDENTE' THEN 7
        ELSE NULL
    END AS ordem_cargo,
    coalesce(pa.sigla, 'Sem partido') AS partido,
    -- Município pode ser nulo em candidaturas estaduais ou nacionais.
    m.nome AS municipio,
    ca.uf,
    ca.patrimonio,
    ca.gastos_campanha_total,
    r.votos,
    -- Preserva o texto oficial; não reduz a situação apenas a eleito/não eleito.
    r.resultado,
    -- O booleano adicional serve somente para métricas e símbolos do gráfico.
    regexp_matches(upper(coalesce(r.resultado, '')), '^ELEITO') AS eleito
FROM "Candidatura" ca
JOIN "Candidato" c USING (id_candidato)
JOIN "Eleicao" e USING (id_eleicao)
JOIN "Cargo" cg USING (id_candidatura)
LEFT JOIN "Partido" pa USING (id_partido)
LEFT JOIN "Municipio" m USING (id_municipio)
LEFT JOIN "Resultado_Candidatura" r USING (id_candidatura)
WHERE ca.id_candidato IN (SELECT id_candidato FROM candidatos_da_uf)
ORDER BY ca.id_candidato, e.ano, e.turno, cg.nome;
