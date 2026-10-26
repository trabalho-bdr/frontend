/*
Questão 3
==========
Como as características socioeconômicas dos municípios se relacionam com a
distribuição dos votos entre partidos e com a taxa de abstenção?

Referências temporais disponíveis no DER:
- participação e votos: ano eleitoral selecionado (2022 ou 2024);
- população e PIB: 2022;
- IDHM: 2010.

Convenções dos perfis:
- renda: comparação do PIB per capita com a mediana dos municípios da UF;
- porte: pequeno abaixo de 100 mil habitantes e grande a partir de 100 mil.

Os parâmetros são posicionais e aparecem como "?". O Streamlit fornece esses
valores sem interpolar texto no SQL.
*/

-- name: q3_municipios
-- Objetivo: produzir uma linha por município com todas as variáveis usadas na
-- análise de abstenção e com as classificações de renda e porte.
-- Parâmetros: 1 = ano eleitoral; 2 = sigla da UF.
WITH filtro AS (
    SELECT cast(? AS INTEGER) AS ano, cast(? AS VARCHAR) AS uf
),
-- Transforma as linhas de anos de referência diferentes em uma linha por
-- município. Não atribui IDHM 2010 ou PIB 2022 a outro ano de referência.
socioeconomico AS (
    SELECT
        id_municipio,
        max(populacao) FILTER (WHERE ano_referencia = 2022) AS populacao,
        max(pib) FILTER (WHERE ano_referencia = 2022) AS pib,
        max(idhm) FILTER (WHERE ano_referencia = 2010) AS idhm
    FROM "Censo_Municipio"
    GROUP BY id_municipio
),
base AS (
    SELECT
        m.id_municipio,
        m.cod_tse,
        m.nome AS municipio,
        m.uf,
        f.ano,
        p.eleitorado_apto AS eleitorado,
        p.comparecimento,
        p.abstencoes,
        -- Prefere a taxa armazenada. O cálculo alternativo protege contra
        -- eleitorado zero e mantém a saída expressa em percentual.
        coalesce(
            p.taxa_abstencao,
            p.abstencoes::DOUBLE / nullif(p.eleitorado_apto, 0)
        ) * 100 AS abstencao_pct,
        s.populacao,
        s.pib,
        s.pib::DOUBLE / nullif(s.populacao, 0) AS pib_per_capita,
        s.idhm
    FROM filtro f
    JOIN "Municipio" m ON m.uf = f.uf
    JOIN "Participacao_Eleitoral" p
      ON p.id_municipio = m.id_municipio
     AND p.ano_participacao = f.ano
    LEFT JOIN socioeconomico s ON s.id_municipio = m.id_municipio
),
classificada AS (
    SELECT
        *,
        -- A mediana é calculada no recorte da UF selecionada; portanto,
        -- "Mais rico" e "Mais pobre" são perfis relativos dentro da UF.
        median(pib_per_capita) OVER () AS mediana_pib_per_capita
    FROM base
)
SELECT
    *,
    CASE
        WHEN pib_per_capita IS NULL THEN NULL
        WHEN pib_per_capita >= mediana_pib_per_capita THEN 'Mais rico'
        ELSE 'Mais pobre'
    END AS perfil_renda,
    CASE
        WHEN populacao IS NULL THEN NULL
        WHEN populacao < 100000 THEN 'Pequeno (<100 mil)'
        ELSE 'Grande (>=100 mil)'
    END AS perfil_porte
FROM classificada
ORDER BY municipio;

-- name: q3_cargos
-- Objetivo: preencher o seletor somente com cargos que realmente possuem
-- votos no recorte escolhido.
-- Parâmetros: 1 = UF; 2 = ano eleitoral; 3 = turno.
SELECT DISTINCT e.cargo
FROM "Votos_Partido_Municipio" v
JOIN "Municipio" m USING (id_municipio)
JOIN "Eleicao" e USING (id_eleicao)
WHERE m.uf = ? AND e.ano = ? AND v.turno = ?
ORDER BY e.cargo;

-- name: q3_votos_por_perfil
-- Objetivo: relacionar votos partidários com os mesmos indicadores e perfis
-- municipais usados na análise de abstenção. A consulta devolve todos os
-- partidos; qualquer limitação visual é responsabilidade do painel.
-- Parâmetros: 1 = ano; 2 = UF; 3 = turno; 4 = cargo.
WITH filtro AS (
    SELECT
        cast(? AS INTEGER) AS ano,
        cast(? AS VARCHAR) AS uf,
        cast(? AS SMALLINT) AS turno,
        cast(? AS VARCHAR) AS cargo
),
socioeconomico AS (
    SELECT
        id_municipio,
        max(populacao) FILTER (WHERE ano_referencia = 2022) AS populacao,
        max(pib) FILTER (WHERE ano_referencia = 2022) AS pib,
        max(idhm) FILTER (WHERE ano_referencia = 2010) AS idhm
    FROM "Censo_Municipio"
    GROUP BY id_municipio
),
municipios AS (
    SELECT
        m.id_municipio,
        m.nome AS municipio,
        m.uf,
        f.ano,
        p.eleitorado_apto AS eleitorado,
        coalesce(
            p.taxa_abstencao,
            p.abstencoes::DOUBLE / nullif(p.eleitorado_apto, 0)
        ) * 100 AS abstencao_pct,
        s.populacao,
        s.pib::DOUBLE / nullif(s.populacao, 0) AS pib_per_capita,
        s.idhm
    FROM filtro f
    JOIN "Municipio" m ON m.uf = f.uf
    JOIN "Participacao_Eleitoral" p
      ON p.id_municipio = m.id_municipio
     AND p.ano_participacao = f.ano
    LEFT JOIN socioeconomico s ON s.id_municipio = m.id_municipio
),
perfis AS (
    SELECT
        *,
        CASE
            WHEN pib_per_capita IS NULL THEN NULL
            WHEN pib_per_capita >= median(pib_per_capita) OVER () THEN 'Mais rico'
            ELSE 'Mais pobre'
        END AS perfil_renda,
        CASE
            WHEN populacao IS NULL THEN NULL
            WHEN populacao < 100000 THEN 'Pequeno (<100 mil)'
            ELSE 'Grande (>=100 mil)'
        END AS perfil_porte
    FROM municipios
)
SELECT
    p.id_municipio,
    p.municipio,
    p.uf,
    p.ano,
    f.turno,
    f.cargo,
    pa.sigla AS partido,
    v.votos_nominais,
    v.votos_legenda,
    -- A distribuição partidária considera votos nominais e de legenda.
    v.votos_nominais + coalesce(v.votos_legenda, 0) AS votos,
    p.eleitorado,
    p.abstencao_pct,
    p.populacao,
    p.pib_per_capita,
    p.idhm,
    p.perfil_renda,
    p.perfil_porte
FROM filtro f
JOIN "Eleicao" e
  ON e.ano = f.ano
 AND e.turno = f.turno
 AND e.cargo = f.cargo
JOIN "Votos_Partido_Municipio" v
  ON v.id_eleicao = e.id_eleicao
 AND v.turno = f.turno
JOIN perfis p ON p.id_municipio = v.id_municipio
JOIN "Partido" pa ON pa.id_partido = v.id_partido
ORDER BY p.municipio, pa.sigla;
